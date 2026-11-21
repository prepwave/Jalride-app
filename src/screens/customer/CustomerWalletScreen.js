import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
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

export const formatTransactionDate = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const getTransactionMeta = (tx) => {
  const type = tx?.type || 'unknown';
  const amt = Number(tx?.amount ?? 0);
  const isPositive = amt > 0;
  const isZero = amt === 0;

  switch (type) {
    case 'topup':
    case 'wallet_topup':
      return {
        label: tx?.note || 'Wallet Top-up',
        icon: '💳',
        chip: 'TOP-UP',
        variant: 'success',
        direction: 'credit',
        sign: '+',
        isPositive: true,
        isZero: false,
      };
    case 'cashback':
      return {
        label: tx?.note || 'Loyalty Cashback Credited',
        icon: '🎁',
        chip: 'CASHBACK',
        variant: 'success',
        direction: 'credit',
        sign: '+',
        isPositive: true,
        isZero: false,
      };
    case 'reward':
      return {
        label: tx?.note || 'Bonus Reward Credited',
        icon: '🌟',
        chip: 'REWARD',
        variant: 'success',
        direction: 'credit',
        sign: '+',
        isPositive: true,
        isZero: false,
      };
    case 'refund_credit':
    case 'refund':
      return {
        label: tx?.note || (tx?.booking?.ticketId ? `Refund for Ticket ${tx.booking.ticketId}` : 'Booking Refund Credited to Wallet'),
        icon: '🔄',
        chip: 'REFUND',
        variant: 'success',
        direction: 'credit',
        sign: '+',
        isPositive: true,
        isZero: false,
      };
    case 'booking_payment':
    case 'booking_debit':
    case 'booking':
      return {
        label: tx?.note || (tx?.booking?.ticketId ? `Ride Booking (${tx.booking.ticketId})` : 'Boat Ride Booking Payment'),
        icon: '🛶',
        chip: 'BOOKING',
        variant: 'secondary',
        direction: 'debit',
        sign: '-',
        isPositive: false,
        isZero: false,
      };
    case 'withdrawal_request':
      return {
        label: tx?.note || 'Bank Withdrawal Requested',
        icon: '🏦',
        chip: 'WITHDRAWAL',
        variant: 'warning',
        direction: 'debit',
        sign: '-',
        isPositive: false,
        isZero: false,
      };
    case 'withdrawal_paid':
      return {
        label: tx?.note || 'Bank Withdrawal Payout Cleared',
        icon: '✅',
        chip: 'CLEARED',
        variant: 'info',
        direction: 'neutral',
        sign: '',
        isPositive: false,
        isZero: true,
      };
    case 'withdrawal_rejected':
      return {
        label: tx?.note ? `Withdrawal Rejected — ${tx.note}` : 'Withdrawal Rejected — Balance Restored',
        icon: '↩️',
        chip: 'RESTORED',
        variant: 'success',
        direction: 'credit',
        sign: '+',
        isPositive: true,
        isZero: false,
      };
    case 'admin_adjustment':
      return {
        label: tx?.note || 'Administrative Wallet Adjustment',
        icon: '⚖️',
        chip: 'ADJUSTMENT',
        variant: isPositive ? 'success' : isZero ? 'secondary' : 'warning',
        direction: isPositive ? 'credit' : isZero ? 'neutral' : 'debit',
        sign: isPositive ? '+' : isZero ? '' : '-',
        isPositive,
        isZero,
      };
    default:
      return {
        label: tx?.note || tx?.description || (type ? type.replace(/_/g, ' ') : 'Wallet Transaction'),
        icon: isPositive ? '💳' : '💸',
        chip: (type ? type.replace(/_/g, ' ') : 'TRANSACTION').toUpperCase(),
        variant: isPositive ? 'success' : isZero ? 'secondary' : 'warning',
        direction: isPositive ? 'credit' : isZero ? 'neutral' : 'debit',
        sign: isPositive ? '+' : isZero ? '' : '-',
        isPositive,
        isZero,
      };
  }
};

