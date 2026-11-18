import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { colors, radii, spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';

const STANDARD_KYC_TYPES = [
  {
    key: 'aadhaar',
    title: 'Aadhaar Card (National Identity)',
    subjectType: 'owner',
    status: 'pending',
    uploadedAt: null,
    icon: '🪪',
  },
  {
    key: 'pan',
    title: 'PAN Card (Tax Identification)',
    subjectType: 'owner',
    status: 'pending',
    uploadedAt: null,
    icon: '💳',
  },
  {
    key: 'bank_proof',
    title: 'Bank Proof (Cancelled Cheque / Passbook)',
    subjectType: 'owner',
    status: 'pending',
    uploadedAt: null,
    icon: '🏦',
  },
  {
    key: 'boat_registration',
    title: 'Boat Registration Certificate',
    subjectType: 'boat',
    status: 'pending',
    uploadedAt: null,
    icon: '📜',
  },
  {
    key: 'insurance',
    title: 'Vessel Navigation Insurance',
    subjectType: 'boat',
    status: 'pending',
    uploadedAt: null,
    icon: '⚓',
  },
];

export default function OwnerKycScreen({ navigation }) {
  const { isDark } = useTheme();
  const [docs, setDocs] = useState(STANDARD_KYC_TYPES);
  const [overallStatus, setOverallStatus] = useState('pending');
  const [uploadingDocKey, setUploadingDocKey] = useState(null);

  const loadKyc = async () => {
    try {
      const res = await api.getOwnerKyc();
      if (res) {
        if (res.status) setOverallStatus(res.status);
        const serverDocs = res.documents || [];
        
        // Merge server documents into standard document slots
        setDocs((prevDocs) =>
          prevDocs.map((item) => {
            const match = serverDocs.find(
              (sd) => sd.documentType === item.key || sd.type === item.key
            );
            if (match) {
              return {
                ...item,
                status: match.status || 'approved',
                uploadedAt: match.createdAt
                  ? new Date(match.createdAt).toLocaleDateString()
                  : 'Active',
              };
            }
            return item;
          })
        );
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadKyc();
  }, []);

  const handleUploadDocument = async (docItem) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      // Validate file size: 10MB limit
      if (asset.size && asset.size > 10 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Selected file exceeds the 10MB maximum limit. Please choose a smaller file.');
        return;
      }

      // Validate file type
      const mime = (asset.mimeType || '').toLowerCase();
      const name = (asset.name || '').toLowerCase();
      const isValidMime = mime.includes('pdf') || mime.includes('jpeg') || mime.includes('jpg') || mime.includes('png');
      const isValidExt = name.endsWith('.pdf') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png');

      if (!isValidMime && !isValidExt) {
        Alert.alert('Invalid Format', 'Only PDF, JPEG, and PNG document formats are supported.');
        return;
      }

      setUploadingDocKey(docItem.key);

      const formData = new FormData();
      formData.append('documentType', docItem.key);
      formData.append('subjectType', docItem.subjectType);
      formData.append('file', {
        uri: asset.uri,
        name: asset.name || `${docItem.key}.pdf`,
        type: asset.mimeType || 'application/pdf',
      });

      const uploadRes = await api.uploadKycDocument(formData);
      Alert.alert(
        'Upload Successful ✓',
        uploadRes.message || `${docItem.title} has been submitted to the JalRide Port Authority for verification.`
      );
      await loadKyc();
    } catch (err) {
      Alert.alert('Upload Error', err.message || 'Unable to upload KYC document.');
    } finally {
      setUploadingDocKey(null);
    }
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
              <Text style={styles.statusTitle}>
                {overallStatus === 'approved' ? 'KYC Verified Operator' : 'Compliance Under Review'}
              </Text>
              <Text style={styles.statusSub}>
                {overallStatus === 'approved'
                  ? 'Your fleet is authorized to pick up pilgrims across Varanasi ghats.'
                  : 'Submit all mandatory identity and vessel certificates to operate.'}
              </Text>
            </View>
            <Badge
              label={overallStatus === 'approved' ? 'Compliant' : 'Verification Pending'}
              variant={overallStatus === 'approved' ? 'success' : 'warning'}
            />
          </View>
        </Card>

        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          Required Compliance Documents
        </Text>

        {docs.map((doc) => {
          const isThisUploading = uploadingDocKey === doc.key;
          return (
            <Card key={doc.key} style={styles.docCard}>
              <View style={styles.docRow}>
                <View style={styles.docIconBox}>
                  <Text style={{ fontSize: 24 }}>{doc.icon}</Text>
                </View>

                <View style={{ flex: 1, paddingRight: spacing.s }}>
                  <Text style={styles.docTitle}>{doc.title}</Text>
                  <Text style={styles.docUploadDate}>
                    {doc.uploadedAt ? `Submitted: ${doc.uploadedAt}` : 'Not yet uploaded'}
                  </Text>
                </View>

                <Badge
                  label={doc.status === 'approved' ? 'Approved' : doc.uploadedAt ? 'Under Review' : 'Missing'}
                  variant={doc.status === 'approved' ? 'success' : doc.uploadedAt ? 'warning' : 'outline'}
                />
              </View>

              <View style={styles.docActions}>
                <TouchableOpacity
                  style={[styles.uploadBtn, isThisUploading && styles.uploadBtnDisabled]}
                  onPress={() => handleUploadDocument(doc)}
                  disabled={isThisUploading}
                >
                  {isThisUploading ? (
                    <ActivityIndicator color={colors.teal} size="small" />
                  ) : (
                    <Text style={styles.uploadBtnText}>
                      {doc.uploadedAt ? 'Upload New Revision 📁' : 'Choose & Upload Document 📁'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}

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
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.l,
    marginBottom: spacing.l,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  shieldBox: {
    width: 48,
    height: 48,
    borderRadius: radii.m,
    backgroundColor: 'rgba(0, 168, 150, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    ...typography.h3,
    color: colors.ink,
  },
  statusSub: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: spacing.m,
  },
  docCard: {
    marginBottom: spacing.m,
    padding: spacing.l,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.m,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  docUploadDate: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  docActions: {
    marginTop: spacing.m,
    paddingTop: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  uploadBtn: {
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
    borderRadius: radii.m,
    paddingVertical: spacing.s,
    alignItems: 'center',
  },
  uploadBtnDisabled: {
    opacity: 0.6,
  },
  uploadBtnText: {
    color: colors.teal,
    fontWeight: '700',
    fontSize: 13,
  },
});
