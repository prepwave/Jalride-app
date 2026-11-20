import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import api from '../../services/api';

export default function PrivacyDataRightsScreen({ navigation }) {
  const { isDark } = useTheme();
  const { user, logout } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRequestDataErasure = () => {
    Alert.alert(
      'Request Personal Data Erasure',
      'Under the Digital Personal Data Protection Act 2023 (DPDP), you have the right to request the erasure of your personal data held by JalRide. Proceeding will revoke your active account access and schedule data deletion within the statutory period.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Erasure Request',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await api.requestDataErasure('DPDP Act 2023 Right to Erasure Request');
              Alert.alert(
                'Data Erasure Request Submitted',
                'Your personal data erasure request has been recorded. Our Data Protection Grievance Officer will process your request within 7 business days as required by DPDP rules.',
                [
                  {
                    text: 'OK',
                    onPress: async () => {
                      if (logout) await logout();
                      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                    },
                  },
                ]
              );
            } catch (err) {
              Alert.alert('Request Error', err.message || 'Unable to submit data erasure request.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Privacy & Data Rights"
        subtitle="DPDP Act 2023 & DPDP Rules 2025 Compliance"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Notice of Data Processing */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>📜 Digital Personal Data Protection (DPDP) Notice</Text>
          <Text style={styles.cardText}>
            JalRide Technologies Private Limited operates as a Data Fiduciary under the Digital Personal Data Protection Act, 2023. We collect and process personal data strictly with user consent for specified purposes.
          </Text>
        </Card>

        {/* Specified Purposes */}
        <Text style={[styles.sectionHeading, isDark && styles.textLight]}>
          Specified Purposes of Processing
        </Text>
        <Card style={styles.card}>
          <View style={styles.purposeItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.purposeText}>
              <Text style={{ fontWeight: '700' }}>Water Transit Reservations:</Text> Confirming your boat bookings, issuing digital boarding passes, and communicating departure updates.
            </Text>
          </View>

          <View style={styles.purposeItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.purposeText}>
              <Text style={{ fontWeight: '700' }}>Payment Settlement:</Text> Processing payments through licensed payment aggregators (Razorpay) and maintaining wallet ledger balances.
            </Text>
          </View>

          <View style={styles.purposeItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.purposeText}>
              <Text style={{ fontWeight: '700' }}>Navigation Safety Compliance:</Text> Fulfilling statutory passenger manifest requirements required by inland water navigation authorities.
            </Text>
          </View>
        </Card>

        {/* Rights of the Data Principal */}
        <Text style={[styles.sectionHeading, isDark && styles.textLight]}>
          Your Rights as a Data Principal
        </Text>
        <Card style={styles.card}>
          <View style={styles.purposeItem}>
            <Text style={styles.bullet}>1.</Text>
            <Text style={styles.purposeText}>
              <Text style={{ fontWeight: '700' }}>Right to Access:</Text> View summary of personal data being processed and identity of third parties with whom data is shared.
            </Text>
          </View>

          <View style={styles.purposeItem}>
            <Text style={styles.bullet}>2.</Text>
            <Text style={styles.purposeText}>
              <Text style={{ fontWeight: '700' }}>Right to Correction:</Text> Update or correct inaccurate or incomplete personal data from your Profile screen.
            </Text>
          </View>

          <View style={styles.purposeItem}>
            <Text style={styles.bullet}>3.</Text>
            <Text style={styles.purposeText}>
              <Text style={{ fontWeight: '700' }}>Right to Grievance Redressal:</Text> Reach our Data Protection Officer for prompt resolution of privacy concerns.
            </Text>
          </View>

          <View style={styles.purposeItem}>
            <Text style={styles.bullet}>4.</Text>
            <Text style={styles.purposeText}>
              <Text style={{ fontWeight: '700' }}>Right to Nominate:</Text> Designate any other individual to exercise your data principal rights in event of death or incapacity.
            </Text>
          </View>
        </Card>

        {/* Grievance Officer Contact */}
        <Text style={[styles.sectionHeading, isDark && styles.textLight]}>
          Data Protection Grievance Officer
        </Text>
        <Card style={styles.officerCard}>
          <Text style={styles.officerTitle}>Data Protection & Grievance Cell</Text>
          <Text style={styles.officerText}>JalRide Technologies Private Limited</Text>
          <Text style={styles.officerText}>Email: grievance@jalride.com</Text>
          <Text style={styles.officerText}>Response Timeline: Within 7 calendar days as per DPDP Rules 2025</Text>
        </Card>

        {/* Right to Erasure / Deletion Button */}
        <Text style={[styles.sectionHeading, isDark && styles.textLight]}>
          Right to Erasure / Account Deletion
        </Text>
        <Card style={styles.erasureCard}>
          <Text style={styles.erasureTitle}>Request Permanent Personal Data Erasure</Text>
          <Text style={styles.erasureText}>
            You may request the complete erasure of your personal data and account records. Active bookings must be completed or cancelled before requesting erasure.
          </Text>

          <Button
            title="Request Data Erasure / Delete Account"
            variant="outline"
            onPress={handleRequestDataErasure}
            loading={isDeleting}
            style={styles.deleteBtn}
          />
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
    padding: spacing.l,
  },
  card: {
    padding: spacing.l,
    marginBottom: spacing.m,
  },
  cardTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.teal,
    marginBottom: spacing.s,
  },
  cardText: {
    ...typography.bodySmall,
    color: colors.gray700,
    lineHeight: 20,
  },
  sectionHeading: {
    ...typography.h3,
    color: colors.ink,
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  purposeItem: {
    flexDirection: 'row',
    marginBottom: spacing.s,
  },
  bullet: {
    fontSize: 14,
    color: colors.teal,
    fontWeight: '700',
    marginRight: 8,
    lineHeight: 20,
  },
  purposeText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.gray700,
    lineHeight: 20,
  },
  officerCard: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
    borderWidth: 1,
    padding: spacing.l,
    marginBottom: spacing.m,
  },
  officerTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.teal,
    marginBottom: 4,
  },
  officerText: {
    ...typography.caption,
    color: colors.gray700,
    lineHeight: 18,
  },
  erasureCard: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    padding: spacing.l,
    marginBottom: spacing.xl,
  },
  erasureTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: 4,
  },
  erasureText: {
    ...typography.bodySmall,
    color: colors.gray700,
    lineHeight: 18,
    marginBottom: spacing.m,
  },
  deleteBtn: {
    borderColor: colors.danger,
  },
});
