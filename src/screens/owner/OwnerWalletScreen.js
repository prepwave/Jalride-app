// @ts-nocheck
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
  Modal,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';

export default function OwnerWalletScreen({ navigation }) {
  const { isDark } = useTheme();

  // State
  const [wallet, setWallet] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);

  // Pagination
  const [txPage, setTxPage] = useState(1);
  const [txHasNext, setTxHasNext] = useState(false);
  const [loadingMoreTx, setLoadingMoreTx] = useState(false);

  const [wdPage, setWdPage] = useState(1);
  const [wdHasNext, setWdHasNext] = useState(false);
  const [loadingMoreWd, setLoadingMoreWd] = useState(false);

  // Tabs
  const [activeHistoryTab, setActiveHistoryTab] = useState('ledger'); // 'ledger' | 'withdrawals'

  // Loading & Refresh
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFetchingRef = useRef(false);
  const hasQueuedRefreshRef = useRef(false);

  // Withdrawal Sheet
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  // Add Bank Account Modal
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [holderName, setHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Load authoritative data
  const loadData = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) {
      hasQueuedRefreshRef.current = true;
      return;
    }
    isFetchingRef.current = true;
    if (!isSilent) setLoading(true);

    try {
      const [walletRes, accountsRes, txRes, wdRes] = await Promise.all([
        api.getOwnerWallet().catch((err) => {
          console.warn('getOwnerWallet failed:', err.message);
          return null;
        }),
        api.getOwnerBankAccounts().catch((err) => {
          console.warn('getOwnerBankAccounts failed:', err.message);
          return [];
        }),
        api.getOwnerWalletTransactions(1, 20).catch((err) => {
          console.warn('getOwnerWalletTransactions failed:', err.message);
          return { transactions: [], hasNext: false };
        }),
        api.getOwnerWithdrawals(1, 20).catch((err) => {
          console.warn('getOwnerWithdrawals failed:', err.message);
          return { withdrawals: [], hasNext: false };
        }),
      ]);

      if (walletRes) setWallet(walletRes);
      if (Array.isArray(accountsRes)) {
        setBankAccounts(accountsRes);
        // Default select primary or first account
        const primaryAcc = accountsRes.find((a) => a.isPrimary) || accountsRes[0];
        if (primaryAcc) setSelectedBankAccountId(primaryAcc._id);
      }
      if (txRes && Array.isArray(txRes.transactions)) {
        setTransactions(txRes.transactions);
        setTxPage(1);
        setTxHasNext(Boolean(txRes.hasNext));
      }
      if (wdRes && Array.isArray(wdRes.withdrawals)) {
        setWithdrawals(wdRes.withdrawals);
        setWdPage(1);
        setWdHasNext(Boolean(wdRes.hasNext));
      }
    } catch (e) {
      console.warn('Error fetching wallet data:', e);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      if (hasQueuedRefreshRef.current) {
        hasQueuedRefreshRef.current = false;
        loadData(true);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(wallet !== null);
    }, [loadData, wallet])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadData(true);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  // Pagination: Load more transactions
  const loadMoreTransactions = async () => {
    if (loadingMoreTx || !txHasNext) return;
    setLoadingMoreTx(true);
    try {
      const nextPage = txPage + 1;
      const res = await api.getOwnerWalletTransactions(nextPage, 20);
      if (res && Array.isArray(res.transactions)) {
        // Prevent duplicate keys when appending
        setTransactions((prev) => {
          const existingIds = new Set(prev.map((t) => t._id));
          const newUnique = res.transactions.filter((t) => !existingIds.has(t._id));
          return [...prev, ...newUnique];
        });
        setTxPage(nextPage);
        setTxHasNext(Boolean(res.hasNext));
      }
    } catch (e) {
      Alert.alert('Load More Failed', e.message || 'Unable to load older transactions.');
    } finally {
      setLoadingMoreTx(false);
    }
  };

  // Pagination: Load more withdrawals
  const loadMoreWithdrawals = async () => {
    if (loadingMoreWd || !wdHasNext) return;
    setLoadingMoreWd(true);
    try {
      const nextPage = wdPage + 1;
      const res = await api.getOwnerWithdrawals(nextPage, 20);
      if (res && Array.isArray(res.withdrawals)) {
        setWithdrawals((prev) => {
          const existingIds = new Set(prev.map((w) => w._id));
          const newUnique = res.withdrawals.filter((w) => !existingIds.has(w._id));
          return [...prev, ...newUnique];
        });
        setWdPage(nextPage);
        setWdHasNext(Boolean(res.hasNext));
      }
    } catch (e) {
      Alert.alert('Load More Failed', e.message || 'Unable to load older withdrawals.');
    } finally {
      setLoadingMoreWd(false);
    }
  };

  // Submit withdrawal
  const handleWithdraw = async () => {
    if (isSubmittingWithdrawal) return;

    const amt = parseFloat(withdrawAmount);
    const minAmt = typeof minWithdrawAmount === 'number' ? minWithdrawAmount : 1;
    const availBal = wallet?.availableBalance ?? 0;

    if (!amt || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive withdrawal amount.');
      return;
    }
    if (typeof minWithdrawAmount === 'number' && amt < minAmt) {
      Alert.alert('Minimum Threshold', `Minimum withdrawal amount is ₹${minAmt}.`);
      return;
    }
    if (amt > availBal) {
      Alert.alert('Insufficient Balance', `Only ₹${availBal.toLocaleString('en-IN')} is available to withdraw right now.`);
      return;
    }
    if (!selectedBankAccountId) {
      Alert.alert('Bank Account Required', 'Please select or add a verified linked bank account for payout.');
      return;
    }

    setIsSubmittingWithdrawal(true);
    try {
      const res = await api.requestOwnerWithdrawal(amt, selectedBankAccountId);
      Alert.alert(
        'Payout Request Submitted',
        `₹${amt.toLocaleString('en-IN')} payout requested successfully. Funds are pending admin approval and will be settled via RazorpayX.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowWithdrawModal(false);
              setWithdrawAmount('');
              loadData(true);
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Withdrawal Request Failed', err.message || 'Unable to submit payout request.');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  // Add bank account
  const handleAddBankAccount = async () => {
    if (isAddingAccount) return;

    const cleanHolder = holderName.trim();
    const cleanNumber = accountNumber.trim();
    const cleanConfirm = confirmAccountNumber.trim();
    const cleanIfsc = ifscCode.trim().toUpperCase();
    const cleanBank = bankName.trim();

    if (!cleanHolder) {
      Alert.alert('Validation Error', 'Please enter the account holder name.');
      return;
    }
    if (!cleanNumber || cleanNumber.length < 6) {
      Alert.alert('Validation Error', 'Account number must be at least 6 digits.');
      return;
    }
    if (cleanNumber !== cleanConfirm) {
      Alert.alert('Validation Error', 'Account number and confirmation do not match.');
      return;
    }
    if (!cleanIfsc || cleanIfsc.length < 8) {
      Alert.alert('Validation Error', 'Please enter a valid IFSC code (e.g. SBIN0001234).');
      return;
    }

    setIsAddingAccount(true);
    try {
      await api.addOwnerBankAccount({
        accountHolderName: cleanHolder,
        accountNumber: cleanNumber,
        ifscCode: cleanIfsc,
        bankName: cleanBank || undefined,
      });

      Alert.alert('Bank Account Added', 'Your bank account has been linked successfully.');
      setShowAddBankModal(false);
      setHolderName('');
      setAccountNumber('');
      setConfirmAccountNumber('');
      setIfscCode('');
      setBankName('');
      await loadData(true);
    } catch (err) {
      Alert.alert('Failed to Add Account', err.message || 'Unable to link bank account.');
    } finally {
      setIsAddingAccount(false);
    }
  };

  // Set primary bank account
  const handleSetPrimary = async (accountId) => {
    if (actionLoadingId) return;
    setActionLoadingId(accountId);
    try {
      await api.setPrimaryOwnerBankAccount(accountId);
      await loadData(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to update primary bank account.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete bank account
  const handleDeleteAccount = (account) => {
    if (actionLoadingId) return;
    Alert.alert(
      'Remove Bank Account',
      `Are you sure you want to remove ${account.bankName || 'Account'} ending in ${account.accountNumberLast4}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(account._id);
            try {
              await api.deleteOwnerBankAccount(account._id);
              Alert.alert('Account Removed', 'Bank account was removed.');
              await loadData(true);
            } catch (err) {
              Alert.alert('Removal Blocked', err.message || 'Cannot remove bank account.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const availableBalance = wallet?.availableBalance ?? 0;
  const totalEarned = wallet?.totalEarned ?? 0;
  const totalCommissionPaid = wallet?.totalCommissionPaid ?? 0;
  const pendingAmount = wallet?.pendingAmount ?? 0;
  const reservedForWithdrawal = wallet?.reservedForWithdrawal ?? 0;
  const totalWithdrawn = wallet?.totalWithdrawn ?? 0;
  const minWithdrawAmount = typeof wallet?.minWithdrawAmount === 'number' ? wallet.minWithdrawAmount : null;
  const payoutHoldDays = typeof wallet?.payoutHoldDays === 'number' ? wallet.payoutHoldDays : null;
  const pendingBreakdown = wallet?.pendingBreakdown || [];

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Fleet Earnings & Wallet"
        subtitle="Direct bank payouts & commission ledger"
        rightAction={
          <TouchableOpacity
            style={styles.headerPayoutBtn}
            onPress={() => setShowWithdrawModal(true)}
          >
            <Text style={styles.headerPayoutBtnText}>💸 Withdraw</Text>
          </TouchableOpacity>
        }
      />

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
        {/* ========================================================================= */}
        {/* 1. THREE PRIMARY KPI CARDS */}
        {/* ========================================================================= */}
        <View style={styles.kpiCardsRow}>
          {/* Card 1: Available Balance */}
          <Card style={[styles.kpiCard, styles.kpiCardAvailable]}>
            <View style={styles.kpiCardTop}>
              <Text style={styles.kpiCardLabelSuccess}>AVAILABLE FOR PAYOUT</Text>
              <Text style={styles.kpiIcon}>💸</Text>
            </View>
            <Text style={styles.kpiValueLarge}>₹{availableBalance.toLocaleString('en-IN')}</Text>
            <Text style={styles.kpiCardDesc}>
              Ready for immediate withdrawal or reserved for cash ride commission.
            </Text>
            <TouchableOpacity
              style={styles.requestPayoutBtn}
              onPress={() => setShowWithdrawModal(true)}
            >
              <Text style={styles.requestPayoutBtnText}>Request Bank Payout ↗</Text>
            </TouchableOpacity>
          </Card>

          {/* Card 2: Total Earned */}
          <Card style={styles.kpiCard}>
            <View style={styles.kpiCardTop}>
              <Text style={styles.kpiCardLabel}>TOTAL RIDES EARNED</Text>
              <Text style={styles.kpiIcon}>⛵</Text>
            </View>
            <Text style={[styles.kpiValue, isDark && styles.textLight]}>
              ₹{totalEarned.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.kpiCardDesc}>
              Lifetime gross earnings credited from all completed boat bookings.
            </Text>
            <View style={styles.pillBox}>
              <Badge label="Direct to Wallet" variant="neutral" size="small" />
            </View>
          </Card>

          {/* Card 3: Commission Settled */}
          <Card style={styles.kpiCard}>
            <View style={styles.kpiCardTop}>
              <Text style={styles.kpiCardLabel}>COMMISSION SETTLED</Text>
              <Text style={styles.kpiIcon}>📊</Text>
            </View>
            <Text style={[styles.kpiValue, isDark && styles.textLight]}>
              ₹{totalCommissionPaid.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.kpiCardDesc}>
              Platform fees auto-deducted per ride {typeof wallet?.commissionRate === 'number' ? `(${wallet.commissionRate}% rate)` : '(Rate: N/A)'}.
            </Text>
            <View style={styles.pillBox}>
              <Badge label="Auto-Settled" variant="info" size="small" />
            </View>
          </Card>
        </View>

        {/* SECONDARY METRICS STRIP */}
        <Card style={styles.secondaryStripCard}>
          <View style={styles.secondaryRow}>
            <View style={styles.secondaryCol}>
              <Text style={styles.secondaryVal}>₹{pendingAmount.toLocaleString('en-IN')}</Text>
              <Text style={styles.secondaryLbl}>Pending Clearance</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.secondaryCol}>
              <Text style={styles.secondaryVal}>₹{reservedForWithdrawal.toLocaleString('en-IN')}</Text>
              <Text style={styles.secondaryLbl}>Reserved for Payout</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.secondaryCol}>
              <Text style={styles.secondaryVal}>₹{totalWithdrawn.toLocaleString('en-IN')}</Text>
              <Text style={styles.secondaryLbl}>Total Withdrawn</Text>
            </View>
          </View>
          <View style={styles.stripNoticeRow}>
            <Text style={styles.stripNoticeText}>
              ℹ️ {typeof minWithdrawAmount === 'number' ? `Min. withdrawal ₹${minWithdrawAmount}` : 'Min. withdrawal policy applies'} • {typeof payoutHoldDays === 'number' ? `Trip earnings hold period: ${payoutHoldDays} days` : 'Hold period: N/A'}
            </Text>
          </View>
        </Card>

        {/* ========================================================================= */}
        {/* 2. PENDING CLEARANCE BREAKDOWN (if pendingAmount > 0) */}
        {/* ========================================================================= */}
        {pendingAmount > 0 && pendingBreakdown.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              ⏳ Upcoming Trip Clearances
            </Text>
            <Card style={styles.pendingCard}>
              {pendingBreakdown.map((item, idx) => (
                <View key={item.ticketId || idx} style={styles.pendingItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingTicket}>{item.ticketId}</Text>
                    <Text style={styles.pendingDate}>Trip Date: {item.bookingDate}</Text>
                    <Text style={styles.pendingUnlock}>
                      Unlocks on {item.unlocksAt} ({item.daysLeft} {item.daysLeft === 1 ? 'day' : 'days'} left)
                    </Text>
                  </View>
                  <Text style={styles.pendingAmount}>₹{item.amount}</Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* ========================================================================= */}
        {/* 3. LINKED BANK ACCOUNTS */}
        {/* ========================================================================= */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              🏦 Linked Bank Accounts
            </Text>
            <TouchableOpacity
              style={styles.addAccountBtn}
              onPress={() => setShowAddBankModal(true)}
            >
              <Text style={styles.addAccountBtnText}>+ Add Account</Text>
            </TouchableOpacity>
          </View>

          {bankAccounts.length === 0 ? (
            <Card style={styles.emptyBankCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🏦</Text>
              <Text style={[styles.emptyBankTitle, isDark && styles.textLight]}>
                No Bank Account Linked
              </Text>
              <Text style={styles.emptyBankSub}>
                Add your verified bank account to receive RazorpayX direct payouts.
              </Text>
              <Button
                title="+ Add Bank Account"
                onPress={() => setShowAddBankModal(true)}
                style={{ marginTop: spacing.m, width: 200 }}
              />
            </Card>
          ) : (
            bankAccounts.map((acc) => (
              <Card key={acc._id} style={styles.bankAccountCard}>
                <View style={styles.bankAccountRow}>
                  <View style={styles.bankIcon}>
                    <Text style={{ fontSize: 22 }}>🏛️</Text>
                  </View>
                  <View style={{ flex: 1, marginRight: spacing.s }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.bankName, isDark && styles.textLight]}>
                        {acc.bankName || 'Verified Bank Account'}
                      </Text>
                      {acc.isPrimary && (
                        <View style={{ marginLeft: 8 }}>
                          <Badge label="Primary" variant="success" size="small" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.bankHolder}>{acc.accountHolderName}</Text>
                    <Text style={styles.bankNumber}>
                      A/C: ****{acc.accountNumberLast4} • IFSC: {acc.ifscCode}
                    </Text>
                  </View>
                </View>

                <View style={styles.bankActionRow}>
                  {!acc.isPrimary && (
                    <TouchableOpacity
                      style={styles.bankActionBtn}
                      onPress={() => handleSetPrimary(acc._id)}
                      disabled={actionLoadingId === acc._id}
                    >
                      <Text style={styles.bankActionBtnText}>★ Set as Primary</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.bankDeleteBtn}
                    onPress={() => handleDeleteAccount(acc)}
                    disabled={actionLoadingId === acc._id}
                  >
                    <Text style={styles.bankDeleteBtnText}>🗑️ Remove</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* ========================================================================= */}
        {/* 4. HISTORY TABS: LEDGER TRANSACTIONS vs WITHDRAWAL HISTORY */}
        {/* ========================================================================= */}
        <View style={styles.sectionWrap}>
          <View style={styles.historyTabsRow}>
            <TouchableOpacity
              style={[
                styles.historyTab,
                activeHistoryTab === 'ledger' && styles.historyTabActive,
              ]}
              onPress={() => setActiveHistoryTab('ledger')}
            >
              <Text
                style={[
                  styles.historyTabText,
                  activeHistoryTab === 'ledger' && styles.historyTabTextActive,
                ]}
              >
                📜 Ledger Transactions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.historyTab,
                activeHistoryTab === 'withdrawals' && styles.historyTabActive,
              ]}
              onPress={() => setActiveHistoryTab('withdrawals')}
            >
              <Text
                style={[
                  styles.historyTabText,
                  activeHistoryTab === 'withdrawals' && styles.historyTabTextActive,
                ]}
              >
                💸 Payout History
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: LEDGER TRANSACTIONS */}
          {activeHistoryTab === 'ledger' && (
            <Card style={styles.historyCard}>
              {transactions.length === 0 ? (
                <View style={styles.emptyHistoryBox}>
                  <Text style={styles.emptyHistoryText}>
                    No ledger transactions recorded yet. Earnings and deductions will appear here.
                  </Text>
                </View>
              ) : (
                transactions.map((tx, idx) => {
                  const isCredit = tx.amount > 0;
                  const isCommission = tx.type === 'commission_deduction';
                  const isWithdrawal = tx.type === 'withdrawal_request';

                  let badgeLabel = 'EARNING';
                  let badgeVariant = 'success';
                  if (isCommission) {
                    badgeLabel = 'COMMISSION';
                    badgeVariant = 'warning';
                  } else if (isWithdrawal) {
                    badgeLabel = 'PAYOUT';
                    badgeVariant = 'accent';
                  } else if (tx.type === 'withdrawal_rejected') {
                    badgeLabel = 'REFUND';
                    badgeVariant = 'info';
                  }

                  const formattedDate = tx.createdAt
                    ? new Date(tx.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Recent';

                  return (
                    <View key={tx._id || idx}>
                      <View style={styles.txRow}>
                        <View style={{ flex: 1, marginRight: spacing.s }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                            <Badge label={badgeLabel} variant={badgeVariant} size="small" />
                            {tx.booking?.ticketId && (
                              <Text style={styles.txTicketRef}>
                                REF: {tx.booking.ticketId}
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.txNote, isDark && styles.textLight]}>
                            {tx.note || 'Wallet Transaction'}
                          </Text>
                          <Text style={styles.txDate}>{formattedDate}</Text>
                        </View>

                        <Text
                          style={[
                            styles.txAmount,
                            isCredit ? styles.txCredit : styles.txDebit,
                          ]}
                        >
                          {isCredit ? `+₹${tx.amount}` : `−₹${Math.abs(tx.amount)}`}
                        </Text>
                      </View>
                      {idx < transactions.length - 1 && <View style={styles.txDivider} />}
                    </View>
                  );
                })
              )}

              {txHasNext && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={loadMoreTransactions}
                  disabled={loadingMoreTx}
                >
                  {loadingMoreTx ? (
                    <ActivityIndicator size="small" color={colors.teal} />
                  ) : (
                    <Text style={styles.loadMoreBtnText}>Load More Transactions ↓</Text>
                  )}
                </TouchableOpacity>
              )}
            </Card>
          )}

          {/* TAB 2: WITHDRAWAL HISTORY */}
          {activeHistoryTab === 'withdrawals' && (
            <Card style={styles.historyCard}>
              {withdrawals.length === 0 ? (
                <View style={styles.emptyHistoryBox}>
                  <Text style={styles.emptyHistoryText}>
                    No withdrawal requests submitted yet.
                  </Text>
                </View>
              ) : (
                withdrawals.map((wd, idx) => {
                  let statusVariant = 'warning';
                  let statusLabel = 'PENDING';
                  if (wd.status === 'processed') {
                    statusVariant = 'success';
                    statusLabel = 'PROCESSED';
                  } else if (wd.status === 'rejected') {
                    statusVariant = 'danger';
                    statusLabel = 'REJECTED';
                  }

                  const formattedDate = wd.createdAt
                    ? new Date(wd.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Recent';

                  return (
                    <View key={wd._id || idx}>
                      <View style={styles.wdRow}>
                        <View style={{ flex: 1, marginRight: spacing.s }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Badge label={statusLabel} variant={statusVariant} size="small" />
                            <Text style={styles.wdDate}> • {formattedDate}</Text>
                          </View>
                          <Text style={[styles.wdBank, isDark && styles.textLight]}>
                            {wd.bankAccount?.bankName || 'Linked Bank'} (****{wd.bankAccount?.accountNumberLast4 || '----'})
                          </Text>
                          {wd.adminNote ? (
                            <Text style={styles.wdAdminNote}>Admin: {wd.adminNote}</Text>
                          ) : null}
                        </View>

                        <Text style={styles.wdAmount}>₹{wd.amount?.toLocaleString('en-IN')}</Text>
                      </View>
                      {idx < withdrawals.length - 1 && <View style={styles.txDivider} />}
                    </View>
                  );
                })
              )}

              {wdHasNext && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={loadMoreWithdrawals}
                  disabled={loadingMoreWd}
                >
                  {loadingMoreWd ? (
                    <ActivityIndicator size="small" color={colors.teal} />
                  ) : (
                    <Text style={styles.loadMoreBtnText}>Load More Payouts ↓</Text>
                  )}
                </TouchableOpacity>
              )}
            </Card>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ========================================================================= */}
      {/* 5. WITHDRAWAL REQUEST MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={showWithdrawModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.textLight]}>
                Request Bank Payout
              </Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Funds will be transferred to your linked bank account via RazorpayX payout after review.
            </Text>

            <View style={styles.modalAvailBanner}>
              <Text style={styles.modalAvailLabel}>Available Balance</Text>
              <Text style={styles.modalAvailValue}>₹{availableBalance.toLocaleString('en-IN')}</Text>
            </View>

            <Text style={[styles.fieldLabel, isDark && styles.textLight]}>
              Enter Withdrawal Amount (₹)
            </Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              keyboardType="numeric"
              placeholder={typeof minWithdrawAmount === 'number' ? `Min. ₹${minWithdrawAmount}` : 'Enter amount'}
              placeholderTextColor={colors.gray400}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />

            <Text style={[styles.fieldLabel, { marginTop: spacing.m }, isDark && styles.textLight]}>
              Select Payout Destination
            </Text>
            {bankAccounts.length === 0 ? (
              <View style={styles.noBankNotice}>
                <Text style={styles.noBankNoticeText}>
                  ⚠️ No linked bank account found. Please link a verified bank account first.
                </Text>
                <TouchableOpacity
                  style={styles.addInlineBtn}
                  onPress={() => {
                    setShowWithdrawModal(false);
                    setShowAddBankModal(true);
                  }}
                >
                  <Text style={styles.addInlineBtnText}>+ Link Bank Account Now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 150, marginVertical: spacing.s }}>
                {bankAccounts.map((acc) => {
                  const isSelected = selectedBankAccountId === acc._id;
                  return (
                    <TouchableOpacity
                      key={acc._id}
                      style={[
                        styles.bankSelectOption,
                        isSelected && styles.bankSelectOptionActive,
                      ]}
                      onPress={() => setSelectedBankAccountId(acc._id)}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.bankSelectName, isDark && styles.textLight]}>
                          {acc.bankName || 'Verified Bank'} (****{acc.accountNumberLast4})
                        </Text>
                        <Text style={styles.bankSelectSub}>
                          {acc.accountHolderName} • IFSC: {acc.ifscCode}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <Button
              title={isSubmittingWithdrawal ? 'Submitting Request...' : 'Confirm & Request Payout 💸'}
              onPress={handleWithdraw}
              disabled={isSubmittingWithdrawal || bankAccounts.length === 0}
              style={{ marginTop: spacing.l }}
            />
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 6. ADD BANK ACCOUNT MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={showAddBankModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddBankModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, isDark && styles.textLight]}>
                  Link Bank Account
                </Text>
                <TouchableOpacity onPress={() => setShowAddBankModal(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Add your verified bank account details to receive fleet payouts.
              </Text>

              <Text style={[styles.fieldLabel, isDark && styles.textLight]}>
                Account Holder Name *
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Name as per bank passbook"
                placeholderTextColor={colors.gray400}
                value={holderName}
                onChangeText={setHolderName}
              />

              <Text style={[styles.fieldLabel, isDark && styles.textLight]}>
                Account Number *
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                keyboardType="numeric"
                secureTextEntry
                placeholder="Enter bank account number"
                placeholderTextColor={colors.gray400}
                value={accountNumber}
                onChangeText={setAccountNumber}
              />

              <Text style={[styles.fieldLabel, isDark && styles.textLight]}>
                Confirm Account Number *
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                keyboardType="numeric"
                placeholder="Re-enter bank account number"
                placeholderTextColor={colors.gray400}
                value={confirmAccountNumber}
                onChangeText={setConfirmAccountNumber}
              />

              <Text style={[styles.fieldLabel, isDark && styles.textLight]}>
                IFSC Code *
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="e.g. SBIN0001234"
                placeholderTextColor={colors.gray400}
                value={ifscCode}
                onChangeText={setIfscCode}
                autoCapitalize="characters"
              />

              <Text style={[styles.fieldLabel, isDark && styles.textLight]}>
                Bank Name (Optional)
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="e.g. State Bank of India"
                placeholderTextColor={colors.gray400}
                value={bankName}
                onChangeText={setBankName}
              />

              <Button
                title={isAddingAccount ? 'Linking Account...' : 'Link Bank Account'}
                onPress={handleAddBankAccount}
                disabled={isAddingAccount}
                style={{ marginTop: spacing.l }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fbfb',
  },
  containerDark: {
    backgroundColor: '#0a1e23',
  },
  textLight: {
    color: '#ffffff',
  },
  scroll: {
    padding: spacing.l,
  },
  headerPayoutBtn: {
    backgroundColor: colors.sun,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  headerPayoutBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
  },

  // KPI Cards
  kpiCardsRow: {
    marginBottom: spacing.m,
  },
  kpiCard: {
    padding: spacing.l,
    marginBottom: spacing.m,
  },
  kpiCardAvailable: {
    borderWidth: 1.5,
    borderColor: 'rgba(21, 128, 61, 0.3)',
    backgroundColor: '#f0fdf4',
  },
  kpiCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiCardLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.gray600,
    letterSpacing: 0.5,
  },
  kpiCardLabelSuccess: {
    ...typography.caption,
    fontWeight: '700',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  kpiIcon: {
    fontSize: 18,
  },
  kpiValueLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: '#15803d',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  kpiCardDesc: {
    ...typography.caption,
    color: colors.gray500,
    lineHeight: 16,
  },
  requestPayoutBtn: {
    backgroundColor: '#15803d',
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
    marginTop: spacing.m,
  },
  requestPayoutBtnText: {
    ...typography.button,
    color: colors.white,
    fontWeight: '700',
  },
  pillBox: {
    marginTop: spacing.s,
    alignItems: 'flex-start',
  },

  // Secondary Strip
  secondaryStripCard: {
    padding: spacing.m,
    marginBottom: spacing.l,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  secondaryVal: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  secondaryLbl: {
    ...typography.caption,
    fontSize: 10,
    color: colors.gray500,
    marginTop: 2,
    textAlign: 'center',
  },
  stripDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.gray200,
  },
  stripNoticeRow: {
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: 8,
    marginTop: 10,
  },
  stripNoticeText: {
    ...typography.caption,
    color: colors.teal,
    textAlign: 'center',
    fontSize: 11,
  },

  // Sections
  sectionWrap: {
    marginBottom: spacing.l,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.ink,
  },
  addAccountBtn: {
    backgroundColor: colors.tealMist,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  addAccountBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.teal,
  },

  // Pending Clearance
  pendingCard: {
    padding: spacing.m,
  },
  pendingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  pendingTicket: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
  },
  pendingDate: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 11,
  },
  pendingUnlock: {
    ...typography.caption,
    color: colors.sun,
    fontSize: 11,
    fontWeight: '600',
  },
  pendingAmount: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },

  // Bank Accounts
  emptyBankCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyBankTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
  emptyBankSub: {
    ...typography.bodySmall,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: 4,
  },
  bankAccountCard: {
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  bankAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  bankName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  bankHolder: {
    ...typography.caption,
    color: colors.gray600,
  },
  bankNumber: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 11,
  },
  bankActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.s,
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  bankActionBtn: {
    marginRight: spacing.l,
  },
  bankActionBtnText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.teal,
  },
  bankDeleteBtn: {},
  bankDeleteBtnText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },

  // History Tabs
  historyTabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: radii.m,
    padding: 3,
    marginBottom: spacing.m,
  },
  historyTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.m,
  },
  historyTabActive: {
    backgroundColor: colors.white,
    ...shadows.soft,
  },
  historyTabText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.gray600,
  },
  historyTabTextActive: {
    color: colors.teal,
    fontWeight: '700',
  },
  historyCard: {
    padding: spacing.m,
  },
  emptyHistoryBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyHistoryText: {
    ...typography.bodySmall,
    color: colors.gray500,
    textAlign: 'center',
  },

  // Ledger items
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  txTicketRef: {
    ...typography.caption,
    fontSize: 10,
    color: colors.gray500,
    marginLeft: 6,
    fontWeight: '600',
  },
  txNote: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.ink,
    marginTop: 2,
  },
  txDate: {
    ...typography.caption,
    color: colors.gray400,
    fontSize: 10,
    marginTop: 2,
  },
  txAmount: {
    ...typography.bodyMedium,
    fontWeight: '700',
  },
  txCredit: {
    color: colors.success,
  },
  txDebit: {
    color: colors.ink,
  },
  txDivider: {
    height: 1,
    backgroundColor: colors.gray100,
    marginVertical: 4,
  },
  loadMoreBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  loadMoreBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.teal,
  },

  // Withdrawals items
  wdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  wdDate: {
    ...typography.caption,
    fontSize: 11,
    color: colors.gray500,
  },
  wdBank: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.ink,
  },
  wdAdminNote: {
    ...typography.caption,
    color: colors.gray500,
    fontStyle: 'italic',
    fontSize: 11,
    marginTop: 2,
  },
  wdAmount: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.l,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: radii.l,
    padding: spacing.xl,
    ...shadows.modal,
  },
  modalCardDark: {
    backgroundColor: '#0a1e23',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.ink,
  },
  modalCloseText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray400,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.gray500,
    marginBottom: spacing.m,
    lineHeight: 16,
  },
  modalAvailBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: spacing.m,
    borderRadius: radii.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: 'rgba(21, 128, 61, 0.2)',
  },
  modalAvailLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: '#15803d',
  },
  modalAvailValue: {
    ...typography.bodyLarge,
    fontWeight: '800',
    color: '#15803d',
  },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.white,
    marginBottom: spacing.m,
  },
  inputDark: {
    backgroundColor: '#11292f',
    borderColor: 'rgba(255,255,255,0.15)',
    color: colors.white,
  },

  // Bank selector in modal
  bankSelectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.m,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: spacing.s,
    backgroundColor: colors.gray50,
  },
  bankSelectOptionActive: {
    borderColor: colors.teal,
    backgroundColor: colors.tealMist,
  },
  bankSelectName: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.ink,
  },
  bankSelectSub: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 11,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.gray400,
    marginRight: spacing.m,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: colors.teal,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal,
  },
  noBankNotice: {
    backgroundColor: '#fef3c7',
    padding: spacing.m,
    borderRadius: radii.m,
    marginVertical: spacing.s,
  },
  noBankNoticeText: {
    ...typography.caption,
    color: '#92400e',
    fontWeight: '600',
  },
  addInlineBtn: {
    marginTop: 8,
  },
  addInlineBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.teal,
    textDecorationLine: 'underline',
  },
});
