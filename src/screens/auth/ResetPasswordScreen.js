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
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import JalRideLogo from '../../components/common/JalRideLogo';

export default function ResetPasswordScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  // If a reset token is passed directly via navigation / deep link
  const token = route?.params?.token || '';
  const initialEmail = route?.params?.email || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleResetPassword = async () => {
    setErrorMessage('');
    const cleanToken = (token || '').trim();

    if (!cleanToken) {
      setErrorMessage('Reset token is missing. Please use the reset link sent to your email.');
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
      setErrorMessage(err.message || 'Password reset link is invalid or has expired.');
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
            {token ? 'Set New Password' : 'Password Reset Info'}
          </Text>
          <Text style={styles.brandTagline}>
            {token
              ? 'Choose a new, secure password for your JalRide account'
              : 'Password reset is managed securely through your email'}
          </Text>
        </View>

        {/* Main Card */}
        <Card style={styles.card}>
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {token ? (
            /* Direct Token Reset View (Deep Link / Token Support) */
            <View>
              <Text style={[styles.cardHeaderTitle, isDark && styles.textLight]}>
                Create New Password
              </Text>
              <Text style={styles.cardHeaderSub}>
                {initialEmail
                  ? `Updating password for: ${initialEmail}`
                  : 'Ensure your password is at least 6 characters long'}
              </Text>

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
            </View>
          ) : (
            /* Informational View: No Token / Link-Based Guidance */
            <View style={styles.infoContainer}>
              <View style={styles.iconBadge}>
                <Text style={styles.iconBadgeText}>✉️</Text>
              </View>

              <Text style={[styles.cardHeaderTitle, styles.centerText, isDark && styles.textLight]}>
                Email Link Required
              </Text>

              <Text style={[styles.cardHeaderSub, styles.centerText]}>
                JalRide sends a secure reset link to your email address, not an OTP or one-time code.
              </Text>

              <View style={[styles.instructionsBox, isDark && styles.instructionsBoxDark]}>
                <Text style={[styles.instructionStepTitle, isDark && styles.textLight]}>
                  How password reset works:
                </Text>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNumber}>1.</Text>
                  <Text style={[styles.stepText, isDark && styles.stepTextDark]}>
                    Request a reset link using your account email.
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNumber}>2.</Text>
                  <Text style={[styles.stepText, isDark && styles.stepTextDark]}>
                    Open the email from JalRide and click the <Text style={styles.boldText}>Reset Password</Text> link.
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNumber}>3.</Text>
                  <Text style={[styles.stepText, isDark && styles.stepTextDark]}>
                    Set your new password on the secure website that opens in your browser.
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNumber}>4.</Text>
                  <Text style={[styles.stepText, isDark && styles.stepTextDark]}>
                    Return to this app and sign in with your new password.
                  </Text>
                </View>
              </View>

              <Button
                title="Return to Login ➔"
                onPress={() => navigation.navigate('Login')}
                variant="primary"
                style={styles.actionBtn}
              />

              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.reqLink}
              >
                <Text style={styles.reqLinkText}>Request a New Reset Link ➔</Text>
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
  submitBtn: {
    marginTop: spacing.m,
  },
  infoContainer: {
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
  actionBtn: {
    width: '100%',
    marginTop: spacing.s,
  },
  reqLink: {
    marginTop: spacing.l,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  reqLinkText: {
    color: colors.teal,
    fontWeight: '600',
    fontSize: 13,
  },
});
