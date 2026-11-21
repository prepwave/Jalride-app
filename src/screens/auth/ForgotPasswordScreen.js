import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import JalRideLogo from '../../components/common/JalRideLogo';

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const validateEmailFormat = (emailStr) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleSendReset = async () => {
    setErrorMessage('');
    const trimmedEmail = (email || '').trim().toLowerCase();

    if (!trimmedEmail) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    if (!validateEmailFormat(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address (e.g. devotee@example.com).');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.forgotPassword(trimmedEmail);
      setSentEmail(trimmedEmail);
      setIsSent(true);
      setResendCooldown(45);
    } catch (err) {
      setErrorMessage(
        err.message || 'Unable to connect to the server. Please check your internet connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!sentEmail || resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage('');
    try {
      await api.forgotPassword(sentEmail);
      setResendCooldown(45);
    } catch (err) {
      setErrorMessage(err.message || 'Could not resend reset link. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleTryDifferentEmail = () => {
    setIsSent(false);
    setErrorMessage('');
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to Login"
        >
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>

        {/* Brand Banner */}
        <View style={styles.brandSection}>
          <JalRideLogo size={56} style={{ marginBottom: spacing.m }} />
          <Text style={[styles.brandTitle, isDark && styles.textLight]}>
            {isSent ? 'Check Your Email' : 'Reset Your Password'}
          </Text>
          <Text style={styles.brandTagline}>
            {isSent
              ? 'Password recovery instructions have been sent'
              : 'Enter your registered email to receive a password reset link'}
          </Text>
        </View>

        {/* Main Card */}
        <Card style={styles.card}>
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {isSent ? (
            /* Confirmation View: Link Sent via Email */
            <View style={styles.sentContainer}>
              <View style={styles.iconBadge}>
                <Text style={styles.iconBadgeText}>📨</Text>
              </View>

              <Text style={[styles.cardHeaderTitle, styles.centerText, isDark && styles.textLight]}>
                Reset Link Sent
              </Text>

              <Text style={[styles.cardHeaderSub, styles.centerText]}>
                If an account is associated with <Text style={styles.highlightText}>{sentEmail}</Text>, a secure password reset link has been sent.
              </Text>

              <View style={[styles.instructionsBox, isDark && styles.instructionsBoxDark]}>
                <Text style={[styles.instructionStepTitle, isDark && styles.textLight]}>
                  How to reset your password:
                </Text>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNumber}>1.</Text>
                  <Text style={[styles.stepText, isDark && styles.stepTextDark]}>
                    Open your email inbox (and check spam or junk).
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNumber}>2.</Text>
                  <Text style={[styles.stepText, isDark && styles.stepTextDark]}>
                    Click the <Text style={styles.boldText}>Reset Password</Text> button in the email.
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNumber}>3.</Text>
                  <Text style={[styles.stepText, isDark && styles.stepTextDark]}>
                    Set your new password in the browser window that opens.
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNumber}>4.</Text>
                  <Text style={[styles.stepText, isDark && styles.stepTextDark]}>
                    Return to this app and sign in with your new password.
                  </Text>
                </View>
              </View>

              <View style={styles.expiryNote}>
                <Text style={styles.expiryText}>⏱️ For security, the reset link expires in 30 minutes.</Text>
              </View>

              <Button
                title="Return to Login ➔"
                onPress={() => navigation.navigate('Login')}
                variant="primary"
                style={styles.actionBtn}
              />

              <TouchableOpacity
                onPress={handleResend}
                disabled={resendCooldown > 0 || isResending}
                style={styles.resendLink}
              >
                <Text
                  style={[
                    styles.resendText,
                    (resendCooldown > 0 || isResending) && styles.disabledText,
                  ]}
                >
                  {resendCooldown > 0
                    ? `Resend email in ${resendCooldown}s`
                    : isResending
                    ? 'Sending fresh link...'
                    : "Didn't receive the email? Resend Reset Link"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTryDifferentEmail}
                style={styles.diffEmailLink}
              >
                <Text style={styles.diffEmailText}>Use a different email address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Request Form View */
            <View>
              <Text style={[styles.cardHeaderTitle, isDark && styles.textLight]}>
                Account Recovery
              </Text>
              <Text style={styles.cardHeaderSub}>
                Enter your account email below. We'll send you a password reset link (valid for 30 minutes).
              </Text>

              <Input
                label="Registered Email Address"
                placeholder="devotee@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errorMessage) setErrorMessage('');
                }}
              />

              <View style={[styles.infoBanner, isDark && styles.infoBannerDark]}>
                <Text style={styles.infoBannerIcon}>ℹ️</Text>
                <Text style={[styles.infoBannerText, isDark && styles.infoBannerTextDark]}>
                  JalRide sends a secure one-time link to your email. You will open the link in your web browser to choose your new password.
                </Text>
              </View>

              <Button
                title={isSubmitting ? 'Sending Reset Link...' : 'Send Reset Link ➔'}
                onPress={handleSendReset}
                loading={isSubmitting}
                variant="primary"
                style={styles.submitBtn}
              />

              <TouchableOpacity
                style={styles.backToLoginLink}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.backToLoginText}>Remember your password? Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  containerDark: {
    backgroundColor: '#0a1e23',
  },
  textLight: {
    color: '#eaf6f6',
  },
  scroll: {
    paddingHorizontal: spacing.l,
    paddingTop: 52,
    paddingBottom: spacing.xxl,
  },
  backBtn: {
    paddingVertical: spacing.s,
    marginBottom: spacing.m,
  },
  backText: {
    color: colors.teal,
    fontWeight: '700',
    fontSize: 14,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brandTitle: {
    ...typography.h2,
    color: colors.ink,
    textAlign: 'center',
  },
  brandTagline: {
    ...typography.bodySmall,
    color: colors.gray600,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  card: {
    padding: spacing.xl,
    ...shadows.lift,
  },
  cardHeaderTitle: {
    ...typography.h3,
    color: colors.ink,
  },
  cardHeaderSub: {
    ...typography.bodySmall,
    color: colors.gray500,
    marginTop: spacing.xs,
    marginBottom: spacing.l,
  },
  centerText: {
    textAlign: 'center',
  },
  highlightText: {
    color: colors.teal,
    fontWeight: '700',
  },
  boldText: {
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '500',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  infoBannerDark: {
    backgroundColor: '#042f2e',
    borderColor: '#0d9488',
  },
  infoBannerIcon: {
    fontSize: 16,
    marginRight: spacing.s,
    marginTop: 1,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#0f766e',
    fontWeight: '500',
  },
  infoBannerTextDark: {
    color: '#5eead4',
  },
  submitBtn: {
    marginTop: spacing.s,
  },
  backToLoginLink: {
    marginTop: spacing.l,
    alignItems: 'center',
  },
  backToLoginText: {
    color: colors.teal,
    fontWeight: '600',
    fontSize: 13,
  },
  sentContainer: {
    alignItems: 'center',
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(0, 168, 150, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  iconBadgeText: {
    fontSize: 32,
  },
  instructionsBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: spacing.m,
    marginVertical: spacing.m,
  },
  instructionsBoxDark: {
    backgroundColor: '#0f2930',
    borderColor: '#1e3a42',
  },
  instructionStepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.s,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  stepNumber: {
    width: 20,
    fontSize: 12,
    fontWeight: '700',
    color: colors.teal,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.gray600,
  },
  stepTextDark: {
    color: '#94a3b8',
  },
  expiryNote: {
    marginBottom: spacing.m,
  },
  expiryText: {
    fontSize: 12,
    color: colors.gray500,
    fontStyle: 'italic',
  },
  actionBtn: {
    width: '100%',
    marginTop: spacing.s,
  },
  resendLink: {
    marginTop: spacing.l,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  resendText: {
    color: colors.teal,
    fontWeight: '600',
    fontSize: 13,
  },
  disabledText: {
    color: colors.gray500,
  },
  diffEmailLink: {
    marginTop: spacing.s,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  diffEmailText: {
    color: colors.gray500,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
