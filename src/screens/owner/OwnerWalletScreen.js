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
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';
import BottomSheet from '../../components/common/BottomSheet';

export default function OwnerWalletScreen({ navigation }) {
  const { isDark } = useTheme();
  const [wallet, setWallet] = useState(null);
  const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('SBI - A/C No. ...5821');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await api.getOwnerWallet();
      setWallet(data || {});
    } catch (e) {
      console.warn('Error fetching owner wallet:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }
    try {
      await api.requestOwnerWithdrawal(amt);
      Alert.alert(
        'Payout Request Submitted',
        `₹${amt} payout requested to ${bankAccount}. Funds will be transferred via RazorpayX payout directly to your bank account within 24 hours.`,
        [{ text: 'OK', onPress: () => {
          setShowWithdrawSheet(false);
          loadData();
        }}]
      );
    } catch (err) {
      Alert.alert('Withdrawal Failed', err.message || 'Unable to submit payout request.');
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header title="Fleet Earnings & Wallet" subtitle="Direct bank payouts & commission ledger" />

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
        {/* Earnings Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>AVAILABLE FOR WITHDRAWAL</Text>
          <Text style={styles.balanceValue}>₹{wallet?.availableBalance?.toLocaleString('en-IN') || '12,400'}</Text>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCol}>
              <Text style={styles.kpiVal}>₹{wallet?.dueCommissions || '680'}</Text>
              <Text style={styles.kpiLbl}>Due Commission (Cash)</Text>
            </View>

            <View style={styles.kpiDivider} />

            <View style={styles.kpiCol}>
              <Text style={styles.kpiVal}>₹{wallet?.pendingWithdrawals || '5,000'}</Text>
              <Text style={styles.kpiLbl}>Processing Payouts</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.withdrawBtn}
            onPress={() => setShowWithdrawSheet(true)}
          >
            <Text style={styles.withdrawBtnText}>Request Bank Withdrawal ↗</Text>
          </TouchableOpacity>
        </View>

        {/* Due Commission Notice Box */}
        <Card style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>ℹ️ Cash on Ghat Commission Auto-Settlement</Text>
          <Text style={styles.noticeDesc}>
            For walk-in bookings where cash was handed to you on the ghat, JalRide platform commission is marked as due (₹{wallet?.dueCommissions || '680'}) and is automatically deducted from online booking credits.
          </Text>
        </Card>

        {/* Bank Account Details */}
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Linked Bank Account</Text>
        <Card style={styles.bankCard}>
          <View style={styles.bankRow}>
            <View style={styles.bankIcon}>
              <Text style={{ fontSize: 22 }}>🏦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bankName, isDark && styles.textLight]}>State Bank of India (Varanasi Branch)</Text>
              <Text style={styles.bankNumber}>A/C: **********5821 • IFSC: SBIN0001234</Text>
            </View>
            <Badge label="Primary" variant="success" size="small" />
          </View>
        </Card>

        {/* Recent Ledger Entries */}
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Recent Settlements</Text>
        <Card style={styles.ledgerCard}>
          <View style={styles.ledgerItem}>
            <View>
              <Text style={styles.ledgerTitle}>Maa Ganga Bajra (Booking #JAL-B7829A)</Text>
              <Text style={styles.ledgerDate}>16 Nov 2026, 09:30 AM</Text>
            </View>
            <Text style={styles.ledgerPositive}>+₹825</Text>
          </View>

          <View style={styles.ledgerDivider} />

          <View style={styles.ledgerItem}>
            <View>
              <Text style={styles.ledgerTitle}>Bank Withdrawal (NEFT Ref #TX8812)</Text>
              <Text style={styles.ledgerDate}>12 Nov 2026, 02:15 PM</Text>
            </View>
            <Text style={styles.ledgerNegative}>−₹5,000</Text>
          </View>

          <View style={styles.ledgerDivider} />

          <View style={styles.ledgerItem}>
            <View>
              <Text style={styles.ledgerTitle}>Cash Booking Commission Deduction</Text>
              <Text style={styles.ledgerDate}>10 Nov 2026, 06:45 PM</Text>
            </View>
            <Text style={styles.ledgerNegative}>−₹75</Text>
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Withdrawal Bottom Sheet */}
      <BottomSheet
        visible={showWithdrawSheet}
        onClose={() => setShowWithdrawSheet(false)}
        title="Withdraw Fleet Earnings"
        subtitle="Direct RazorpayX payout to your linked bank account"
        height={380}
      >
        <Text style={styles.sheetLabel}>Enter Withdrawal Amount (₹)</Text>
        <TextInput
          style={styles.sheetInput}
          keyboardType="numeric"
          value={withdrawAmount}
          onChangeText={setWithdrawAmount}
          placeholder="e.g. 5000"
        />

        <Text style={[styles.sheetLabel, { marginTop: spacing.m }]}>Payout Destination</Text>
        <View style={styles.destBox}>
          <Text style={styles.destText}>🏦 State Bank of India (...5821)</Text>
        </View>

        <Button
          title="Confirm & Request Payout"
          onPress={handleWithdraw}
          style={{ marginTop: spacing.xl }}
        />
      </BottomSheet>
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
  balanceCard: {
    backgroundColor: colors.deep,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.l,
    ...shadows.lift,
  },
  balanceLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.white,
    marginVertical: spacing.s,
  },
  kpiRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.m,
    padding: spacing.m,
    marginVertical: spacing.m,
  },
  kpiCol: {
    flex: 1,
    alignItems: 'center',
  },
  kpiVal: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.sun,
  },
  kpiLbl: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  kpiDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  withdrawBtn: {
    backgroundColor: colors.sun,
    paddingVertical: 12,
    borderRadius: radii.m,
    alignItems: 'center',
    marginTop: spacing.s,
  },
  withdrawBtnText: {
    ...typography.button,
    color: colors.ink,
  },
  noticeCard: {
    backgroundColor: colors.tealMist,
    padding: spacing.l,
    marginBottom: spacing.xl,
  },
  noticeTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  noticeDesc: {
    ...typography.bodySmall,
    color: colors.deep,
    lineHeight: 18,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: spacing.m,
  },
  bankCard: {
    padding: spacing.l,
    marginBottom: spacing.xl,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  bankNumber: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  ledgerCard: {
    padding: spacing.l,
  },
  ledgerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  ledgerTitle: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.ink,
  },
  ledgerDate: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  ledgerPositive: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.success,
  },
  ledgerNegative: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
  ledgerDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.m,
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
    fontWeight: '700',
    color: colors.ink,
  },
  destBox: {
    backgroundColor: colors.gray100,
    padding: spacing.m,
    borderRadius: radii.m,
  },
  destText: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.ink,
  },
});
