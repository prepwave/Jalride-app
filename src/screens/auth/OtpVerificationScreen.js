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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import JalRideLogo from '../../components/common/JalRideLogo';

export default function OtpVerificationScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { verifyEmailOtp, resendVerificationOtp } = useAuth();
  const { isDark } = useTheme();

  const { email: initialEmail = '', message: initialMessage = '' } = route.params || {};

  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState(initialMessage || '');
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    setErrorMessage('');
    const cleanOtp = otpCode.trim();

    if (!cleanOtp) {
      setErrorMessage('Please enter the verification code or token.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyEmailOtp(cleanOtp);
      if (res && res.success) {
        Alert.alert(
          'Email Verified Successfully! 🎉',
          res.message || 'Your JalRide account is now active and ready for boat booking.',
          [{ text: 'Continue to App' }]
        );
      } else {
        setErrorMessage(res.message || 'Invalid or expired verification code.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to verify code. Please check and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    if (!email) {
      setErrorMessage('Email address is required to resend verification code.');
      return;
    }

    setIsResending(true);
    setErrorMessage('');
    try {
      const res = await resendVerificationOtp(email.trim());
      setSuccessNotice(res.message || 'A fresh verification code has been dispatched to your email.');
      setResendCooldown(45);
    } catch (err) {
      setErrorMessage(err.message || 'Could not resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
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
          onPress={() => navigation.navigate('Login')}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>

        {/* Brand Banner */}
        <View style={styles.brandSection}>
          <JalRideLogo size={56} style={{ marginBottom: spacing.m }} />
          <Text style={[styles.brandTitle, isDark && styles.textLight]}>
            Verify Your Account
          </Text>
          <Text style={styles.brandTagline}>
            Enter the 6-digit OTP code sent to your registered email
          </Text>
        </View>

        {/* OTP Entry Card */}
        <Card style={styles.card}>
          <Text style={[styles.cardHeaderTitle, isDark && styles.textLight]}>
            Email Verification
          </Text>
          <Text style={styles.cardHeaderSub}>
            Sent to: <Text style={styles.emailHighlight}>{email || 'your email'}</Text>
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {successNotice ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✓ {successNotice}</Text>
            </View>
          ) : null}

          <Input
            label="Verification Code / OTP Token"
            placeholder="Enter 6-digit code or paste token"
            value={otpCode}
            onChangeText={(t) => {
              setOtpCode(t);
              if (errorMessage) setErrorMessage('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
          />

          <Button
            title="Verify & Activate Account ➔"
            onPress={handleVerify}
            loading={isSubmitting}
            variant="primary"
            style={styles.verifyBtn}
          />

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive the code?</Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendCooldown > 0 || isResending}
              style={styles.resendBtn}
            >
              {isResending ? (
                <ActivityIndicator size="small" color={colors.teal} />
              ) : (
                <Text
                  style={[
                    styles.resendText,
                    resendCooldown > 0 && styles.resendDisabled,
                  ]}
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Verification Code'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Card>

        {/* Footer info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Check both your Inbox and Spam/Junk folder. You can also paste the full token from the email.
          </Text>
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
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.m,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.teal,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0a2e36',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  textLight: {
    color: '#f8fafc',
  },
  card: {
    padding: spacing.l,
    borderRadius: radii.l,
    backgroundColor: '#ffffff',
    ...shadows.m,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardHeaderSub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: spacing.m,
  },
  emailHighlight: {
    fontWeight: '700',
    color: colors.teal,
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
  successBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
    padding: spacing.m,
    borderRadius: radii.m,
    marginBottom: spacing.m,
  },
  successText: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '600',
  },
  verifyBtn: {
    marginTop: spacing.m,
  },
  resendRow: {
    marginTop: spacing.l,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  resendLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  resendBtn: {
    paddingVertical: 4,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.teal,
  },
  resendDisabled: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  infoBox: {
    marginTop: spacing.l,
    padding: spacing.m,
    borderRadius: radii.m,
    backgroundColor: 'rgba(20, 107, 121, 0.08)',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 18,
  },
});
