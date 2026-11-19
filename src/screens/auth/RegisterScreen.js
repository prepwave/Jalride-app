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

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { register, googleLogin } = useAuth();
  const { isDark } = useTheme();

  const [role, setRole] = useState('customer'); // 'customer' | 'owner'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoogleSuccess = (user) => {
    // Navigation is automatic via AuthContext state change in RootNavigator
  };

  const handleRegister = async () => {
    setErrorMessage('');
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!trimmedEmail) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!trimmedPhone || trimmedPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone.startsWith('+91') ? trimmedPhone : `+91 ${trimmedPhone}`,
        password,
        role,
      };

      const result = await register(payload);
      if (result.success) {
        Alert.alert(
          'Account Created! 📨',
          result.message || 'Please enter the 6-digit OTP verification code sent to your email to activate your account.',
          [
            {
              text: 'Enter Verification Code',
              onPress: () =>
                navigation.navigate('OtpVerification', {
                  email: trimmedEmail,
                  message: result.message,
                }),
            },
          ]
        );
      } else {
        setErrorMessage(result.message || 'Registration could not be completed.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to connect to JalRide registration service.');
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
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center', marginBottom: spacing.m }}>
            <JalRideLogo size={56} />
          </View>
          <Text style={[styles.title, isDark && styles.textLight]}>
            Create JalRide Account
          </Text>
          <Text style={styles.subtitle}>
            Join Varanasi's smart ghat transit and navigation platform
          </Text>
        </View>

        {/* Role Selection Tabs */}
        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[
              styles.roleTab,
              role === 'customer' && styles.roleTabActive,
            ]}
            onPress={() => setRole('customer')}
          >
            <Text style={styles.roleTabEmoji}>🛶</Text>
            <Text
              style={[
                styles.roleTabText,
                role === 'customer' && styles.roleTabTextActive,
              ]}
            >
              Rider / Pilgrim
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleTab,
              role === 'owner' && styles.roleTabActive,
            ]}
            onPress={() => setRole('owner')}
          >
            <Text style={styles.roleTabEmoji}>⚓</Text>
            <Text
              style={[
                styles.roleTabText,
                role === 'owner' && styles.roleTabTextActive,
              ]}
            >
              Boat Owner
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Card */}
        <Card style={styles.formCard}>
          {/* Google Sign-Up */}
          <GoogleSignInButton
            title={`Sign up with Google as ${role === 'owner' ? 'Owner' : 'Rider'}`}
            role={role}
            onSuccess={handleGoogleSuccess}
            onError={(msg) => setErrorMessage(msg)}
            style={{ marginBottom: spacing.m }}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR REGISTER WITH EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          <Input
            label="Full Name"
            placeholder="e.g. Rameshwar Majhi"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (errorMessage) setErrorMessage('');
            }}
          />

          <Input
            label="Email Address"
            placeholder="navik@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errorMessage) setErrorMessage('');
            }}
          />

          <Input
            label="Mobile Number (10 Digits)"
            placeholder="98765 43210"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              if (errorMessage) setErrorMessage('');
            }}
          />

          <Input
            label="Password (min 6 chars)"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errorMessage) setErrorMessage('');
            }}
          />

          <Input
            label="Confirm Password"
            placeholder="••••••••"
            secureTextEntry
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              if (errorMessage) setErrorMessage('');
            }}
          />

          <Button
            title={`Register as ${role === 'owner' ? 'Boat Owner' : 'Rider'} ➔`}
            onPress={handleRegister}
            loading={isSubmitting}
            variant="primary"
            style={styles.submitBtn}
          />
        </Card>

        {/* Switch back to Login */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, isDark && styles.textMutedDark]}>
            Already registered on JalRide?
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: colors.canvasDark,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.l,
    paddingTop: 52,
    paddingBottom: 40,
  },
  header: {
    marginBottom: spacing.l,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.m,
    ...shadows.soft,
  },
  backArrow: {
    fontSize: 20,
    color: colors.ink,
    fontWeight: '700',
  },
  title: {
    ...typography.h2,
    color: colors.ink,
  },
  subtitle: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: 4,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: spacing.m,
    marginBottom: spacing.l,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    backgroundColor: colors.white,
    paddingVertical: 12,
    borderRadius: radii.m,
    borderWidth: 1.5,
    borderColor: colors.gray200,
  },
  roleTabActive: {
    borderColor: colors.teal,
    backgroundColor: colors.tealMist,
  },
  roleTabEmoji: {
    fontSize: 18,
  },
  roleTabText: {
    ...typography.bodyMedium,
    color: colors.gray600,
    fontWeight: '600',
  },
  roleTabTextActive: {
    color: colors.teal,
    fontWeight: '700',
  },
  formCard: {
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.m,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray200,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray500,
    paddingHorizontal: 12,
    letterSpacing: 0.8,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.s,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: spacing.m,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  footerText: {
    ...typography.bodyMedium,
    color: colors.gray600,
  },
  loginLink: {
    paddingVertical: 4,
  },
  loginLinkText: {
    ...typography.bodyMedium,
    color: colors.teal,
    fontWeight: '700',
  },
  textLight: {
    color: colors.textLight,
  },
  textMutedDark: {
    color: colors.textMutedDark,
  },
});