export default function CustomerWalletScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'topup' | 'booking' | 'refund' | 'withdrawals'

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
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [rawTransactions, setRawTransactions] = useState([]);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  const isFetchingRef = useRef(false);

  const loadWalletData = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!isSilent) setLoading(true);
    try {
      const [walletData, txList, accountsList, withList] = await Promise.all([
        api.getCustomerWallet(),
        api.getCustomerWalletTransactions(),
        api.getCustomerBankAccounts(),
        api.getCustomerWithdrawals(),
      ]);
      setWallet(walletData || {});
      const transactionsData = Array.isArray(txList)
        ? txList
        : Array.isArray(txList?.transactions)
        ? txList.transactions
        : Array.isArray(txList?.data)
        ? txList.data
        : [];
      setRawTransactions(transactionsData);
      const accounts = Array.isArray(accountsList) ? accountsList : [];
      setBankAccounts(accounts);
      if (accounts.length > 0) {
        setSelectedBankId((prevId) => {
          if (prevId && accounts.some((a) => a._id === prevId)) return prevId;
          const primary = accounts.find((a) => a.isPrimary) || accounts[0];
          return primary._id;
        });
      }
      setWithdrawals(Array.isArray(withList) ? withList : []);
    } catch (e) {
      console.warn('Error loading wallet:', e);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWalletData(true);
    }, [loadWalletData])
  );

  useEffect(() => {
    loadWalletData();
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadWalletData(true);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [loadWalletData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadWalletData(false);
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
    setWithdrawError('');
    const amt = parseFloat(withdrawAmount);
    const minAmt = wallet?.minWithdrawAmount || 100;
    const currentBalance = wallet?.balance || 0;

    if (!amt || isNaN(amt) || amt <= 0) {
      setWithdrawError('Please enter a valid amount.');
      return;
    }
    if (amt < minAmt) {
      setWithdrawError(`Minimum withdrawal amount is ₹${minAmt}.`);
      return;
    }
    if (amt > currentBalance) {
      setWithdrawError(`Only ₹${currentBalance} is available to withdraw right now.`);
      return;
    }
    if (!selectedBankId) {
      setWithdrawError('Please select a saved bank account for payout.');
      return;
    }

    setIsSubmittingWithdrawal(true);
    try {
      const res = await api.requestCustomerWithdrawal(amt, selectedBankId);
      if (res && res.success) {
        setShowWithdrawSheet(false);
        setWithdrawAmount('');
        Alert.alert(
          'Withdrawal Requested! 🏦',
          res.message || `₹${amt} withdrawal requested — pending admin payout clearance.`
        );
        await loadWalletData();
      } else {
        throw new Error(res?.message || 'Failed to submit withdrawal request.');
      }
    } catch (err) {
      setWithdrawError(err.message || 'Unable to submit withdrawal request.');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const allTransactions = rawTransactions.length > 0
    ? rawTransactions
    : (wallet?.transactions || []);

  const transactions = allTransactions.filter((tx) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'topup') return tx.type === 'topup' || tx.type === 'reward' || tx.type === 'wallet_topup';
    if (activeFilter === 'booking') return tx.type === 'booking_payment' || tx.type === 'booking_debit' || tx.type === 'booking';
    if (activeFilter === 'refund') return tx.type === 'refund_credit' || tx.type === 'cashback' || tx.type === 'refund';
    return true;
  });

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Screen Header */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, spacing.m) }, isDark && styles.headerBarDark]}>
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

          <Text style={styles.balanceAmount}>₹{(wallet?.balance ?? 0).toLocaleString('en-IN')}</Text>

          <View style={styles.miniStatsRow}>
            <View style={styles.miniStatCol}>
              <Text style={styles.miniStatVal}>₹{wallet?.cashbackEarned ?? 0}</Text>
              <Text style={styles.miniStatLbl}>Cashback Earned</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.miniStatCol}>
              <Text style={styles.miniStatVal}>{wallet?.loyaltyPoints ?? 0} pts</Text>
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
              <Text style={styles.topupBtnText}>+ Top Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() => setShowWithdrawSheet(true)}
            >
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bankBtn}
              onPress={() => navigation.navigate('ManageBankAccounts')}
            >
              <Text style={styles.bankBtnText}>🏦 Banks</Text>
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
          {['all', 'topup', 'booking', 'refund', 'withdrawals'].map((f) => (
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

        {/* Transactions / Withdrawals List */}
        {activeFilter === 'withdrawals' ? (
          <View style={styles.txList}>
            {withdrawals.length === 0 ? (
              <View style={styles.emptyInlineBox}>
                <Text style={styles.emptyInlineText}>No withdrawal requests submitted yet.</Text>
              </View>
            ) : (
              withdrawals.map((w) => (
                <View key={w._id} style={styles.txItem}>
                  <View style={styles.txIconBox}>
                    <Text style={styles.txEmoji}>🏦</Text>
                  </View>
                  <View style={styles.txContent}>
                    <Text style={[styles.txTitle, isDark && styles.textLight]}>
                      Payout to {w.bankAccount?.bankName || 'Bank'} (•• {w.bankAccount?.accountNumberLast4 || '••••'})
                    </Text>
                    <Text style={styles.txDate}>
                      {new Date(w.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.txAmountCol}>
                    <Text style={[styles.txAmount, styles.txNegative]}>-₹{w.amount}</Text>
                    <Badge
                      label={w.status === 'pending' ? 'Pending' : w.status === 'approved' ? 'Approved' : 'Rejected'}
                      variant={w.status === 'approved' ? 'success' : w.status === 'pending' ? 'warning' : 'danger'}
                      size="small"
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.txList}>
            {transactions.length === 0 ? (
              <View style={styles.emptyInlineBox}>
                <Text style={styles.emptyInlineText}>No transactions found in this category.</Text>
              </View>
            ) : (
              transactions.map((tx, idx) => {
                const meta = getTransactionMeta(tx);
                const amt = Number(tx?.amount ?? 0);
                const displayAmt = Math.abs(amt).toLocaleString('en-IN');
                const formattedDate = formatTransactionDate(tx.createdAt);
                const status = (tx.status || 'completed').toLowerCase();
                const statusVariant =
                  status === 'completed' || status === 'success'
                    ? 'success'
                    : status === 'failed'
                    ? 'danger'
                    : 'warning';

                return (
                  <View key={tx._id || String(idx)} style={styles.txItem}>
                    <View style={styles.txIconBox}>
                      <Text style={styles.txEmoji}>{meta.icon}</Text>
                    </View>

                    <View style={styles.txContent}>
                      <Text style={[styles.txTitle, isDark && styles.textLight]}>
                        {tx.note || meta.label}
                      </Text>
                      {tx.booking?.ticketId ? (
                        <Text style={styles.txBookingRef}>Ticket: {tx.booking.ticketId}</Text>
                      ) : null}
                      <Text style={styles.txDate}>{formattedDate}</Text>
                      {tx.razorpayPaymentId ? (
                        <Text style={styles.txRefId}>Ref: {tx.razorpayPaymentId}</Text>
                      ) : null}
                    </View>

                    <View style={styles.txAmountCol}>
                      <Text
                        style={[
                          styles.txAmount,
                          meta.isPositive ? styles.txPositive : (meta.isZero ? styles.txNeutral : styles.txNegative),
                        ]}
                      >
                        {meta.sign}₹{displayAmt}
                      </Text>
                      <Badge
                        label={status.toUpperCase()}
                        variant={statusVariant}
                        size="small"
                      />
                      {typeof tx.balanceAfter === 'number' ? (
                        <Text style={styles.txBalanceAfter}>₹{tx.balanceAfter.toLocaleString('en-IN')} balance after</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

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
        onClose={() => {
          if (!isSubmittingWithdrawal) {
            setShowWithdrawSheet(false);
            setWithdrawError('');
          }
        }}
        title="Withdraw Funds to Bank"
        subtitle="Direct NEFT/IMPS payout to your verified bank account"
        height={560}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
          {withdrawError ? (
            <View style={styles.withdrawErrorBox}>
              <Text style={styles.withdrawErrorText}>⚠️ {withdrawError}</Text>
            </View>
          ) : null}

          {/* Balance summary cards */}
          <View style={styles.withdrawSummaryRow}>
            <View style={styles.withdrawSummaryCol}>
              <Text style={styles.withdrawSummaryLabel}>Available Balance</Text>
              <Text style={styles.withdrawSummaryValue}>₹{(wallet?.balance ?? 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.withdrawSummaryCol}>
              <Text style={styles.withdrawSummaryLabel}>Min Payout</Text>
              <Text style={styles.withdrawSummaryValue}>₹{wallet?.minWithdrawAmount ?? 100}</Text>
            </View>
            {wallet?.reservedForWithdrawal > 0 ? (
              <View style={styles.withdrawSummaryCol}>
                <Text style={styles.withdrawSummaryLabel}>Pending</Text>
                <Text style={[styles.withdrawSummaryValue, { color: colors.warning }]}>
                  ₹{wallet.reservedForWithdrawal}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Bank Account Selection */}
          <Text style={[styles.sheetLabel, { marginTop: spacing.m }]}>Select Payout Bank Account</Text>

          {bankAccounts.length === 0 ? (
            <Card style={styles.noBankCard}>
              <Text style={styles.noBankTitle}>🏦 No Bank Accounts Linked</Text>
              <Text style={styles.noBankText}>
                You must link a verified bank account before you can withdraw wallet funds.
              </Text>
              <TouchableOpacity
                style={styles.linkBankBtn}
                onPress={() => {
                  setShowWithdrawSheet(false);
                  navigation.navigate('ManageBankAccounts');
                }}
              >
                <Text style={styles.linkBankBtnText}>+ Link Bank Account Now →</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <View style={styles.bankSelectGroup}>
              {bankAccounts.map((acc) => {
                const isSelected = selectedBankId === acc._id;
                const last4 = acc.accountNumberLast4 || (acc.accountNumber ? acc.accountNumber.slice(-4) : '••••');
                return (
                  <TouchableOpacity
                    key={acc._id}
                    style={[styles.bankSelectCard, isSelected && styles.bankSelectCardActive]}
                    onPress={() => {
                      setSelectedBankId(acc._id);
                      if (withdrawError) setWithdrawError('');
                    }}
                  >
                    <View style={styles.bankSelectRadio}>
                      {isSelected ? <View style={styles.bankSelectRadioInner} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bankSelectName}>{acc.bankName || 'Bank Account'}</Text>
                      <Text style={styles.bankSelectNum}>•••• •••• •••• {last4} ({acc.ifscCode})</Text>
                    </View>
                    {acc.isPrimary ? (
                      <Badge label="Primary" variant="success" size="small" />
                    ) : null}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.manageBanksLink}
                onPress={() => {
                  setShowWithdrawSheet(false);
                  navigation.navigate('ManageBankAccounts');
                }}
              >
                <Text style={styles.manageBanksLinkText}>+ Manage or Add Another Account →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Amount Input */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.m }}>
            <Text style={styles.sheetLabel}>Withdrawal Amount (₹)</Text>
            {wallet?.balance > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setWithdrawAmount(String(wallet.balance));
                  if (withdrawError) setWithdrawError('');
                }}
              >
                <Text style={styles.withdrawMaxText}>Withdraw All (₹{wallet.balance})</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TextInput
            style={styles.sheetInput}
            keyboardType="numeric"
            value={withdrawAmount}
            onChangeText={(t) => {
              setWithdrawAmount(t);
              if (withdrawError) setWithdrawError('');
            }}
            placeholder={`Min ₹${wallet?.minWithdrawAmount || 100}`}
          />

          <Button
            title={isSubmittingWithdrawal ? 'Submitting Request...' : 'Submit Withdrawal Request →'}
            onPress={handleExecuteWithdrawal}
            loading={isSubmittingWithdrawal}
            disabled={isSubmittingWithdrawal || bankAccounts.length === 0}
            variant="primary"
            style={{ marginTop: spacing.l, marginBottom: spacing.m }}
          />
        </ScrollView>
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
  bankBtn: {
    flex: 1.1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 12,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  bankBtnText: {
    ...typography.button,
    color: colors.white,
    fontSize: 13,
  },
  withdrawErrorBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    padding: spacing.s,
    borderRadius: radii.s,
    marginBottom: spacing.m,
  },
  withdrawErrorText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  withdrawSummaryRow: {
    flexDirection: 'row',
    gap: spacing.s,
    backgroundColor: colors.gray100,
    padding: spacing.m,
    borderRadius: radii.m,
    marginBottom: spacing.s,
  },
  withdrawSummaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  withdrawSummaryLabel: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 10,
    marginBottom: 2,
  },
  withdrawSummaryValue: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  noBankCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    padding: spacing.m,
    marginVertical: spacing.s,
  },
  noBankTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  noBankText: {
    ...typography.caption,
    color: colors.gray600,
    lineHeight: 16,
    marginBottom: spacing.m,
  },
  linkBankBtn: {
    backgroundColor: colors.teal,
    paddingVertical: 8,
    borderRadius: radii.s,
    alignItems: 'center',
  },
  linkBankBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
  bankSelectGroup: {
    gap: spacing.s,
    marginVertical: spacing.s,
  },
  bankSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.m,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  bankSelectCardActive: {
    borderColor: colors.teal,
    backgroundColor: '#f0fcfc',
  },
  bankSelectRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  bankSelectRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.teal,
  },
  bankSelectName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  bankSelectNum: {
    ...typography.caption,
    color: colors.gray500,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  manageBanksLink: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  manageBanksLinkText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '700',
  },
  withdrawMaxText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '700',
  },
  emptyInlineBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyInlineText: {
    ...typography.caption,
    color: colors.gray500,
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
    color: colors.danger,
  },
  txNeutral: {
    color: colors.gray600,
  },
  txBalanceAfter: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
    fontSize: 11,
  },
  txBookingRef: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '600',
    marginTop: 2,
  },
  txRefId: {
    ...typography.caption,
    color: colors.gray400,
    fontSize: 10,
    marginTop: 2,
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
