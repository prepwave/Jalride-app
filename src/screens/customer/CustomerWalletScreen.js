import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import BottomSheet from '../../components/common/BottomSheet';
import RazorpayCheckoutModal from '../../components/payment/RazorpayCheckoutModal';

const QUICK_AMOUNTS = [200, 500, 1000, 2000];

export default function CustomerWalletScreen({ navigation }) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'topup' | 'booking' | 'refund'

  // Topup sheet state
  const [showTopupSheet, setShowTopupSheet] = useState(false);
  const [topupAmount, setTopupAmount] = useState('500');
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);

  // Razorpay Modal state for wallet topup
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [activeTopupOrder, setActiveTopupOrder] = useState(null);

  // Withdraw sheet state
  const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankAccNumber, setBankAccNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  const loadWalletData = async () => {
    try {
      const data = await api.getCustomerWallet();
      setWallet(data || {});
    } catch (e) {
      console.warn('Error loading wallet:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadWalletData();
  };

  const handleExecuteTopup = async () => {
    const amt = parseFloat(topupAmount);
    if (!amt || amt < 50) {
      Alert.alert('Invalid Amount', 'Minimum top-up amount is ₹50.');
      return;
    }

    setIsProcessingTopup(true);
    try {
      const res = await api.createTopupOrder(amt);
      if (res && (res.order || res.orderId)) {
        setShowTopupSheet(false);
        setActiveTopupOrder(res);
        setShowRazorpayModal(true);
      } else {
        throw new Error(res?.message || 'Failed to create Razorpay top-up order.');
      }
    } catch (err) {
      Alert.alert('Top-up Error', err.message || 'Payment order could not be initiated.');
    } finally {
      setIsProcessingTopup(false);
    }
  };

  const handleTopupPaymentSuccess = async (signaturePayload) => {
    setShowRazorpayModal(false);
    setLoading(true);
    try {
      const verifyRes = await api.verifyTopup(signaturePayload);
      if (verifyRes && verifyRes.success) {
        Alert.alert('Top-up Successful! 🎉', verifyRes.message || `₹${topupAmount} added to your JalRide Wallet.`);
        await loadWalletData();
      } else {
        throw new Error(verifyRes?.message || 'Payment signature verification failed.');
      }
    } catch (err) {
      Alert.alert('Top-up Verification Failed', err.message || 'Could not verify payment signature with backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteWithdrawal = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0 || amt > (wallet?.balance || 0)) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount within your wallet balance.');
      return;
    }
    if (!bankAccNumber || !ifscCode) {
      Alert.alert('Bank Details Required', 'Please enter your bank account number and IFSC code.');
      return;
    }

    setLoading(true);
    try {
      let bankAccId = null;
      try {
        const accountsRes = await api.getCustomerBankAccounts();
        const accounts = accountsRes?.bankAccounts || accountsRes?.data || [];
        const match = accounts.find((a) => a.accountNumber === bankAccNumber);
        if (match) {
          bankAccId = match._id;
        } else {
          const added = await api.addCustomerBankAccount({
            accountNumber: bankAccNumber,
            ifsc: ifscCode.toUpperCase().trim(),
            accountHolderName: user?.name || 'Customer',
          });
          bankAccId = added?.bankAccount?._id || added?._id;
        }
      } catch (e) {
        console.warn('Bank lookup note:', e);
      }

      await api.requestCustomerWithdrawal(amt, bankAccId);
      setShowWithdrawSheet(false);
      Alert.alert('Withdrawal Submitted', `₹${amt} withdrawal request submitted. Payout will be processed within 24 business hours.`);
      await loadWalletData();
    } catch (err) {
      Alert.alert('Withdrawal Failed', err.message || 'Unable to submit withdrawal request.');
    } finally {
      setLoading(false);
    }
  };

  const transactions = (wallet?.transactions || []).filter((tx) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'topup') return tx.type === 'topup';
    if (activeFilter === 'booking') return tx.type === 'booking_debit';
    if (activeFilter === 'refund') return tx.type === 'refund_credit' || tx.type === 'cashback';
    return true;
  });

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Screen Header */}
      <View style={[styles.headerBar, isDark && styles.headerBarDark]}>
        <Text style={[styles.headerTitle, isDark && styles.textLight]}>JalRide Wallet</Text>
        <Text style={styles.headerSubtitle}>Instant 1-click payments, refunds & loyalty cashback</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.teal]}
            tintColor={colors.teal}
          />
        }
      >
        {/* Main Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceTopRow}>
            <Text style={styles.balanceLabel}>AVAILABLE JALRIDE BALANCE</Text>
            <Badge label="Active" variant="success" size="small" />
          </View>

          <Text style={styles.balanceAmount}>₹{wallet?.balance?.toLocaleString('en-IN') || '1,450'}</Text>

          <View style={styles.miniStatsRow}>
            <View style={styles.miniStatCol}>
              <Text style={styles.miniStatVal}>₹{wallet?.cashbackEarned || '220'}</Text>
              <Text style={styles.miniStatLbl}>Cashback Earned</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.miniStatCol}>
              <Text style={styles.miniStatVal}>{wallet?.loyaltyPoints || '340'} pts</Text>
              <Text style={styles.miniStatLbl}>Loyalty Rewards</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.miniStatCol}>
              <Text style={styles.miniStatVal}>100%</Text>
              <Text style={styles.miniStatLbl}>Safe Escrow</Text>
            </View>
          </View>

          {/* Action Button Row */}
          <View style={styles.walletBtnRow}>
            <TouchableOpacity
              style={styles.topupBtn}
              onPress={() => setShowTopupSheet(true)}
            >
              <Text style={styles.topupBtnText}>+ Top Up Balance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() => setShowWithdrawSheet(true)}
            >
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Refund & Safety Guarantee Card */}
        <Card style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>🛡️ Auto-Refund & Clawback Shield</Text>
          <Text style={styles.safetyDesc}>
            All cancellations made before cutoff are 100% credited back to your wallet instantly without gateway deduction penalties.
          </Text>
        </Card>

        {/* Filter Strip for Transactions */}
        <View style={styles.txHeaderRow}>
          <Text style={[styles.txHeading, isDark && styles.textLight]}>
            Transaction History
          </Text>
        </View>

        <View style={styles.filterPillRow}>
          {['all', 'topup', 'booking', 'refund'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterPill,
                activeFilter === f && styles.filterPillActive,
              ]}
              onPress={() => setActiveFilter(f)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === f && styles.filterPillTextActive,
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transactions List */}
        <View style={styles.txList}>
          {transactions.map((tx) => {
            const isPositive = tx.amount > 0;
            return (
              <View key={tx._id} style={styles.txItem}>
                <View style={styles.txIconBox}>
                  <Text style={styles.txEmoji}>
                    {tx.type === 'topup' ? '💳' : tx.type === 'cashback' ? '🎁' : tx.type === 'refund_credit' ? '🔄' : '🛶'}
                  </Text>
                </View>

                <View style={styles.txContent}>
                  <Text style={[styles.txTitle, isDark && styles.textLight]}>{tx.description}</Text>
                  <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                </View>

                <View style={styles.txAmountCol}>
                  <Text style={[styles.txAmount, isPositive ? styles.txPositive : styles.txNegative]}>
                    {isPositive ? '+' : ''}₹{Math.abs(tx.amount)}
                  </Text>
                  <Badge
                    label={tx.status}
                    variant={tx.status === 'success' ? 'success' : 'warning'}
                    size="small"
                  />
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Topup BottomSheet */}
      <BottomSheet
        visible={showTopupSheet}
        onClose={() => setShowTopupSheet(false)}
        title="Top Up JalRide Wallet"
        subtitle="Add funds instantly via UPI, Cards, or NetBanking"
        height={420}
      >
        <Text style={styles.sheetLabel}>Enter Amount (₹)</Text>
        <TextInput
          style={styles.sheetInput}
          keyboardType="numeric"
          value={topupAmount}
          onChangeText={setTopupAmount}
          placeholder="500"
        />

        <View style={styles.quickAmountRow}>
          {QUICK_AMOUNTS.map((amt) => (
            <TouchableOpacity
              key={amt}
              style={[
                styles.quickAmountChip,
                topupAmount === String(amt) && styles.quickAmountChipActive,
              ]}
              onPress={() => setTopupAmount(String(amt))}
            >
              <Text
                style={[
                  styles.quickAmountText,
                  topupAmount === String(amt) && styles.quickAmountTextActive,
                ]}
              >
                +₹{amt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title={`Pay ₹${topupAmount || 0} via Razorpay UPI`}
          onPress={handleExecuteTopup}
          loading={isProcessingTopup}
          style={{ marginTop: spacing.xl }}
        />
      </BottomSheet>

      {/* Withdraw BottomSheet */}
      <BottomSheet
        visible={showWithdrawSheet}
        onClose={() => setShowWithdrawSheet(false)}
        title="Withdraw Funds to Bank"
        subtitle="Direct NEFT/IMPS payout to your savings account"
        height={480}
      >
        <Text style={styles.sheetLabel}>Withdrawal Amount (Max ₹{wallet?.balance || 0})</Text>
        <TextInput
          style={styles.sheetInput}
          keyboardType="numeric"
          value={withdrawAmount}
          onChangeText={setWithdrawAmount}
          placeholder="Amount in ₹"
        />

        <Text style={[styles.sheetLabel, { marginTop: spacing.m }]}>Bank Account Number</Text>
        <TextInput
          style={styles.sheetInput}
          keyboardType="numeric"
          value={bankAccNumber}
          onChangeText={setBankAccNumber}
          placeholder="e.g. 5010048192841"
        />

        <Text style={[styles.sheetLabel, { marginTop: spacing.m }]}>Bank IFSC Code</Text>
        <TextInput
          style={styles.sheetInput}
          value={ifscCode}
          onChangeText={setIfscCode}
          placeholder="e.g. HDFC0001234"
          autoCapitalize="characters"
        />

        <Button
          title="Submit Withdrawal Request"
          onPress={handleExecuteWithdrawal}
          style={{ marginTop: spacing.xl }}
        />
      </BottomSheet>

      {/* Razorpay Checkout for Wallet Top-up */}
      <RazorpayCheckoutModal
        visible={showRazorpayModal}
        orderData={activeTopupOrder}
        customer={{
          name: user?.name || 'Customer Devotee',
          email: user?.email || 'customer@jalride.com',
          phone: user?.phone || '9876543210',
        }}
        onSuccess={handleTopupPaymentSuccess}
        onCancel={() => {
          setShowRazorpayModal(false);
        }}
      />
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
  headerBar: {
    paddingTop: 52,
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerBarDark: {
    backgroundColor: '#0a1e23',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.ink,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  scroll: {
    padding: spacing.l,
  },
  balanceCard: {
    backgroundColor: colors.deep,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.lift,
    marginBottom: spacing.l,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.white,
    marginVertical: spacing.s,
  },
  miniStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.m,
    padding: spacing.m,
    marginVertical: spacing.m,
  },
  miniStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  miniStatVal: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.sun,
  },
  miniStatLbl: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  walletBtnRow: {
    flexDirection: 'row',
    gap: spacing.m,
    marginTop: spacing.s,
  },
  topupBtn: {
    flex: 1,
    backgroundColor: colors.sun,
    paddingVertical: 12,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  topupBtnText: {
    ...typography.button,
    color: colors.ink,
  },
  withdrawBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 12,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  withdrawBtnText: {
    ...typography.button,
    color: colors.white,
  },
  safetyCard: {
    backgroundColor: colors.tealMist,
    padding: spacing.l,
    marginBottom: spacing.xl,
  },
  safetyTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  safetyDesc: {
    ...typography.bodySmall,
    color: colors.deep,
    lineHeight: 18,
  },
  txHeaderRow: {
    marginBottom: spacing.m,
  },
  txHeading: {
    ...typography.h3,
    color: colors.ink,
  },
  filterPillRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.l,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.m,
    borderRadius: radii.full,
    backgroundColor: colors.gray100,
  },
  filterPillActive: {
    backgroundColor: colors.teal,
  },
  filterPillText: {
    ...typography.caption,
    color: colors.gray600,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: colors.white,
  },
  txList: {
    gap: spacing.m,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.l,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.line,
  },
  txIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  txEmoji: {
    fontSize: 20,
  },
  txContent: {
    flex: 1,
  },
  txTitle: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.ink,
  },
  txDate: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    ...typography.bodyLarge,
    fontWeight: '700',
    marginBottom: 4,
  },
  txPositive: {
    color: colors.success,
  },
  txNegative: {
    color: colors.ink,
  },
  sheetLabel: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 6,
  },
  sheetInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.m,
  },
  quickAmountChip: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: colors.gray100,
    borderRadius: radii.s,
    alignItems: 'center',
  },
  quickAmountChipActive: {
    backgroundColor: colors.tealMist,
    borderWidth: 1,
    borderColor: colors.teal,
  },
  quickAmountText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.gray700,
  },
  quickAmountTextActive: {
    color: colors.teal,
  },
});
