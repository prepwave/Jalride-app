import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';

export default function AdminKycScreen({ navigation }) {
  const { isDark } = useTheme();
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected'
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadDocuments = useCallback(async (showIndicator = true) => {
    if (showIndicator) setLoading(true);
    try {
      const res = await api.getAdminKycDocuments(statusFilter);
      setDocuments(res.documents || []);
    } catch (e) {
      console.warn('Error loading admin KYC documents:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadDocuments();
  }, [statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDocuments(false);
  };

  const handleApprove = (doc) => {
    Alert.alert(
      'Verify & Approve KYC Document',
      `Approve ${formatDocType(doc.documentType)} for ${doc.user?.name || 'Operator'}?\n\nThis will mark the document as verified and update the operator's safety compliance badge.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Badge',
          onPress: async () => {
            setProcessingId(doc._id);
            try {
              await api.approveAdminKyc(doc._id);
              Alert.alert('Document Approved ✓', `${formatDocType(doc.documentType)} has been marked verified.`);
              loadDocuments(false);
            } catch (err) {
              Alert.alert('Approval Error', err.message || 'Failed to approve document.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const openRejectModal = (doc) => {
    setSelectedDoc(doc);
    setRejectionReason('Document image is blurred or document has expired. Please re-upload a clear copy.');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedDoc) return;
    if (!rejectionReason.trim()) {
      Alert.alert('Required', 'Please enter a rejection reason.');
      return;
    }

    setProcessingId(selectedDoc._id);
    setShowRejectModal(false);
    try {
      await api.rejectAdminKyc(selectedDoc._id, rejectionReason.trim());
      Alert.alert('Document Rejected', 'The document has been marked rejected and the operator notified.');
      loadDocuments(false);
    } catch (err) {
      Alert.alert('Rejection Error', err.message || 'Failed to reject document.');
    } finally {
      setProcessingId(null);
      setSelectedDoc(null);
    }
  };

  const formatDocType = (type) => {
    switch (type) {
      case 'aadhaar':
        return 'Aadhaar Card';
      case 'boat_license':
        return 'Port / Navigation License';
      case 'captain_certificate':
        return 'Captain Competency Certificate';
      case 'fitness_certificate':
        return 'Vessel Fitness Certificate';
      case 'insurance':
        return 'Marine Passenger Insurance';
      default:
        return type ? type.replace(/_/g, ' ').toUpperCase() : 'Government ID';
    }
  };

  const getDocStatusVariant = (st) => {
    switch (st) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'warning';
    }
  };

  const renderDocItem = ({ item }) => {
    const isProcessing = processingId === item._id;

    return (
      <Card style={styles.docCard}>
        {/* Header: Document Type & Badge */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.docType, isDark && styles.textLight]}>
              {formatDocType(item.documentType)}
            </Text>
            <Text style={styles.subjectType}>
              Subject: {item.subjectType === 'boat' ? `🛶 Boat: ${item.boat?.boatName || 'Fleet Vessel'}` : '👤 Operator / Captain'}
            </Text>
          </View>
          <Badge
            label={(item.status || 'pending').toUpperCase()}
            variant={getDocStatusVariant(item.status)}
          />
        </View>

        <View style={styles.divider} />

        {/* User Details */}
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>OPERATOR</Text>
            <Text style={[styles.infoVal, isDark && styles.textLight]} numberOfLines={1}>
              {item.user?.name || 'Vessel Owner'}
            </Text>
            <Text style={styles.infoSub} numberOfLines={1}>
              {item.user?.email || item.user?.phone || 'Verified contact'}
            </Text>
          </View>

          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>DOCUMENT NUMBER</Text>
            <Text style={[styles.infoVal, isDark && styles.textLight]} numberOfLines={1}>
              {item.documentNumber || 'Registered on file'}
            </Text>
            <Text style={styles.infoSub}>
              Uploaded: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
            </Text>
          </View>
        </View>

        {/* Document View / Link */}
        {item.fileUrl ? (
          <TouchableOpacity
            style={styles.viewDocBtn}
            onPress={() => Linking.openURL(item.fileUrl).catch(() => Alert.alert('Doc Link', item.fileUrl))}
          >
            <Text style={styles.viewDocText}>📄 Inspect Document Attachment ↗</Text>
          </TouchableOpacity>
        ) : null}

        {item.rejectionReason ? (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
            <Text style={styles.rejectionText}>"{item.rejectionReason}"</Text>
          </View>
        ) : null}

        {/* Action Buttons if Pending */}
        {item.status === 'pending' && (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => openRejectModal(item)}
              disabled={isProcessing}
            >
              <Text style={styles.rejectBtnText}>✕ Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => handleApprove(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.approveBtnText}>✓ Verify & Badge</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  const filterTabs = [
    { key: 'pending', label: 'Pending Audit' },
    { key: 'approved', label: 'Verified ✓' },
    { key: 'rejected', label: 'Rejected ✕' },
  ];

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="KYC & Safety Audit"
        subtitle="Operator Aadhaar, captain cert & fitness review"
        onBack={() => navigation.goBack()}
      />

      {/* Filter Tabs */}
      <View style={styles.filterStrip}>
        {filterTabs.map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterTab,
                isActive && styles.filterTabActive,
                isDark && styles.filterTabDark,
                isActive && isDark && styles.filterTabActiveDark,
              ]}
              onPress={() => setStatusFilter(tab.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Documents List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={[styles.loadingText, isDark && styles.textLight]}>
            Loading KYC documents audit queue...
          </Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderDocItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.teal]}
              tintColor={colors.teal}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>🪪</Text>
              <Text style={[styles.emptyTitle, isDark && styles.textLight]}>
                No Documents in Queue
              </Text>
              <Text style={styles.emptySubtitle}>
                No operator or vessel KYC documents found for the "{statusFilter}" status filter.
              </Text>
            </View>
          }
        />
      )}

      {/* Reject Reason Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject KYC Document</Text>
            <Text style={styles.modalSubtitle}>
              Please provide the compliance reason for rejecting this document.
            </Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={3}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="e.g. Document copy is illegible or missing official seal."
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowRejectModal(false)}
                style={{ flex: 1, marginRight: spacing.s }}
              />
              <Button
                title="Confirm Reject"
                variant="danger"
                onPress={handleConfirmReject}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  filterStrip: {
    flexDirection: 'row',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    gap: spacing.s,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.full,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterTabDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  filterTabActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  filterTabActiveDark: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  filterTabText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.gray600,
    fontSize: 11,
  },
  filterTabTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.l,
    paddingBottom: 40,
  },
  docCard: {
    marginBottom: spacing.m,
    padding: spacing.m,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  docType: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.ink,
  },
  subjectType: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.s,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.m,
    marginVertical: 4,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.gray500,
    marginBottom: 2,
  },
  infoVal: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
  },
  infoSub: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 10,
  },
  viewDocBtn: {
    backgroundColor: 'rgba(0,128,128,0.06)',
    paddingVertical: 7,
    paddingHorizontal: spacing.m,
    borderRadius: radii.s,
    marginTop: spacing.s,
    alignItems: 'center',
  },
  viewDocText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '700',
  },
  rejectionBox: {
    backgroundColor: 'rgba(255, 127, 80, 0.08)',
    padding: spacing.s,
    borderRadius: radii.s,
    marginTop: spacing.s,
  },
  rejectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.coral,
    marginBottom: 2,
  },
  rejectionText: {
    ...typography.caption,
    color: colors.ink,
    fontStyle: 'italic',
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.m,
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radii.m,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffcccc',
    backgroundColor: '#fff5f5',
  },
  rejectBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.coral,
  },
  approveBtn: {
    flex: 2,
    paddingVertical: 9,
    borderRadius: radii.m,
    alignItems: 'center',
    backgroundColor: colors.teal,
  },
  approveBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.gray600,
    marginTop: spacing.m,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.gray500,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.l,
    padding: spacing.xl,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: 4,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.gray600,
    marginBottom: spacing.l,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: radii.m,
    padding: spacing.m,
    ...typography.bodySmall,
    color: colors.ink,
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: spacing.l,
  },
  modalBtnRow: {
    flexDirection: 'row',
  },
});
