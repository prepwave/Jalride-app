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
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    setErrorMessage('');
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
        setErrorMessage(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to connect to JalRide servers.');
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
        {/* Brand Banner Header */}
        <View style={styles.brandSection}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🛶</Text>
          </View>
          <Text style={[styles.brandTitle, isDark && styles.textLight]}>
            JALRIDE (जलराइड)
          </Text>
          <Text style={styles.brandTagline}>
            Varanasi Smart Boat Booking & Ghat Navigation
          </Text>
          <Text style={styles.greetingText}>
            Har Har Gange • हर हर गंगे 🙏
          </Text>
        </View>

        {/* Login Form Card */}
        <Card style={styles.loginCard}>
          <Text style={[styles.cardHeaderTitle, isDark && styles.textLight]}>
            Sign In to Your Account
          </Text>
          <Text style={styles.cardHeaderSub}>
            Book sacred Ganga boat rides or manage your fleet
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          <Input
            label="Email Address"
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
            <Text style={styles.registerLinkText}>Register Here</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.securityNote}>
          <Text style={styles.securityText}>
            🔒 Protected by 256-bit encryption & UPI security standards.
          </Text>
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
    paddingTop: 64,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: radii.l,
    backgroundColor: colors.tealMist,
    borderWidth: 2,
    borderColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.m,
    ...shadows.soft,
  },
  logoIcon: {
    fontSize: 34,
  },
  brandTitle: {
    ...typography.h1,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  brandTagline: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: 4,
    textAlign: 'center',
  },
  greetingText: {
    ...typography.bodySmall,
    color: colors.sun,
    fontWeight: '700',
    marginTop: 6,
  },
  loginCard: {
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  cardHeaderTitle: {
    ...typography.h3,
    color: colors.ink,
  },
  cardHeaderSub: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 4,
    marginBottom: spacing.l,
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
  loginBtn: {
    marginTop: spacing.m,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.l,
  },
  footerText: {
    ...typography.bodyMedium,
    color: colors.gray600,
  },
  registerLink: {
    paddingVertical: 4,
  },
  registerLinkText: {
    ...typography.bodyMedium,
    color: colors.teal,
    fontWeight: '700',
  },
  securityNote: {
    alignItems: 'center',
  },
  securityText: {
    ...typography.caption,
    color: colors.gray500,
    textAlign: 'center',
    fontSize: 11,
  },
  textLight: {
    color: colors.textLight,
  },
  textMutedDark: {
    color: colors.textMutedDark,
  },
});
