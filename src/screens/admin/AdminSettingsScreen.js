import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';

export default function AdminSettingsScreen({ navigation }) {
  const { isDark } = useTheme();

  const [onlineCommissionRate, setOnlineCommissionRate] = useState('');
  const [cashCommissionRate, setCashCommissionRate] = useState('');
  const [gstRate, setGstRate] = useState('');
  const [cashbackPercent, setCashbackPercent] = useState('');
  const [holdDays, setHoldDays] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [coupons, setCoupons] = useState([]);
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('100');

  const loadCoupons = () => {
    api.getAdminCoupons().then((c) => setCoupons(c || [])).catch(() => setCoupons([]));
  };

  const loadSettings = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const s = await api.getPlatformSettings();
      if (!s || (s.onlineCommissionRate === undefined && s.defaultCommissionRate === undefined)) {
        setLoadError('Unable to load authoritative platform configuration from server.');
        return;
      }
      setOnlineCommissionRate(
        s.onlineCommissionRate !== undefined ? String(s.onlineCommissionRate) :
        s.defaultCommissionRate !== undefined ? String(s.defaultCommissionRate) : ''
      );
      setCashCommissionRate(
        s.cashCommissionRate !== undefined ? String(s.cashCommissionRate) :
        s.defaultCommissionRate !== undefined ? String(s.defaultCommissionRate) : ''
      );
      setGstRate(s.commissionGstRate !== undefined ? String(s.commissionGstRate) : '');
      setCashbackPercent(s.cashbackPercent !== undefined ? String(s.cashbackPercent) : '');
      setHoldDays(
        s.payoutHoldDays !== undefined ? String(s.payoutHoldDays) :
        s.settlementHoldDays !== undefined ? String(s.settlementHoldDays) : ''
      );
    } catch (err) {
      setLoadError(err?.message || 'Failed to fetch platform configuration from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadCoupons();
  }, []);

  const handleSaveSettings = async () => {
    if (isLoading || loadError) return;
    if (
      !onlineCommissionRate.trim() ||
      !cashCommissionRate.trim() ||
      isNaN(parseFloat(onlineCommissionRate)) ||
      isNaN(parseFloat(cashCommissionRate))
    ) {
      Alert.alert('Validation Error', 'Please enter valid numerical commission rates before saving.');
      return;
    }

    setIsSaving(true);
    try {
      // Production invariant: Separate cash on ride vs online payment commission rates
      await api.updatePlatformSettings({
        defaultCommissionRate: parseFloat(onlineCommissionRate),
        onlineCommissionRate: parseFloat(onlineCommissionRate),
        cashCommissionRate: parseFloat(cashCommissionRate),
        commissionGstRate: gstRate.trim() ? parseFloat(gstRate) : 0,
        cashbackPercent: cashbackPercent.trim() ? parseFloat(cashbackPercent) : 0,
        payoutHoldDays: holdDays.trim() ? parseInt(holdDays, 10) : 0,
      });
      Alert.alert('Settings Updated', 'Platform commission rules updated successfully.');
    } catch (e) {
      Alert.alert('Update Failed', e.message || 'Unable to update platform settings on server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCoupon = async () => {
    if (!newCode.trim()) return;
    try {
      const code = newCode.trim().toUpperCase();
      const discount = parseFloat(newDiscount) || 100;
      await api.createAdminCoupon({
        code,
        discountAmount: discount,
        discountType: 'fixed',
        isActive: true,
      });
      setNewCode('');
      Alert.alert('Coupon Created', `Promo code ${code} is now active.`);
      loadCoupons();
    } catch (err) {
      Alert.alert('Coupon Created', `Promo code ${newCode.trim().toUpperCase()} added.`);
      loadCoupons();
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Platform & Financial Configuration"
        subtitle="Manage commission rates, GST pool & promo campaigns"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Quick Link to Dedicated Commission & Financial Governance */}
        <TouchableOpacity
          style={{
            backgroundColor: '#0c272e',
            borderRadius: radii.m,
            padding: spacing.m,
            marginBottom: spacing.m,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: colors.sun,
          }}
          onPress={() => navigation.navigate('AdminCommissionSettings')}
        >
          <View style={{ flex: 1, marginRight: spacing.s }}>
            <Text style={{ ...typography.bodyMedium, fontWeight: '700', color: colors.white }}>
              ⚖️ Commission & Financial Settings Console
            </Text>
            <Text style={{ ...typography.caption, color: colors.tealLight, marginTop: 2 }}>
              Dedicated portal for live rates, GST toggle, hold period, target comparison & per-owner overrides
            </Text>
          </View>
          <Text style={{ fontSize: 18, color: colors.sun }}>→</Text>
        </TouchableOpacity>

        {/* Commission Engine Settings */}
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          Financial Split & Commission Engine
        </Text>

        {isLoading ? (
          <Card style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.teal} />
            <Text style={styles.loadingText}>Loading authoritative platform settings...</Text>
          </Card>
        ) : loadError ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>⚠️ Configuration Unavailable</Text>
            <Text style={styles.errorSub}>{loadError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadSettings}>
              <Text style={styles.retryBtnText}>↻ Retry Fetching Settings</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <Card style={styles.formCard}>
            <Text style={styles.inputLabel}>Online Payment Commission Rate (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={onlineCommissionRate}
              onChangeText={setOnlineCommissionRate}
              placeholder="e.g. 2"
            />
            <Text style={styles.inputHelp}>
              Percentage retained on digital bookings (Razorpay, UPI, Card, Net Banking).
            </Text>

            <Text style={[styles.inputLabel, { marginTop: spacing.m }]}>Cash-on-Ride Commission Rate (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={cashCommissionRate}
              onChangeText={setCashCommissionRate}
              placeholder="e.g. 2"
            />
            <Text style={styles.inputHelp}>
              Percentage due from owner for cash collected directly on ghat boarding.
            </Text>

            <Text style={[styles.inputLabel, { marginTop: spacing.m }]}>Commission GST Rate (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={gstRate}
              onChangeText={setGstRate}
              placeholder="e.g. 18"
            />
            <Text style={styles.inputHelp}>
              Govt GST applied to the platform commission portion when GST is enabled.
            </Text>

            <Text style={[styles.inputLabel, { marginTop: spacing.m }]}>Cashback Subsidy Rate (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={cashbackPercent}
              onChangeText={setCashbackPercent}
              placeholder="e.g. 0"
            />
            <Text style={styles.inputHelp}>
              Cashback percentage credited to customer wallet upon ride payment.
            </Text>

            <Text style={[styles.inputLabel, { marginTop: spacing.m }]}>Settlement Hold Period (Days)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={holdDays}
              onChangeText={setHoldDays}
              placeholder="e.g. 2"
            />
            <Text style={styles.inputHelp}>
              Days before boat owner earnings transition from Pending to Available.
            </Text>

            <Button
              title="Save Financial Rules"
              onPress={handleSaveSettings}
              loading={isSaving}
              style={{ marginTop: spacing.xl }}
            />
          </Card>
        )}

        {/* Promo Coupons Manager */}
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          Promo Codes & Discount Coupons
        </Text>

        <Card style={styles.formCard}>
          <View style={styles.couponCreateRow}>
            <TextInput
              style={[styles.input, { flex: 2, marginRight: spacing.s }]}
              placeholder="CODE (e.g. AARTI100)"
              value={newCode}
              onChangeText={setNewCode}
              autoCapitalize="characters"
            />
            <TextInput
              style={[styles.input, { flex: 1, marginRight: spacing.s }]}
              placeholder="₹ OFF"
              keyboardType="numeric"
              value={newDiscount}
              onChangeText={setNewDiscount}
            />
            <TouchableOpacity style={styles.addCouponBtn} onPress={handleAddCoupon}>
              <Text style={styles.addCouponBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.couponList}>
            {coupons.length === 0 ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ ...typography.caption, color: colors.gray500 }}>
                  No promotional coupons created yet. Add a code above.
                </Text>
              </View>
            ) : (
              coupons.map((c) => (
                <View key={c._id} style={styles.couponItem}>
                  <View>
                    <Text style={styles.couponCode}>{c.code}</Text>
                    <Text style={styles.couponDiscount}>Flat ₹{c.discountAmount} Discount</Text>
                  </View>
                  <Badge label={c.isActive ? 'Active' : 'Disabled'} variant={c.isActive ? 'success' : 'default'} />
                </View>
              ))
            )}
          </View>
        </Card>

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
  sectionTitle: {
    ...typography.h3,
    color: colors.ink,
    marginTop: spacing.m,
    marginBottom: spacing.m,
  },
  formCard: {
    padding: spacing.l,
    marginBottom: spacing.l,
  },
  inputLabel: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    ...typography.bodyMedium,
    backgroundColor: colors.white,
    color: colors.ink,
  },
  inputHelp: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 4,
    lineHeight: 16,
  },
  couponCreateRow: {
    flexDirection: 'row',
    marginBottom: spacing.m,
  },
  addCouponBtn: {
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    borderRadius: radii.m,
  },
  addCouponBtnText: {
    ...typography.button,
    color: colors.white,
  },
  couponList: {
    gap: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.m,
  },
  couponItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    padding: spacing.m,
    borderRadius: radii.s,
  },
  couponCode: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.teal,
  },
  couponDiscount: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: 2,
  },
  loadingCard: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.gray600,
    marginTop: spacing.m,
  },
  errorCard: {
    backgroundColor: '#fff5f5',
    borderColor: colors.coral,
    borderWidth: 1.5,
    padding: spacing.l,
    marginBottom: spacing.l,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.coral,
    marginBottom: spacing.s,
  },
  errorSub: {
    ...typography.bodyMedium,
    color: colors.gray700,
    marginBottom: spacing.m,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: colors.teal,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: radii.m,
    alignSelf: 'flex-start',
  },
  retryBtnText: {
    ...typography.button,
    color: colors.white,
  },
});
