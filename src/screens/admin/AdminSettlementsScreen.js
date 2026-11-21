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
} from 'react-native';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';

export default function AdminSettlementsScreen({ navigation }) {
  const { isDark } = useTheme();
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected'
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Approve modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [adminNote, setAdminNote] = useState('');

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadWithdrawals = useCallback(async (showIndicator = true) => {
    if (showIndicator) setLoading(true);
    try {
      const res = await api.getAdminWithdrawals(statusFilter);
      setWithdrawals(res.withdrawals || []);
    } catch (e) {
      console.warn('Error loading admin withdrawals:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadWithdrawals();
  }, [statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadWithdrawals(false);
  };

  const openApproveModal = (item) => {
    setSelectedWithdrawal(item);
    setTransactionRef(`UTR-JR-${Date.now().toString(36).toUpperCase()}`);
    setAdminNote('NEFT/IMPS transfer cleared successfully');
    setShowApproveModal(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedWithdrawal) return;
    if (!transactionRef.trim()) {
      Alert.alert('Required', 'Please enter a Bank UTR / Transaction Reference.');
      return;
    }

    setProcessingId(selectedWithdrawal._id);
    setShowApproveModal(false);
    try {
      await api.approveAdminWithdrawal(
        selectedWithdrawal._id,
        adminNote.trim(),
        transactionRef.trim()
      );
      Alert.alert(
        'Payout Approved ✓',
        `Withdrawal of ₹${selectedWithdrawal.amount} to ${selectedWithdrawal.owner?.name || 'Owner'} marked cleared with UTR ${transactionRef.trim()}.`
      );
      loadWithdrawals(false);
    } catch (err) {
      Alert.alert('Approval Error', err.message || 'Failed to approve withdrawal.');
    } finally {
      setProcessingId(null);
      setSelectedWithdrawal(null);
    }
  };

  const openRejectModal = (item) => {
    setSelectedWithdrawal(item);
    setRejectionReason('Bank account verification failed or incorrect IFSC code.');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedWithdrawal) return;
    if (!rejectionReason.trim()) {
      Alert.alert('Required', 'Please enter a rejection reason.');
      return;
    }

    setProcessingId(selectedWithdrawal._id);
    setShowRejectModal(false);
    try {
      await api.rejectAdminWithdrawal(selectedWithdrawal._id, rejectionReason.trim());
      Alert.alert(
        'Withdrawal Rejected',
        `Withdrawal request rejected. Reserved funds of ₹${selectedWithdrawal.amount} returned to owner's available balance.`
      );
      loadWithdrawals(false);
    } catch (err) {
      Alert.alert('Rejection Error', err.message || 'Failed to reject withdrawal.');
    } finally {
      setProcessingId(null);
      setSelectedWithdrawal(null);
    }
  };

  const getStatusVariant = (st) => {
    switch (st) {
      case 'approved':
      case 'completed':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'warning';
    }
  };

  const renderWithdrawalItem = ({ item }) => {
    const isProcessing = processingId === item._id;
    const bank = item.bankAccount || {};

    return (
      <Card style={styles.settlementCard}>
        {/* Header: ID, Date & Amount */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.reqId, isDark && styles.textLight]}>
              #{item._id?.slice(-8)?.toUpperCase()}
            </Text>
            <Text style={styles.reqDate}>
              📅 {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Pending'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amount}>₹{item.amount || 0}</Text>
            <Badge
              label={(item.status || 'pending').toUpperCase()}
              variant={getStatusVariant(item.status)}
              size="small"
            />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Owner & Bank Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.label}>VESSEL OWNER</Text>
            <Text style={[styles.val, isDark && styles.textLight]} numberOfLines={1}>
              {item.owner?.name || 'Boat Owner'}
            </Text>
            <Text style={styles.subVal} numberOfLines={1}>
              {item.owner?.phone || item.owner?.email || 'Contact on file'}
            </Text>
          </View>

          <View style={styles.infoCol}>
            <Text style={styles.label}>PAYOUT DESTINATION</Text>
            <Text style={[styles.val, isDark && styles.textLight]} numberOfLines={1}>
              {bank.bankName || 'Verified Bank'}
            </Text>
            <Text style={styles.subVal} numberOfLines={1}>
              A/C: •••• {bank.accountNumberLast4 || 'XXXX'} ({bank.ifscCode || 'IFSC'})
            </Text>
            {bank.accountHolderName && (
              <Text style={styles.subVal} numberOfLines={1}>
                Holder: {bank.accountHolderName}
              </Text>
            )}
          </View>
        </View>

        {/* Reference or Rejection Note */}
        {item.transactionReference ? (
          <View style={styles.refBox}>
            <Text style={styles.refLabel}>Bank UTR Reference:</Text>
            <Text style={styles.refVal}>{item.transactionReference}</Text>
          </View>
        ) : null}

        {item.failureReason || item.rejectionReason ? (
          <View style={styles.failBox}>
            <Text style={styles.failLabel}>Rejection Reason:</Text>
            <Text style={styles.failVal}>"{item.failureReason || item.rejectionReason}"</Text>
          </View>
        ) : null}

        {/* Actions if Pending */}
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
              onPress={() => openApproveModal(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.approveBtnText}>✓ Approve & Record UTR</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  const filterTabs = [
    { key: 'pending', label: 'Pending Payouts' },
    { key: 'approved', label: 'Cleared ✓' },
    { key: 'rejected', label: 'Rejected ✕' },
  ];

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Owner Payout Settlements"
        subtitle="Review, approve & record bank UTR payout clearing"
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

      {/* Settlements List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.sunDeep} />
          <Text style={[styles.loadingText, isDark && styles.textLight]}>
            Loading withdrawal requests queue...
          </Text>
        </View>
      ) : (
        <FlatList
          data={withdrawals}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderWithdrawalItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.sunDeep]}
              tintColor={colors.sunDeep}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>💳</Text>
              <Text style={[styles.emptyTitle, isDark && styles.textLight]}>
                No Settlements in Queue
              </Text>
              <Text style={styles.emptySubtitle}>
                No owner payout withdrawal requests found for the "{statusFilter}" status filter.
              </Text>
            </View>
          }
        />
      )}

      {/* Approve Modal with Bank UTR input */}
      <Modal
        visible={showApproveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowApproveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Bank Payout</Text>
            <Text style={styles.modalSubtitle}>
              Authorize ₹{selectedWithdrawal?.amount} payout to {selectedWithdrawal?.owner?.name}.
            </Text>

            <Text style={styles.modalInputLabel}>Bank UTR / Transaction Reference *</Text>
            <TextInput
              style={styles.modalInput}
              value={transactionRef}
              onChangeText={setTransactionRef}
              placeholder="e.g. UTR-JR-1029384756"
            />

            <Text style={styles.modalInputLabel}>Admin Settlement Note</Text>
            <TextInput
              style={styles.modalInput}
              value={adminNote}
              onChangeText={setAdminNote}
              placeholder="e.g. Cleared via HDFC Bank net banking"
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowApproveModal(false)}
                style={{ flex: 1, marginRight: spacing.s }}
              />
              <Button
                title="Approve Payout"
                onPress={handleConfirmApprove}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Withdrawal Request</Text>
            <Text style={styles.modalSubtitle}>
              Please provide the banking reason for declining payout of ₹{selectedWithdrawal?.amount}.
            </Text>

            <TextInput
              style={[styles.modalInput, { minHeight: 70, textAlignVertical: 'top' }]}
              multiline
              numberOfLines={3}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="e.g. Account number does not match IFSC branch code."
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
    backgroundColor: colors.sunDeep,
    borderColor: colors.sunDeep,
  },
  filterTabActiveDark: {
    backgroundColor: colors.sunDeep,
    borderColor: colors.sunDeep,
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
  settlementCard: {
    marginBottom: spacing.m,
    padding: spacing.m,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reqId: {
    fontFamily: 'monospace',
    fontWeight: '800',
    fontSize: 14,
    color: colors.ink,
  },
  reqDate: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  amount: {
    ...typography.h3,
    color: colors.teal,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.s,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: spacing.m,
    marginVertical: 4,
  },
  infoCol: {
    flex: 1,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.gray500,
    marginBottom: 2,
  },
  val: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
  },
  subVal: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 10,
  },
  refBox: {
    backgroundColor: 'rgba(0,128,128,0.06)',
    padding: spacing.s,
    borderRadius: radii.s,
    marginTop: spacing.s,
  },
  refLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.teal,
    marginBottom: 2,
  },
  refVal: {
    ...typography.caption,
    fontFamily: 'monospace',
    color: colors.ink,
    fontWeight: '700',
  },
  failBox: {
    backgroundColor: 'rgba(255, 127, 80, 0.08)',
    padding: spacing.s,
    borderRadius: radii.s,
    marginTop: spacing.s,
  },
  failLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.coral,
    marginBottom: 2,
  },
  failVal: {
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
    marginBottom: spacing.m,
  },
  modalInputLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.gray700,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: radii.m,
    padding: spacing.m,
    ...typography.bodySmall,
    color: colors.ink,
    marginBottom: spacing.m,
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: spacing.s,
  },
});
