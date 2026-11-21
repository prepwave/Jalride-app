import React, { useState, useEffect } from 'react';
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

export default function AdminRefundsScreen({ navigation }) {
  const { isDark } = useTheme();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadRefunds = async (showIndicator = true) => {
    if (showIndicator) setLoading(true);
    try {
      const data = await api.getAdminRefundRequests();
      setRefunds(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Error loading admin refunds:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRefunds();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRefunds(false);
  };

  const handleApprove = (item) => {
    Alert.alert(
      'Authorize 100% Wallet Refund',
      `Are you sure you want to approve refund of ₹${item.refundAmount || item.amount || 0} to ${item.customer?.name || 'Customer'}'s wallet?\n\nThis will instantly credit the customer wallet and update platform escrow records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve Refund',
          onPress: async () => {
            setProcessingId(item._id);
            try {
              await api.approveRefund(item._id);
              Alert.alert('Refund Approved ✓', `₹${item.refundAmount || item.amount} has been credited to ${item.customer?.name || 'customer'}'s wallet.`);
              loadRefunds(false);
            } catch (err) {
              Alert.alert('Approval Error', err.message || 'Failed to approve refund.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const openRejectModal = (item) => {
    setSelectedRefund(item);
    setRejectionReason('Cancellation request does not comply with departure window policy.');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRefund) return;
    if (!rejectionReason.trim()) {
      Alert.alert('Required', 'Please enter a rejection reason.');
      return;
    }

    setProcessingId(selectedRefund._id);
    setShowRejectModal(false);
    try {
      await api.rejectRefund(selectedRefund._id, rejectionReason.trim());
      Alert.alert('Refund Rejected', 'The refund request has been rejected and the customer notified.');
      loadRefunds(false);
    } catch (err) {
      Alert.alert('Rejection Error', err.message || 'Failed to reject refund.');
    } finally {
      setProcessingId(null);
      setSelectedRefund(null);
    }
  };

  const renderRefundItem = ({ item }) => {
    const isProcessing = processingId === item._id;

    return (
      <Card style={styles.refundCard}>
        {/* Header: Ticket & Amount */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.ticketId, isDark && styles.textLight]}>
              {item.ticketId || `#${item._id?.slice(-8)?.toUpperCase()}`}
            </Text>
            <Text style={styles.requestDate}>
              Requested: {item.refundRequestedAt ? new Date(item.refundRequestedAt).toLocaleDateString() : 'Pending Review'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.refundAmount}>₹{item.refundAmount || item.amount || 0}</Text>
            <Badge label="100% Escrow" variant="warning" size="small" />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Customer & Boat Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.label}>PASSENGER</Text>
            <Text style={[styles.val, isDark && styles.textLight]} numberOfLines={1}>
              {item.customer?.name || 'Customer'}
            </Text>
            <Text style={styles.subVal} numberOfLines={1}>
              {item.customer?.email || item.customer?.phone || 'No phone'}
            </Text>
          </View>

          <View style={styles.infoCol}>
            <Text style={styles.label}>VESSEL & GHAT</Text>
            <Text style={[styles.val, isDark && styles.textLight]} numberOfLines={1}>
              {item.boat?.boatName || 'Waterways Boat'}
            </Text>
            <Text style={styles.subVal} numberOfLines={1}>
              📍 {item.boat?.location || 'Assi Ghat'}
            </Text>
          </View>
        </View>

        {/* Reason Box */}
        {item.refundReason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Reason given by passenger:</Text>
            <Text style={styles.reasonText}>"{item.refundReason}"</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
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
              <Text style={styles.approveBtnText}>✓ Approve & Refund</Text>
            )}
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Refund Authorizations"
        subtitle="100% wallet escrow customer refund queue"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.sunDeep} />
          <Text style={[styles.loadingText, isDark && styles.textLight]}>
            Loading pending refund requests...
          </Text>
        </View>
      ) : (
        <FlatList
          data={refunds}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderRefundItem}
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
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🛡️</Text>
              <Text style={[styles.emptyTitle, isDark && styles.textLight]}>
                No Pending Refunds
              </Text>
              <Text style={styles.emptySubtitle}>
                All customer refund requests have been processed. Platform escrow accounts are fully balanced.
              </Text>
            </View>
          }
        />
      )}

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Refund Request</Text>
            <Text style={styles.modalSubtitle}>
              Please provide the reason for declining refund for ticket {selectedRefund?.ticketId}.
            </Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={3}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="e.g. Cancelled less than 1 hour before scheduled departure."
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
  listContent: {
    padding: spacing.l,
    paddingBottom: 40,
  },
  refundCard: {
    marginBottom: spacing.m,
    padding: spacing.m,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketId: {
    fontFamily: 'monospace',
    fontWeight: '800',
    fontSize: 14,
    color: colors.ink,
  },
  requestDate: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  refundAmount: {
    ...typography.h3,
    color: colors.coral,
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
  reasonBox: {
    backgroundColor: 'rgba(255, 127, 80, 0.08)',
    padding: spacing.s,
    borderRadius: radii.s,
    marginTop: spacing.s,
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.coral,
    marginBottom: 2,
  },
  reasonText: {
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
    lineHeight: 18,
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
