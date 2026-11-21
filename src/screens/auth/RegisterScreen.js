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
  Modal,
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

  // DPDP Act 2023 & DPDP Rules 2025: Granular, Unbundled Checkboxes (Unchecked by default)
  const [isAdult, setIsAdult] = useState(false); // Mandatory
  const [privacyConsent, setPrivacyConsent] = useState(false); // Mandatory
  const [promotionalMarketing, setPromotionalMarketing] = useState(false); // Optional

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [modalType, setModalType] = useState(null); // 'privacy' | 'terms' | null

  const handleGoogleSuccess = (user) => {
    // Navigation is automatic via AuthContext state change in RootNavigator
  };

  const handleRegister = async () => {
    setErrorMessage('');
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    // Backend route validation: body("phone").optional().matches(/^[6-9]\d{9}$/)
    let cleanPhone = trimmedPhone.replace(/\D/g, '');
    if (cleanPhone.length > 10 && cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.slice(-10);
    }
    if (trimmedPhone && (!/^[6-9]\d{9}$/.test(cleanPhone) || cleanPhone.length !== 10)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
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

    // Mandatory DPDP Checkbox 1: Age Affirmation
    if (!isAdult) {
      setErrorMessage('You must confirm you are 18 years of age or older, or traveling under legal guardian supervision.');
      return;
    }

    // Mandatory DPDP Checkbox 2: Privacy Notice & Terms Consent
    if (!privacyConsent) {
      setErrorMessage('You must agree to the JalRide Privacy Notice and Terms of Service to register.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        password,
        role: role === 'owner' ? 'owner' : 'customer',
        privacyConsent: true,
        isAdult: true,
        promotionalMarketing: Boolean(promotionalMarketing),
      };

      if (cleanPhone) {
        payload.phone = cleanPhone;
      }

      const result = await register(payload);
      if (result && result.success) {
        Alert.alert(
          'Account Created! 📨',
          result.message ||
            'A verification link has been sent to your email address (valid for 24 hours). Please click the link in your email to verify your account before logging in.',
          [
            {
              text: 'Go to Login',
              onPress: () => navigation.navigate('Login'),
            },
            {
              text: 'Enter Verification Token',
              onPress: () =>
                navigation.navigate('OtpVerification', {
                  email: trimmedEmail,
                  message: result.message,
                }),
            },
          ]
        );
      } else {
        setErrorMessage(result?.message || 'Registration could not be completed.');
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
            disabled={isSubmitting}
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
            onPress={() => !isSubmitting && setRole('customer')}
            disabled={isSubmitting}
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
            onPress={() => !isSubmitting && setRole('owner')}
            disabled={isSubmitting}
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
            placeholder="9876543210"
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

          {role === 'owner' ? (
            <View style={styles.ownerNoticeBox}>
              <Text style={styles.ownerNoticeText}>
                ⚓ Boat-owner accounts can register immediately. New vessel listings require administrative fitness clearance before becoming bookable on Varanasi ghats.
              </Text>
            </View>
          ) : null}

          {/* DPDP Act 2023 & DPDP Rules 2025: Unbundled Affirmative Consents */}
          <View style={styles.consentGroup}>
            {/* Mandatory Checkbox 1: Age Affirmation */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => {
                setIsAdult(!isAdult);
                if (errorMessage) setErrorMessage('');
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.checkboxBox, isAdult && styles.checkboxBoxActive]}>
                {isAdult && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={[styles.checkboxText, isDark && styles.textMutedDark]}>
                I confirm I am 18 years of age or older, or traveling under legal guardian supervision. <Text style={styles.requiredStar}>*</Text>
              </Text>
            </TouchableOpacity>

            {/* Mandatory Checkbox 2: Privacy Consent & Terms */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => {
                setPrivacyConsent(!privacyConsent);
                if (errorMessage) setErrorMessage('');
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.checkboxBox, privacyConsent && styles.checkboxBoxActive]}>
                {privacyConsent && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={[styles.checkboxText, isDark && styles.textMutedDark]}>
                I have read and agree to the{' '}
                <Text
                  style={styles.linkText}
                  onPress={() => setModalType('privacy')}
                >
                  JalRide Privacy Notice
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.linkText}
                  onPress={() => setModalType('terms')}
                >
                  Terms of Service
                </Text>
                . <Text style={styles.requiredStar}>*</Text>
              </Text>
            </TouchableOpacity>

            {/* Optional Checkbox 3: Promotional Consent */}
            <TouchableOpacity
              style={[styles.checkboxRow, styles.optionalCheckboxRow]}
              onPress={() => setPromotionalMarketing(!promotionalMarketing)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkboxBox, promotionalMarketing && styles.checkboxBoxActive]}>
                {promotionalMarketing && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={[styles.checkboxText, isDark && styles.textMutedDark]}>
                <Text style={{ fontWeight: '700' }}>(Optional)</Text> I agree to receive promotional updates and special offers via WhatsApp/SMS.
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            title={`Register as ${role === 'owner' ? 'Boat Owner' : 'Rider'} ➔`}
            onPress={handleRegister}
            loading={isSubmitting}
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          >
            <Text style={styles.loginLinkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Notice & Terms Native Modal */}
      <Modal
        visible={modalType !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalType(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.textLight]}>
                {modalType === 'privacy' ? '🛡️ JalRide Privacy Notice' : '📜 Terms of Service'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalType(null)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {modalType === 'privacy' ? (
                <View style={styles.modalBody}>
                  <Text style={[styles.modalHeading, isDark && styles.textLight]}>
                    1. Data Fiduciary & Legal Framework
                  </Text>
                  <Text style={styles.modalParagraph}>
                    JalRide operates as a compliant Data Fiduciary under India's Digital Personal Data Protection Act, 2023 (DPDP Act) and DPDP Rules, 2025.
                  </Text>

                  <Text style={[styles.modalHeading, isDark && styles.textLight]}>
                    2. Categories of Personal Data Collected
                  </Text>
                  <Text style={styles.modalParagraph}>
                    • Full name and telephone number for passenger manifests and Ghat boarding coordination.
                    • Email address for e-ticket delivery, digital boarding passes, and GST tax invoice receipts.
                    • Tokenized payment references (raw card details or UPI PINs are never handled by JalRide).
                  </Text>

                  <Text style={[styles.modalHeading, isDark && styles.textLight]}>
                    3. Purposes of Processing & Lawful Basis
                  </Text>
                  <Text style={styles.modalParagraph}>
                    Processing relies on your affirmative consent and contract fulfillment for safe waterway transit, boarding QR passes, and river emergency response under Inland Vessels regulations.
                  </Text>

                  <Text style={[styles.modalHeading, isDark && styles.textLight]}>
                    4. Statutory 7-Year Tax Retention
                  </Text>
                  <Text style={styles.modalParagraph}>
                    Financial booking ledgers and GST tax invoices are retained for a mandatory 7 years under Indian tax accounting laws (Section 12(3) DPDP Act exception).
                  </Text>

                  <Text style={[styles.modalHeading, isDark && styles.textLight]}>
                    5. Grievance Officer & Contact
                  </Text>
                  <Text style={styles.modalParagraph}>
                    For privacy inquiries or grievance redressal, contact our designated Grievance Officer at support@jalride.com. Statutory turnaround: 48h acknowledgement, 15 days resolution.
                  </Text>
                </View>
              ) : (
                <View style={styles.modalBody}>
                  <Text style={[styles.modalHeading, isDark && styles.textLight]}>
                    1. Passenger Safety & Ghat Boarding
                  </Text>
                  <Text style={styles.modalParagraph}>
                    All passengers must arrive at the assigned boarding ghat at least 15 minutes before the scheduled departure slot. Life jackets provided on certified vessels must be worn during river transit.
                  </Text>

                  <Text style={[styles.modalHeading, isDark && styles.textLight]}>
                    2. QR Boarding Pass Validity
                  </Text>
                  <Text style={styles.modalParagraph}>
                    Each booking generates a digital boarding pass with a unique QR code. The boat captain verifies the pass at boarding. Boarding passes are non-transferable.
                  </Text>

                  <Text style={[styles.modalHeading, isDark && styles.textLight]}>
                    3. Cancellation & Refund Policy
                  </Text>
                  <Text style={styles.modalParagraph}>
                    Rides cancelled prior to departure qualify for a 100% wallet escrow refund. Instant refunds are credited to your JalRide wallet. Weather cancellations by port authorities are fully refunded.
                  </Text>

                  <Text style={[styles.modalHeading, isDark && styles.textLight]}>
                    4. Cash on Ride Protocol
                  </Text>
                  <Text style={styles.modalParagraph}>
                    For Cash on Ride bookings, the exact fare must be paid to the boat captain prior to vessel departure. Platform commission is handled directly between JalRide and the boat operator.
                  </Text>
                </View>
              )}
            </ScrollView>

            <Button
              title="Close and Return to Registration"
              onPress={() => setModalType(null)}
              variant="primary"
              style={{ marginTop: spacing.m }}
            />
          </View>
        </View>
      </Modal>
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
  ownerNoticeBox: {
    backgroundColor: colors.tealMist,
    padding: 12,
    borderRadius: radii.m,
    marginBottom: spacing.m,
  },
  ownerNoticeText: {
    ...typography.caption,
    color: colors.teal,
    lineHeight: 18,
  },
  consentGroup: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radii.m,
    padding: spacing.m,
    marginVertical: spacing.m,
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  optionalCheckboxRow: {
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    paddingTop: 10,
    marginTop: 2,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
    backgroundColor: colors.white,
  },
  checkboxBoxActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  checkboxCheck: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  checkboxText: {
    flex: 1,
    ...typography.caption,
    color: colors.gray700,
    lineHeight: 18,
  },
  requiredStar: {
    color: colors.danger,
    fontWeight: '700',
  },
  linkText: {
    color: colors.teal,
    fontWeight: '700',
    textDecorationLine: 'underline',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.l,
    borderTopRightRadius: radii.l,
    padding: spacing.xl,
    paddingBottom: 36,
  },
  modalContentDark: {
    backgroundColor: colors.canvasDark,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.gray600,
    fontWeight: '700',
  },
  modalBody: {
    gap: 12,
  },
  modalHeading: {
    ...typography.bodySemiBold,
    color: colors.ink,
    marginTop: 6,
  },
  modalParagraph: {
    ...typography.caption,
    color: colors.gray700,
    lineHeight: 18,
  },
});
