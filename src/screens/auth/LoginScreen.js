import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import JalRideLogo from '../../components/common/JalRideLogo';
import GoogleSignInButton from '../../components/common/GoogleSignInButton';

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);

  const handleLogin = async () => {
    setErrorMessage('');
    setShowVerifyPrompt(false);
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(trimmedEmail, password);
      if (!result.success) {
        if (result.requiresEmailVerification || result.status === 403) {
          setShowVerifyPrompt(true);
          setErrorMessage('Your account is registered but requires email verification.');
        } else {
          setErrorMessage(result.message || 'Login failed. Please check your credentials.');
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to connect to JalRide servers. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = (user) => {
    // Navigation is automatic via AuthContext state change in RootNavigator
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && styles.containerDark]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top + spacing.m, 48),
            paddingBottom: Math.max(insets.bottom + spacing.l, 32),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Banner Header */}
        <View style={styles.brandSection}>
          <JalRideLogo size={68} style={{ marginBottom: spacing.m }} />
          <Text style={[styles.brandTitle, isDark && styles.textLight]}>
            JALRIDE
          </Text>
          <Text style={styles.brandTagline}>
            Varanasi Smart Boat Booking & Ghat Navigation
          </Text>
          <Text style={styles.greetingText}>
            Verified Boats • Transparent Fares • Direct Digital Boarding
          </Text>
        </View>

        {/* Login Form Card */}
        <Card style={styles.loginCard}>
          <Text style={[styles.cardHeaderTitle, isDark && styles.textLight]}>
            Sign In to Your Account
          </Text>
          <Text style={styles.cardHeaderSub}>
            Access your boat bookings, live tickets, and wallet balance
          </Text>

          {/* Google Sign-In Option */}
          <GoogleSignInButton
            title="Sign in with Google"
            role="customer"
            onSuccess={handleGoogleSuccess}
            style={{ marginBottom: spacing.m }}
          />

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR SIGN IN WITH EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {showVerifyPrompt ? (
            <View style={styles.verifyBox}>
              <Text style={styles.verifyBoxText}>
                Need to activate your account with an OTP code?
              </Text>
              <TouchableOpacity
                style={styles.verifyBoxBtn}
                onPress={() =>
                  navigation.navigate('OtpVerification', {
                    email: email.trim().toLowerCase(),
                  })
                }
              >
                <Text style={styles.verifyBoxBtnText}>
                  Enter Verification Code / OTP ➔
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Input
            label="Email Address"
            placeholder="yourname@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errorMessage) setErrorMessage('');
              if (showVerifyPrompt) setShowVerifyPrompt(false);
            }}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errorMessage) setErrorMessage('');
            }}
          />

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In ➔"
            onPress={handleLogin}
            loading={isSubmitting}
            variant="primary"
            style={styles.loginBtn}
          />
        </Card>

        {/* Switch to Register link */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, isDark && styles.textMutedDark]}>
            Don't have an account yet?
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.registerLink}
          >
            <Text style={styles.registerLinkText}>Register here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  scroll: {
    paddingHorizontal: spacing.l,
    flexGrow: 1,
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0a2e36',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  greetingText: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textLight: {
    color: '#f8fafc',
  },
  textMutedDark: {
    color: '#94a3b8',
  },
  loginCard: {
    padding: spacing.l,
    borderRadius: radii.l,
    backgroundColor: '#ffffff',
    ...shadows.m,
  },
  cardHeaderTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardHeaderSub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: spacing.m,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.m,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    paddingHorizontal: 12,
    letterSpacing: 0.8,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: spacing.m,
    borderRadius: radii.m,
    marginBottom: spacing.m,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
  },
  verifyBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    padding: spacing.m,
    borderRadius: radii.m,
    marginBottom: spacing.m,
  },
  verifyBoxText: {
    color: '#1e40af',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  verifyBoxBtn: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.s,
    alignSelf: 'flex-start',
  },
  verifyBoxBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -spacing.s,
    marginBottom: spacing.m,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.teal,
  },
  loginBtn: {
    marginTop: spacing.s,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.l,
    gap: spacing.xs,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
  },
  registerLink: {
    paddingVertical: 4,
  },
  registerLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.teal,
  },
});
