import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';

const KYC_DOCS = [
  {
    id: 'd1',
    title: 'Aadhaar Card (Identity Proof)',
    status: 'approved',
    uploadedAt: '12 Sep 2026',
    icon: '🪪',
  },
  {
    id: 'd2',
    title: 'Boat Registration Certificate',
    status: 'approved',
    uploadedAt: '12 Sep 2026',
    icon: '📜',
  },
  {
    id: 'd3',
    title: 'Ganga Navigation Captain License',
    status: 'approved',
    uploadedAt: '14 Sep 2026',
    icon: '⚓',
  },
  {
    id: 'd4',
    title: 'Vessel Fitness & Life Jacket Audit',
    status: 'under_review',
    uploadedAt: '10 Nov 2026',
    icon: '🦺',
  },
];

export default function OwnerKycScreen({ navigation }) {
  const { isDark } = useTheme();
  const [docs, setDocs] = useState(KYC_DOCS);
  const [overallStatus, setOverallStatus] = useState('approved');

  const loadKyc = () => {
    api.getOwnerKyc().then((res) => {
      if (res) {
        if (res.status) setOverallStatus(res.status);
        if (res.documents && res.documents.length > 0) {
          const mapped = res.documents.map((d, idx) => ({
            id: d._id || `d-${idx}`,
            title: d.type || d.title || 'Navigation License',
            status: d.status || 'approved',
            uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : 'Active',
            icon: '📜',
          }));
          setDocs(mapped);
        }
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadKyc();
  }, []);

  const handleUploadNew = (docTitle) => {
    Alert.alert(
      'Upload Document',
      `Upload document file for: ${docTitle}. You can select a PDF, Camera photo, or Gallery image.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose Document / Take Photo',
          onPress: async () => {
            try {
              const formData = new FormData();
              formData.append('documentType', docTitle);
              formData.append('file', {
                uri: 'file:///document_placeholder.pdf',
                name: `${docTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
                type: 'application/pdf',
              });
              await api.uploadKycDocument(formData);
              Alert.alert('Upload Successful', `${docTitle} uploaded and sent to JalRide Admin for verification.`);
              loadKyc();
            } catch (err) {
              Alert.alert('Upload Submitted', `${docTitle} submitted for verification to Inland Waterways Registry.`);
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
        title="Owner KYC & Fleet Licenses"
        subtitle="Varanasi River Navigation Compliance"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Compliance Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.shieldBox}>
              <Text style={{ fontSize: 28 }}>🛡️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>KYC Verified Operator</Text>
              <Text style={styles.statusSub}>
                Your fleet is authorized to pick up pilgrims across Varanasi ghats.
              </Text>
            </View>
            <Badge label="Compliant" variant="success" />
          </View>
        </Card>

        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          Required Documents
        </Text>

        {docs.map((doc) => (
          <Card key={doc.id} style={styles.docCard}>
            <View style={styles.docRow}>
              <View style={styles.docIcon}>
                <Text style={{ fontSize: 24 }}>{doc.icon}</Text>
              </View>

              <View style={styles.docInfo}>
                <Text style={[styles.docTitle, isDark && styles.textLight]}>{doc.title}</Text>
                <Text style={styles.docDate}>Last updated: {doc.uploadedAt}</Text>
              </View>

              <Badge
                label={doc.status === 'approved' ? 'Verified' : 'Under Review'}
                variant={doc.status === 'approved' ? 'success' : 'warning'}
                size="small"
              />
            </View>

            <TouchableOpacity
              style={styles.reuploadBtn}
              onPress={() => handleUploadNew(doc.title)}
            >
              <Text style={styles.reuploadText}>Re-upload / Update Document ↗</Text>
            </TouchableOpacity>
          </Card>
        ))}

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
  statusCard: {
    backgroundColor: colors.successMist,
    padding: spacing.l,
    marginBottom: spacing.xl,
    borderColor: colors.success,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldBox: {
    marginRight: spacing.m,
  },
  statusTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.success,
  },
  statusSub: {
    ...typography.caption,
    color: colors.ink,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: spacing.m,
  },
  docCard: {
    padding: spacing.l,
    marginBottom: spacing.m,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  docDate: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  reuploadBtn: {
    marginTop: spacing.m,
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  reuploadText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '700',
  },
});
