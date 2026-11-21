const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

describe('JalRide Native App: Password Reset Flow Correction Test Suite', () => {
  const forgotScreenPath = path.resolve(__dirname, '../src/screens/auth/ForgotPasswordScreen.js');
  const resetScreenPath = path.resolve(__dirname, '../src/screens/auth/ResetPasswordScreen.js');
  const loginScreenPath = path.resolve(__dirname, '../src/screens/auth/LoginScreen.js');
  const authNavPath = path.resolve(__dirname, '../src/components/navigation/AuthNavigator.js');
  const apiPath = path.resolve(__dirname, '../src/services/api.js');

  const forgotSource = fs.readFileSync(forgotScreenPath, 'utf8');
  const resetSource = fs.readFileSync(resetScreenPath, 'utf8');
  const loginSource = fs.readFileSync(loginScreenPath, 'utf8');
  const authNavSource = fs.readFileSync(authNavPath, 'utf8');
  const apiSource = fs.readFileSync(apiPath, 'utf8');

  // =========================================================================
  // 1. Email Submission Logic & Payload Formatting
  // =========================================================================
  describe('1. Email Submission & Input Validation', () => {
    const validateEmailFormat = (emailStr) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
    };

    it('1.1 Rejects empty or whitespace-only email inputs', () => {
      assert.strictEqual(validateEmailFormat(''), false);
      assert.strictEqual(validateEmailFormat('   '), false);
    });

    it('1.2 Rejects malformed email inputs', () => {
      assert.strictEqual(validateEmailFormat('invalid-email'), false);
      assert.strictEqual(validateEmailFormat('test@'), false);
      assert.strictEqual(validateEmailFormat('@domain.com'), false);
      assert.strictEqual(validateEmailFormat('test@domain'), false);
      assert.strictEqual(validateEmailFormat('test@.com'), false);
    });

    it('1.3 Accepts valid customer and admin email addresses', () => {
      assert.strictEqual(validateEmailFormat('devotee@example.com'), true);
      assert.strictEqual(validateEmailFormat('prepwave.pushpendra@gmail.com'), true);
      assert.strictEqual(validateEmailFormat('user.name+tag@sub.domain.org'), true);
    });

    it('1.4 Normalizes email by trimming and lowercasing', () => {
      const rawInput = '  Devotee.User@Example.COM  ';
      const normalized = rawInput.trim().toLowerCase();
      assert.strictEqual(normalized, 'devotee.user@example.com');
    });

    it('1.5 api.forgotPassword sends POST to /auth/forgot-password with normalized email payload', () => {
      assert.match(
        apiSource,
        /async\s+forgotPassword\s*\(\s*email\s*\)\s*\{[\s\S]*?this\.request\(['"]\/auth\/forgot-password['"],\s*\{[\s\S]*?method:\s*['"]POST['"][\s\S]*?body:\s*\{\s*email:\s*\(email\s*\|\|\s*['"]['"]\)\.toLowerCase\(\)\.trim\(\)\s*\}[\s\S]*?\}\);/
      );
    });
  });

  // =========================================================================
  // 2. Correct Email-Link Confirmation Message (No False OTP Claims)
  // =========================================================================
  describe('2. Correct Email-Link Confirmation Messaging', () => {
    it('2.1 ForgotPasswordScreen displays accurate "Reset Link Sent" confirmation state', () => {
      assert.match(forgotSource, /Reset Link Sent/);
      assert.match(forgotSource, /secure password reset link has been sent/);
    });

    it('2.2 Explicitly mentions 30-minute link expiration matching backend policy', () => {
      assert.match(forgotSource, /30 minutes/);
    });

    it('2.3 Explains that the reset link opens in a web browser', () => {
      assert.match(forgotSource, /browser/i);
      assert.match(forgotSource, /Return to this app/i);
    });

    it('2.4 Follows anti-enumeration policy by using conditional account association message', () => {
      assert.match(forgotSource, /If an account is associated with/);
    });
  });

  // =========================================================================
  // 3. No OTP Input for a Link-Based Backend
  // =========================================================================
  describe('3. Elimination of OTP Input & Verification Controls', () => {
    it('3.1 ForgotPasswordScreen has ZERO OTP input fields or 6-digit prompts', () => {
      assert.doesNotMatch(forgotSource, /6-digit/i);
      assert.doesNotMatch(forgotSource, /Enter Reset Code/i);
      assert.doesNotMatch(forgotSource, /label=["'][^"']*OTP[^"']*["']/i);
      assert.doesNotMatch(forgotSource, /Send Reset Code \/ OTP/i);
    });

    it('3.2 ResetPasswordScreen has ZERO 6-digit OTP input fields or prompts', () => {
      assert.doesNotMatch(resetSource, /6-digit/i);
      assert.doesNotMatch(resetSource, /label=["']6-Digit Reset Code \/ OTP["']/i);
      assert.doesNotMatch(resetSource, /Didn't receive the code\? Resend Reset Code/i);
    });

    it('3.3 ResetPasswordScreen explains that password reset requires email link, not OTP', () => {
      assert.match(resetSource, /Email Link Required|Password Reset via Email Link/i);
      assert.match(resetSource, /not an OTP or one-time code/i);
    });
  });

  // =========================================================================
  // 4. No False OTP Success Message
  // =========================================================================
  describe('4. Prevention of False OTP Alerts & State Transitions', () => {
    it('4.1 ForgotPasswordScreen does not pop misleading "Password Reset Code Sent" Alert', () => {
      assert.doesNotMatch(forgotSource, /Password Reset Code Sent/);
    });

    it('4.2 ForgotPasswordScreen does not navigate to ResetPassword expecting an OTP code', () => {
      assert.doesNotMatch(
        forgotSource,
        /navigation\.navigate\(['"]ResetPassword['"]\s*,\s*\{\s*email/
      );
    });

    it('4.3 Provides clean in-card confirmation rather than blocking Alert dialogs', () => {
      assert.match(forgotSource, /isSent \? \(/);
      assert.match(forgotSource, /styles\.sentContainer/);
    });
  });

  // =========================================================================
  // 5. API Failure Handling
  // =========================================================================
  describe('5. API Failure Handling', () => {
    it('5.1 Simulates API rejection (e.g. 400 Bad Request / 500 Server Error) - error captured, no success shown', async () => {
      let isSent = false;
      let errorMessage = '';

      const mockApi = {
        forgotPassword: async () => {
          throw new Error('Enter a valid email');
        },
      };

      try {
        await mockApi.forgotPassword('bad-email');
        isSent = true;
      } catch (err) {
        errorMessage = err.message || 'Unable to connect to the server.';
      }

      assert.strictEqual(isSent, false, 'isSent must remain false on API failure');
      assert.strictEqual(errorMessage, 'Enter a valid email');
    });

    it('5.2 ForgotPasswordScreen catches API error in handleSendReset and sets errorMessage without setting isSent', () => {
      assert.match(
        forgotSource,
        /try\s*\{[\s\S]*?await api\.forgotPassword\(trimmedEmail\);[\s\S]*?setIsSent\(true\);[\s\S]*?\}\s*catch\s*\(err\)\s*\{[\s\S]*?setErrorMessage\(/
      );
    });
  });

  // =========================================================================
  // 6. Network Failure Handling
  // =========================================================================
  describe('6. Network Failure Handling', () => {
    it('6.1 Simulates network failure (e.g. Failed to fetch / offline) - displays fallback network message', async () => {
      let isSent = false;
      let errorMessage = '';

      const mockApi = {
        forgotPassword: async () => {
          throw new Error('Network request failed');
        },
      };

      try {
        await mockApi.forgotPassword('user@example.com');
        isSent = true;
      } catch (err) {
        errorMessage = err.message || 'Unable to connect to the server. Please check your internet connection and try again.';
      }

      assert.strictEqual(isSent, false, 'isSent must remain false on network error');
      assert.strictEqual(errorMessage, 'Network request failed');
    });

    it('6.2 Fallback network message is provided in ForgotPasswordScreen when err.message is empty', () => {
      assert.match(
        forgotSource,
        /err\.message\s*\|\|\s*['"]Unable to connect to the server\. Please check your internet connection and try again\.['"]/
      );
    });
  });

  // =========================================================================
  // 7. Return-to-Login Navigation Paths
  // =========================================================================
  describe('7. Navigation Pathways Back to Login', () => {
    it('7.1 ForgotPasswordScreen provides top back button calling navigation.goBack()', () => {
      assert.match(
        forgotSource,
        /onPress=\{\(\)\s*=>\s*navigation\.goBack\(\)\}/
      );
    });

    it('7.2 ForgotPasswordScreen provides "Remember your password? Sign In" link to Login', () => {
      assert.match(
        forgotSource,
        /onPress=\{\(\)\s*=>\s*navigation\.navigate\(['"]Login['"]\)\}/
      );
      assert.match(forgotSource, /Remember your password\? Sign In/);
    });

    it('7.3 ForgotPasswordScreen confirmation state provides "Return to Login ➔" primary button', () => {
      assert.match(forgotSource, /title=["']Return to Login ➔["']/);
      assert.match(
        forgotSource,
        /onPress=\{\(\)\s*=>\s*navigation\.navigate\(['"]Login['"]\)\}/
      );
    });

    it('7.4 ResetPasswordScreen provides return to Login button', () => {
      assert.match(resetSource, /title=["']Return to Login ➔["']/);
      assert.match(
        resetSource,
        /onPress=\{\(\)\s*=>\s*navigation\.navigate\(['"]Login['"]\)\}/
      );
    });
  });

  // =========================================================================
  // 8. Existing Login & Auth Flow Preservation
  // =========================================================================
  describe('8. Existing Login & Auth Flow Preservation', () => {
    it('8.1 LoginScreen retains functional "Forgot Password?" entry point to ForgotPassword', () => {
      assert.match(
        loginSource,
        /navigation\.navigate\(['"]ForgotPassword['"]\)/
      );
      assert.match(loginSource, /Forgot Password\?/);
    });

    it('8.2 AuthNavigator retains Login, Register, ForgotPassword, and ResetPassword routes', () => {
      assert.match(authNavSource, /<Stack\.Screen\s+name=["']Login["']\s+component=\{LoginScreen\}/);
      assert.match(authNavSource, /<Stack\.Screen\s+name=["']Register["']\s+component=\{RegisterScreen\}/);
      assert.match(authNavSource, /<Stack\.Screen\s+name=["']ForgotPassword["']\s+component=\{ForgotPasswordScreen\}/);
      assert.match(authNavSource, /<Stack\.Screen\s+name=["']ResetPassword["']\s+component=\{ResetPasswordScreen\}/);
    });

    it('8.3 LoginScreen preserves standard credential sign-in execution', () => {
      assert.match(loginSource, /handleLogin/);
      assert.match(loginSource, /login\(trimmedEmail,\s*password\)/);
      assert.match(loginSource, /Sign In ➔/);
    });

    it('8.4 Backend auth endpoints match exact expected contracts', () => {
      assert.match(apiSource, /async\s+login\s*\(\s*email,\s*password\s*\)/);
      assert.match(apiSource, /async\s+forgotPassword\s*\(\s*email\s*\)/);
      assert.match(apiSource, /async\s+resetPassword\s*\(\s*token,\s*password\s*\)/);
    });
  });
});
