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

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSendReset = async () => {
    setErrorMessage('');
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.forgotPassword(trimmedEmail);
      setIsSent(true);
      Alert.alert(
        'Password Reset Code Sent 📨',
        res.message || 'A password reset code has been sent to your email. Please enter it to choose a new password.',
        [
          {
            text: 'Enter Reset Code',
            onPress: () => navigation.navigate('ResetPassword', { email: trimmedEmail }),
          },
        ]
      );
    } catch (err) {
      setErrorMessage(err.message || 'Unable to process password reset request.');
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
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>

        {/* Brand Banner */}
        <View style={styles.brandSection}>
          <JalRideLogo size={56} style={{ marginBottom: spacing.m }} />
          <Text style={[styles.brandTitle, isDark && styles.textLight]}>
            Reset Your Password
          </Text>
          <Text style={styles.brandTagline}>
            Enter your email to receive recovery instructions
          </Text>
        </View>

        {/* Reset Request Card */}
        <Card style={styles.card}>
          <Text style={[styles.cardHeaderTitle, isDark && styles.textLight]}>
            Account Recovery
          </Text>
          <Text style={styles.cardHeaderSub}>
            We'll send a secure 6-digit password reset code to your registered email.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {isSent ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                ✓ Password reset code sent! Check your inbox and spam folder.
              </Text>
            </View>
          ) : null}

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

          <Button
            title={isSubmitting ? 'Sending Code...' : 'Send Reset Code / OTP ➔'}
            onPress={handleSendReset}
            loading={isSubmitting}
            variant="primary"
            style={styles.submitBtn}
          />

          <TouchableOpacity
            style={styles.hasTokenLink}
            onPress={() => navigation.navigate('ResetPassword', { email: email.trim() })}
          >
            <Text style={styles.hasTokenText}>Already have a reset code? Enter it here ➔</Text>
          </TouchableOpacity>
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
  successBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  successText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: spacing.m,
  },
  hasTokenLink: {
    marginTop: spacing.l,
    alignItems: 'center',
  },
  hasTokenText: {
    color: colors.teal,
    fontWeight: '600',
    fontSize: 13,
  },
});
