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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import JalRideLogo from '../../components/common/JalRideLogo';

export default function ResetPasswordScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { email: initialEmail } = route.params || {};
  const { isDark } = useTheme();

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!initialEmail || resendCooldown > 0) return;
    setResending(true);
    setErrorMessage('');
    try {
      await api.forgotPassword(initialEmail);
      Alert.alert('Code Resent 📨', 'A fresh password reset code has been sent to your email.');
      setResendCooldown(45);
    } catch (err) {
      setErrorMessage(err.message || 'Could not resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMessage('');
    const cleanToken = token.trim();

    if (!cleanToken) {
      setErrorMessage('Please enter the 6-digit reset code / OTP received via email.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.resetPassword(cleanToken, password);
      Alert.alert(
        'Password Reset Successful! 🎉',
        res.message || 'Your password has been securely updated. You can now sign in.',
        [
          {
            text: 'Sign In Now',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (err) {
      setErrorMessage(err.message || 'Password reset token is invalid or has expired.');
    } finally {
      setIsSubmitting(false);
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
          { paddingTop: Math.max(insets.top + spacing.m, 48), paddingBottom: Math.max(insets.bottom + spacing.l, 32) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Brand Banner */}
        <View style={styles.brandSection}>
          <JalRideLogo size={56} style={{ marginBottom: spacing.m }} />
          <Text style={[styles.brandTitle, isDark && styles.textLight]}>
            Create New Password
          </Text>
          <Text style={styles.brandTagline}>
            Enter the verification code and set your new credentials
          </Text>
        </View>

        {/* Reset Form Card */}
        <Card style={styles.card}>
          <Text style={[styles.cardHeaderTitle, isDark && styles.textLight]}>
            Set New Password
          </Text>
          <Text style={styles.cardHeaderSub}>
            {initialEmail ? `Resetting password for: ${initialEmail}` : 'Ensure your new password has at least 6 characters'}
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          <Input
            label="6-Digit Reset Code / OTP"
            placeholder="Enter code or token from email"
            value={token}
            onChangeText={(t) => {
              setToken(t);
              if (errorMessage) setErrorMessage('');
            }}
            autoCapitalize="none"
          />

          <Input
            label="New Password"
            placeholder="At least 6 characters"
            secureTextEntry
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errorMessage) setErrorMessage('');
            }}
          />

          <Input
            label="Confirm New Password"
            placeholder="Re-enter new password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              if (errorMessage) setErrorMessage('');
            }}
          />

          <Button
            title={isSubmitting ? 'Updating Password...' : 'Save New Password ➔'}
            onPress={handleResetPassword}
            loading={isSubmitting}
            variant="primary"
            style={styles.submitBtn}
          />

          {initialEmail ? (
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendCooldown > 0 || resending}
              style={{ marginTop: spacing.l, alignItems: 'center' }}
            >
              <Text
                style={{
                  color: resendCooldown > 0 ? colors.gray500 : colors.teal,
                  fontWeight: '600',
                  fontSize: 13,
                }}
              >
                {resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : resending
                  ? 'Sending fresh code...'
                  : "Didn't receive the code? Resend Reset Code"}
              </Text>
            </TouchableOpacity>
          ) : null}
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
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(0, 168, 150, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  logoIcon: {
    fontSize: 32,
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
  submitBtn: {
    marginTop: spacing.m,
  },
});
