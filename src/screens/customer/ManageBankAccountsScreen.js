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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

export default function ManageBankAccountsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Add Bank Account Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [holderName, setHolderName] = useState(user?.name || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const isFetchingRef = useRef(false);

  const loadBankAccounts = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!isSilent) setLoading(true);
    try {
      const data = await api.getCustomerBankAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Failed loading bank accounts:', e);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBankAccounts(true);
    }, [loadBankAccounts])
  );

  useEffect(() => {
    loadBankAccounts();
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadBankAccounts(true);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [loadBankAccounts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBankAccounts(false);
  };

  const handleSetPrimary = async (accountId) => {
    setActionLoadingId(accountId);
    try {
      const res = await api.setPrimaryCustomerBankAccount(accountId);
      if (res && res.success) {
        Alert.alert('Primary Account Updated', 'This bank account is now your default payout account.');
        await loadBankAccounts();
      } else {
        throw new Error(res?.message || 'Could not update primary account.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to set account as primary.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteAccount = (account) => {
    Alert.alert(
      'Remove Bank Account',
      `Are you sure you want to remove account ending in ${account.accountNumberLast4 || account.accountNumber?.slice(-4)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(account._id);
            try {
              const res = await api.deleteCustomerBankAccount(account._id);
              if (res && res.success) {
                Alert.alert('Account Removed', 'Bank account successfully removed.');
                await loadBankAccounts();
              } else {
                throw new Error(res?.message || 'Failed to remove bank account.');
              }
            } catch (err) {
              if (err.status === 409 || (err.message && err.message.includes('pending withdrawal'))) {
                Alert.alert(
                  'Cannot Remove Account',
                  'This bank account has a pending withdrawal request against it. Please wait until the withdrawal is completed or rejected before removing it.'
                );
              } else {
                Alert.alert('Error', err.message || 'Unable to remove account.');
              }
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleAddAccount = async () => {
    setFormError('');
    const cleanHolder = holderName.trim();
    const cleanAcc = accountNumber.trim().replace(/\s+/g, '');
    const cleanConfirm = confirmAccountNumber.trim().replace(/\s+/g, '');
    const cleanIfsc = ifscCode.trim().toUpperCase().replace(/\s+/g, '');
    const cleanBank = bankName.trim();

    if (!cleanHolder || cleanHolder.length < 2) {
      setFormError('Please enter the full account holder name.');
      return;
    }

    if (!cleanAcc || !/^\d{9,18}$/.test(cleanAcc)) {
      setFormError('Account number must be between 9 and 18 digits.');
      return;
    }

    if (cleanAcc !== cleanConfirm) {
      setFormError('Account numbers do not match.');
      return;
    }

    // Standard Indian IFSC regex: 4 letters, 0, 6 alphanumeric characters
    if (!cleanIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      setFormError('Please enter a valid 11-character Indian IFSC code (e.g. SBIN0001234).');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        accountHolderName: cleanHolder,
        accountNumber: cleanAcc,
        ifscCode: cleanIfsc,
        bankName: cleanBank || deriveBankName(cleanIfsc),
      };

      const res = await api.addCustomerBankAccount(payload);
      if (res && res.success) {
        Alert.alert('Bank Account Added', 'Your bank account has been verified and saved for withdrawals.');
        setShowAddModal(false);
        setAccountNumber('');
        setConfirmAccountNumber('');
        setIfscCode('');
        setBankName('');
        await loadBankAccounts();
      } else {
        throw new Error(res?.message || 'Failed to add bank account.');
      }
    } catch (err) {
      setFormError(err.message || 'Unable to add bank account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to suggest bank name from IFSC prefix
  const deriveBankName = (ifsc) => {
    const prefix = ifsc.slice(0, 4);
    const bankMap = {
      SBIN: 'State Bank of India',
      HDFC: 'HDFC Bank',
      ICIC: 'ICICI Bank',
      PUNB: 'Punjab National Bank',
      BARB: 'Bank of Baroda',
      UTIB: 'Axis Bank',
      KKBK: 'Kotak Mahindra Bank',
      UBIN: 'Union Bank of India',
      CNRB: 'Canara Bank',
      IOBA: 'Indian Overseas Bank',
      IDIB: 'Indian Bank',
      CBIN: 'Central Bank of India',
    };
    return bankMap[prefix] || 'Indian Bank';
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Saved Bank Accounts"
        subtitle="Manage accounts for wallet payout withdrawals"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.addNavBtn}
            onPress={() => {
              setFormError('');
              setShowAddModal(true);
            }}
          >
            <Text style={styles.addNavBtnText}>+ Add</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 60 + insets.bottom }]}
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
        {/* Account Privacy & Masked Storage Info Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>🛡️ Account Privacy & Masked Storage</Text>
          <Text style={styles.infoText}>
            For security, full bank account numbers are never exposed in normal app queries or returned in profile responses. Only your masked account number (last 4 digits) and IFSC code are displayed for payout verification.
          </Text>
        </Card>

        {/* Account List */}
        {loading ? (
          <View style={{ gap: spacing.m, marginTop: spacing.m }}>
            <LoadingSkeleton height={140} borderRadius={radii.m} />
            <LoadingSkeleton height={140} borderRadius={radii.m} />
          </View>
        ) : accounts.length === 0 ? (
          <EmptyState
            icon="🏦"
            title="No Bank Accounts Linked"
            message="You have not added any bank accounts yet. Link an account to enable instant withdrawals from your JalRide refund balance."
            actionTitle="+ Link Bank Account"
            onAction={() => {
              setFormError('');
              setShowAddModal(true);
            }}
          />
        ) : (
          <View style={styles.accountsList}>
            {accounts.map((acc) => {
              const last4 = acc.accountNumberLast4 || (acc.accountNumber ? acc.accountNumber.slice(-4) : '••••');
              const isAccountActionBusy = actionLoadingId === acc._id;

              return (
                <Card key={acc._id} style={[styles.accountCard, acc.isPrimary && styles.accountCardPrimary]}>
                  {/* Top Bar: Bank Name & Primary Badge */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.bankHeaderCol}>
                      <Text style={styles.bankIcon}>🏛️</Text>
                      <View>
                        <Text style={[styles.bankName, isDark && styles.textLight]}>
                          {acc.bankName || 'Verified Bank Account'}
                        </Text>
                        <Text style={styles.holderName}>{acc.accountHolderName}</Text>
                      </View>
                    </View>

                    {acc.isPrimary ? (
                      <Badge label="★ Primary Payout" variant="success" size="small" />
                    ) : (
                      <Badge label="Secondary" variant="default" size="small" />
                    )}
                  </View>

                  {/* Masked Account Details */}
                  <View style={styles.maskedNumberRow}>
                    <Text style={[styles.maskedNumber, isDark && styles.textLight]}>
                      •••• •••• •••• {last4}
                    </Text>
                  </View>

                  <View style={styles.ifscRow}>
                    <Text style={styles.ifscLabel}>IFSC:</Text>
                    <Text style={styles.ifscValue}>{acc.ifscCode}</Text>
                  </View>

                  {/* Card Bottom Actions */}
                  <View style={styles.cardActionsRow}>
                    {!acc.isPrimary ? (
                      <TouchableOpacity
                        style={styles.setPrimaryBtn}
                        disabled={isAccountActionBusy}
                        onPress={() => handleSetPrimary(acc._id)}
                      >
                        {isAccountActionBusy ? (
                          <ActivityIndicator size="small" color={colors.teal} />
                        ) : (
                          <Text style={styles.setPrimaryBtnText}>Make Primary</Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      disabled={isAccountActionBusy}
                      onPress={() => handleDeleteAccount(acc)}
                    >
                      <Text style={styles.deleteBtnText}>Remove ✕</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}

            {/* Link Another Account Button */}
            <Button
              title="+ Link Another Bank Account"
              variant="outline"
              onPress={() => {
                setFormError('');
                setShowAddModal(true);
              }}
              style={{ marginTop: spacing.m }}
            />
          </View>
        )}
      </ScrollView>

      {/* Add Bank Account Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isSubmitting && setShowAddModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.textLight]}>
                Add Bank Account
              </Text>
              <TouchableOpacity
                disabled={isSubmitting}
                onPress={() => setShowAddModal(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {formError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {formError}</Text>
                </View>
              ) : null}

              {/* Account Holder Name */}
              <Text style={[styles.inputLabel, isDark && styles.textLight]}>
                Account Holder Name <Text style={styles.reqStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.inputField, isDark && styles.inputFieldDark]}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={colors.gray400}
                value={holderName}
                onChangeText={(t) => {
                  setHolderName(t);
                  if (formError) setFormError('');
                }}
              />

              {/* Account Number */}
              <Text style={[styles.inputLabel, isDark && styles.textLight]}>
                Bank Account Number <Text style={styles.reqStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.inputField, isDark && styles.inputFieldDark]}
                placeholder="e.g. 10293847561"
                placeholderTextColor={colors.gray400}
                keyboardType="number-pad"
                secureTextEntry={false}
                value={accountNumber}
                onChangeText={(t) => {
                  setAccountNumber(t);
                  if (formError) setFormError('');
                }}
              />

              {/* Confirm Account Number */}
              <Text style={[styles.inputLabel, isDark && styles.textLight]}>
                Confirm Account Number <Text style={styles.reqStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.inputField, isDark && styles.inputFieldDark]}
                placeholder="Re-enter account number"
                placeholderTextColor={colors.gray400}
                keyboardType="number-pad"
                value={confirmAccountNumber}
                onChangeText={(t) => {
                  setConfirmAccountNumber(t);
                  if (formError) setFormError('');
                }}
              />

              {/* IFSC Code */}
              <Text style={[styles.inputLabel, isDark && styles.textLight]}>
                IFSC Code (11 characters) <Text style={styles.reqStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.inputField, isDark && styles.inputFieldDark]}
                placeholder="e.g. SBIN0001234"
                placeholderTextColor={colors.gray400}
                autoCapitalize="characters"
                maxLength={11}
                value={ifscCode}
                onChangeText={(t) => {
                  const upper = t.toUpperCase();
                  setIfscCode(upper);
                  if (!bankName && upper.length >= 4) {
                    setBankName(deriveBankName(upper));
                  }
                  if (formError) setFormError('');
                }}
              />

              {/* Bank Name */}
              <Text style={[styles.inputLabel, isDark && styles.textLight]}>
                Bank Name (Optional)
              </Text>
              <TextInput
                style={[styles.inputField, isDark && styles.inputFieldDark]}
                placeholder="e.g. State Bank of India"
                placeholderTextColor={colors.gray400}
                value={bankName}
                onChangeText={setBankName}
              />

              <View style={styles.noticeRow}>
                <Text style={styles.noticeText}>
                  ℹ️ Name must match your official bank account records. First account added is automatically marked as primary.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title={isSubmitting ? 'Verifying Account...' : 'Save Bank Account →'}
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
                onPress={handleAddAccount}
                style={{ width: '100%' }}
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
    backgroundColor: colors.canvasDark,
  },
  scroll: {
    padding: spacing.l,
    flexGrow: 1,
  },
  addNavBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.tealMist,
  },
  addNavBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.teal,
  },
  infoCard: {
    backgroundColor: '#eff9fa',
    borderLeftWidth: 4,
    borderLeftColor: colors.teal,
    marginBottom: spacing.l,
  },
  infoTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.teal,
    marginBottom: 4,
  },
  infoText: {
    ...typography.caption,
    color: colors.gray600,
    lineHeight: 18,
  },
  accountsList: {
    gap: spacing.m,
  },
  accountCard: {
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.line,
  },
  accountCardPrimary: {
    borderColor: colors.teal,
    borderWidth: 1.5,
    backgroundColor: '#fafefe',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.m,
  },
  bankHeaderCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankIcon: {
    fontSize: 24,
  },
  bankName: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
  holderName: {
    ...typography.caption,
    color: colors.gray500,
  },
  maskedNumberRow: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.s,
    marginBottom: spacing.s,
  },
  maskedNumber: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.ink,
  },
  ifscRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.m,
  },
  ifscLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.gray500,
  },
  ifscValue: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.teal,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.s,
  },
  setPrimaryBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  setPrimaryBtnText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '700',
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  deleteBtnText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.l,
    ...shadows.strong,
  },
  modalCardDark: {
    backgroundColor: '#0d2227',
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
    borderRadius: radii.full,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.ink,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    padding: spacing.s,
    borderRadius: radii.s,
    marginBottom: spacing.m,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  inputLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
    marginTop: 8,
  },
  reqStar: {
    color: colors.danger,
  },
  inputField: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  inputFieldDark: {
    backgroundColor: '#162f36',
    borderColor: 'rgba(255,255,255,0.1)',
    color: colors.white,
  },
  noticeRow: {
    backgroundColor: colors.mist,
    padding: spacing.s,
    borderRadius: radii.s,
    marginTop: spacing.m,
  },
  noticeText: {
    ...typography.caption,
    color: colors.gray600,
    lineHeight: 16,
  },
  modalFooter: {
    marginTop: spacing.m,
    paddingTop: spacing.s,
  },
  textLight: {
    color: colors.white,
  },
});
