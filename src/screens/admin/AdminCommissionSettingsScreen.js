// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
  Modal,
  ActivityIndicator,
  AppState,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';

// Owner Target Policy Benchmarks (For Governance Reference Only)
const TARGET_POLICY = {
  onlineCommissionRate: 12,
  cashCommissionRate: 10,
  defaultCommissionRate: 12, // Proposed commercial default
  commissionGstEnabled: false,
  commissionGstRate: 0,
  minWithdrawAmount: 1000,
  payoutHoldDays: 2,
};

export default function AdminCommissionSettingsScreen({ navigation }) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  // Access Control: Authorize Super Admin only
  const isSuperAdmin =
    user?.role === 'admin' ||
    (user?.email && user.email.toLowerCase().trim() === 'prepwave.pushpendra@gmail.com');

  // Form State (Initialized empty to ensure authoritative backend hydration)
  const [onlineRate, setOnlineRate] = useState('');
  const [cashRate, setCashRate] = useState('');
  const [defaultRate, setDefaultRate] = useState('');
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState('');
  const [minWithdraw, setMinWithdraw] = useState('');
  const [holdDays, setHoldDays] = useState('');
  const [cashbackPercent, setCashbackPercent] = useState('');
  const [subPurchasesEnabled, setSubPurchasesEnabled] = useState(false);
  const [subPlans, setSubPlans] = useState(null);

  // Original authoritative settings snapshot from backend
  const [loadedSettings, setLoadedSettings] = useState(null);

  // Loading & Metadata
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  // Save Confirmation Dialog State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  // Owner Overrides Section State
  const [owners, setOwners] = useState([]);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerOverrideRate, setOwnerOverrideRate] = useState('');
  const [isSavingOwnerRate, setIsSavingOwnerRate] = useState(false);

  // Guard against concurrent fetches
  const isFetchingRef = useRef(false);

  // Authoritative Data Loader
  const loadData = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!isSilent) {
      setIsLoading(true);
      setLoadError(null);
    }

    try {
      const [settingsRes, ownersRes] = await Promise.all([
        api.getPlatformSettings(),
        api.getAdminUsers('owner', 1, 100).catch(() => []),
      ]);

      if (!settingsRes || (settingsRes.onlineCommissionRate === undefined && settingsRes.defaultCommissionRate === undefined)) {
        if (!isSilent || !loadedSettings) {
          setLoadError('Authoritative platform settings could not be retrieved from the backend API.');
        }
        return;
      }

      setLoadedSettings(settingsRes);

      // Hydrate form inputs with exact server values (never fabricated defaults)
      setOnlineRate(
        settingsRes.onlineCommissionRate !== undefined
          ? String(settingsRes.onlineCommissionRate)
          : settingsRes.defaultCommissionRate !== undefined
          ? String(settingsRes.defaultCommissionRate)
          : ''
      );

      setCashRate(
        settingsRes.cashCommissionRate !== undefined
          ? String(settingsRes.cashCommissionRate)
          : settingsRes.defaultCommissionRate !== undefined
          ? String(settingsRes.defaultCommissionRate)
          : ''
      );

      setDefaultRate(
        settingsRes.defaultCommissionRate !== undefined
          ? String(settingsRes.defaultCommissionRate)
          : ''
      );

      setGstEnabled(Boolean(settingsRes.commissionGstEnabled));
      setGstRate(
        settingsRes.commissionGstRate !== undefined ? String(settingsRes.commissionGstRate) : ''
      );

      setMinWithdraw(
        settingsRes.minWithdrawAmount !== undefined ? String(settingsRes.minWithdrawAmount) : ''
      );

      setHoldDays(
        settingsRes.payoutHoldDays !== undefined
          ? String(settingsRes.payoutHoldDays)
          : settingsRes.settlementHoldDays !== undefined
          ? String(settingsRes.settlementHoldDays)
          : ''
      );

      setCashbackPercent(
        settingsRes.cashbackPercent !== undefined ? String(settingsRes.cashbackPercent) : ''
      );

      setSubPurchasesEnabled(Boolean(settingsRes.subscriptionPurchasesEnabled));
      setSubPlans(settingsRes.subscriptionPlans || null);

      if (Array.isArray(ownersRes)) {
        setOwners(ownersRes);
      }

      setLastRefreshedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setLoadError(null);
    } catch (err) {
      console.warn('[AdminCommissionSettings] Load error:', err);
      if (!isSilent || !loadedSettings) {
        setLoadError(err?.message || 'Network connection failed while reading platform settings.');
      }
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [loadedSettings]);

  // Initial and Focus Refresh
  useFocusEffect(
    useCallback(() => {
      loadData(Boolean(loadedSettings));
    }, [loadData, loadedSettings])
  );

  // App Foreground Refresh
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadData(true);
      }
    });
    return () => sub.remove();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  // Safe Save Validation & Confirmation Stage
  const handleInitiateSave = () => {
    if (isLoading || loadError) {
      Alert.alert('Cannot Save', 'Settings are not currently loaded from the authoritative backend.');
      return;
    }

    const cleanOnline = onlineRate.trim();
    const cleanCash = cashRate.trim();
    const cleanDefault = defaultRate.trim();
    const cleanGst = gstRate.trim();
    const cleanMinWithdraw = minWithdraw.trim();
    const cleanHoldDays = holdDays.trim();
    const cleanCashback = cashbackPercent.trim();

    if (!cleanOnline || isNaN(parseFloat(cleanOnline)) || parseFloat(cleanOnline) < 0 || parseFloat(cleanOnline) > 100) {
      Alert.alert('Validation Error', 'Online Payment Commission Rate must be a valid percentage between 0% and 100%.');
      return;
    }

    if (!cleanCash || isNaN(parseFloat(cleanCash)) || parseFloat(cleanCash) < 0 || parseFloat(cleanCash) > 100) {
      Alert.alert('Validation Error', 'Cash-on-Ride Commission Rate must be a valid percentage between 0% and 100%.');
      return;
    }

    if (cleanDefault && (isNaN(parseFloat(cleanDefault)) || parseFloat(cleanDefault) < 0 || parseFloat(cleanDefault) > 100)) {
      Alert.alert('Validation Error', 'Default Fallback Commission Rate must be a valid percentage between 0% and 100%.');
      return;
    }

    if (cleanGst && (isNaN(parseFloat(cleanGst)) || parseFloat(cleanGst) < 0 || parseFloat(cleanGst) > 100)) {
      Alert.alert('Validation Error', 'Commission GST Rate must be a valid percentage between 0% and 100%.');
      return;
    }

    if (!cleanMinWithdraw || isNaN(parseFloat(cleanMinWithdraw)) || parseFloat(cleanMinWithdraw) <= 0) {
      Alert.alert('Validation Error', 'Minimum Withdrawal Amount must be a positive number greater than ₹0.');
      return;
    }

    if (!cleanHoldDays || isNaN(parseInt(cleanHoldDays, 10)) || parseInt(cleanHoldDays, 10) < 0) {
      Alert.alert('Validation Error', 'Payout Hold Period must be a non-negative whole number of days.');
      return;
    }

    if (cleanCashback && (isNaN(parseFloat(cleanCashback)) || parseFloat(cleanCashback) < 0 || parseFloat(cleanCashback) > 100)) {
      Alert.alert('Validation Error', 'Cashback Subsidy Rate must be a valid percentage between 0% and 100%.');
      return;
    }

    const payload = {
      onlineCommissionRate: parseFloat(cleanOnline),
      cashCommissionRate: parseFloat(cleanCash),
      defaultCommissionRate: cleanDefault ? parseFloat(cleanDefault) : parseFloat(cleanOnline),
      commissionGstEnabled: Boolean(gstEnabled),
      commissionGstRate: cleanGst ? parseFloat(cleanGst) : 0,
      minWithdrawAmount: parseFloat(cleanMinWithdraw),
      payoutHoldDays: parseInt(cleanHoldDays, 10),
      cashbackPercent: cleanCashback ? parseFloat(cleanCashback) : 0,
      subscriptionPurchasesEnabled: Boolean(subPurchasesEnabled),
    };

    setPendingPayload(payload);
    setShowConfirmModal(true);
  };

  // Safe Save Execution Stage
  const handleExecuteSave = async () => {
    if (!pendingPayload || isSaving) return;

    setIsSaving(true);
    try {
      const res = await api.updatePlatformSettings(pendingPayload);

      if (!res || !res.success) {
        throw new Error(res?.message || 'Server did not confirm settings update.');
      }

      setShowConfirmModal(false);
      setPendingPayload(null);

      Alert.alert(
        'Policy Updated',
        'Authoritative platform commission and financial rules were saved successfully. Changes take effect on newly created bookings.',
        [{ text: 'OK', onPress: () => loadData(true) }]
      );
    } catch (err) {
      Alert.alert(
        'Update Failed',
        err?.message || 'An error occurred while communicating with the settings endpoint. Old settings preserved.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Per-Owner Override Actions
  const handleOpenOwnerModal = (owner) => {
    setSelectedOwner(owner);
    setOwnerOverrideRate(
      owner.commissionRate !== null && owner.commissionRate !== undefined
        ? String(owner.commissionRate)
        : ''
    );
    setShowOwnerModal(true);
  };

  const handleSaveOwnerOverride = async () => {
    if (!selectedOwner || isSavingOwnerRate) return;

    const trimmed = ownerOverrideRate.trim();
    let numericRate = null;

    if (trimmed !== '') {
      numericRate = parseFloat(trimmed);
      if (isNaN(numericRate) || numericRate < 0 || numericRate > 100) {
        Alert.alert('Invalid Rate', 'Please enter a valid commission rate between 0% and 100%, or leave blank to clear the override.');
        return;
      }
    }

    setIsSavingOwnerRate(true);
    try {
      const res = await api.setOwnerCommissionRate(selectedOwner._id, numericRate);
      if (!res || !res.success) {
        throw new Error(res?.message || 'Failed to update owner override.');
      }

      setShowOwnerModal(false);
      setSelectedOwner(null);
      Alert.alert(
        'Owner Override Saved',
        numericRate !== null
          ? `Owner ${selectedOwner.name || 'account'} commission set to ${numericRate}%.`
          : `Owner ${selectedOwner.name || 'account'} will now inherit platform defaults.`
      );
      loadData(true);
    } catch (err) {
      Alert.alert('Override Failed', err?.message || 'Could not update owner override.');
    } finally {
      setIsSavingOwnerRate(false);
    }
  };

  const filteredOwners = owners.filter((o) => {
    if (!ownerSearch.trim()) return true;
    const q = ownerSearch.trim().toLowerCase();
    return (
      (o.name && o.name.toLowerCase().includes(q)) ||
      (o.email && o.email.toLowerCase().includes(q))
    );
  });

  // Access Denied Screen
  if (!isSuperAdmin) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Header title="Commission & Financial Settings" onBack={() => navigation.goBack()} />
        <View style={styles.unauthorizedBox}>
          <Text style={{ fontSize: 44, marginBottom: spacing.m }}>⛔</Text>
          <Text style={[styles.unauthorizedTitle, isDark && styles.textLight]}>
            Super Admin Access Only
          </Text>
          <Text style={styles.unauthorizedSub}>
            Financial policy, platform revenue splits, and owner settlement rules are restricted exclusively to the authorized Super Administrator (prepwave.pushpendra@gmail.com).
          </Text>
          <Button
            title="Return to Console"
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.l, width: 220 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Commission & Financial Settings"
        subtitle="Authoritative platform split, GST & payout governance"
        onBack={() => navigation.goBack()}
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
        {/* Freshness & Authoritative Source Banner */}
        <View style={styles.freshnessRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.liveIndicatorDot} />
            <Text style={styles.freshnessText}>
              Authoritative Backend: {lastRefreshedAt ? `Synced at ${lastRefreshedAt}` : 'Connecting...'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => loadData(false)} disabled={isLoading}>
            <Text style={styles.refreshLinkText}>↻ Force Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* 1. GOVERNANCE BENCHMARKING & OWNER TARGET REFERENCE */}
        {/* ========================================================================= */}
        <Card style={styles.benchmarkCard}>
          <View style={styles.benchmarkHeader}>
            <View>
              <Text style={styles.benchmarkTitle}>🎯 Policy Benchmarking Reference</Text>
              <Text style={styles.benchmarkSubtitle}>
                Target financial policy specified by the platform owner
              </Text>
            </View>
            <Badge label="Owner Benchmark" variant="info" size="small" />
          </View>

          <View style={styles.benchmarkTable}>
            <View style={styles.benchmarkRow}>
              <Text style={styles.benchmarkKey}>Online Commission Target:</Text>
              <Text style={styles.benchmarkVal}>12%</Text>
              <Badge
                label={parseFloat(onlineRate) === TARGET_POLICY.onlineCommissionRate ? 'Matches (12%)' : `Live: ${onlineRate || 'N/A'}%`}
                variant={parseFloat(onlineRate) === TARGET_POLICY.onlineCommissionRate ? 'success' : 'warning'}
                size="small"
              />
            </View>

            <View style={styles.benchmarkRow}>
              <Text style={styles.benchmarkKey}>Cash Commission Target:</Text>
              <Text style={styles.benchmarkVal}>10%</Text>
              <Badge
                label={parseFloat(cashRate) === TARGET_POLICY.cashCommissionRate ? 'Matches (10%)' : `Live: ${cashRate || 'N/A'}%`}
                variant={parseFloat(cashRate) === TARGET_POLICY.cashCommissionRate ? 'success' : 'warning'}
                size="small"
              />
            </View>

            <View style={styles.benchmarkRow}>
              <Text style={styles.benchmarkKey}>Commission GST Policy:</Text>
              <Text style={styles.benchmarkVal}>Disabled (0%)</Text>
              <Badge
                label={!gstEnabled ? 'Matches (Disabled)' : 'Active (Enabled)'}
                variant={!gstEnabled ? 'success' : 'danger'}
                size="small"
              />
            </View>

            <View style={styles.benchmarkRow}>
              <Text style={styles.benchmarkKey}>Min. Withdrawal Amount:</Text>
              <Text style={styles.benchmarkVal}>₹1,000</Text>
              <Badge
                label={parseFloat(minWithdraw) === TARGET_POLICY.minWithdrawAmount ? 'Matches (₹1k)' : `Live: ₹${minWithdraw || 'N/A'}`}
                variant={parseFloat(minWithdraw) === TARGET_POLICY.minWithdrawAmount ? 'success' : 'warning'}
                size="small"
              />
            </View>
          </View>

          <Text style={styles.benchmarkNote}>
            ℹ️ The form below is loaded directly from MongoDB PlatformSettings. Changes are saved only upon explicit confirmation.
          </Text>
        </Card>

        {/* Loading or Error Cards */}
        {isLoading ? (
          <Card style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.teal} />
            <Text style={styles.loadingText}>Fetching authoritative financial settings from server...</Text>
          </Card>
        ) : loadError ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>⚠️ Configuration Unavailable</Text>
            <Text style={styles.errorSub}>{loadError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadData(false)}>
              <Text style={styles.retryBtnText}>↻ Retry Connecting</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* 2. SECTION A: PLATFORM COMMISSION POLICY */}
            {/* ========================================================================= */}
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              💳 Platform Commission Policy
            </Text>
            <Card style={styles.formCard}>
              <Text style={styles.inputLabel}>Online Payment Commission Rate (%)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={onlineRate}
                onChangeText={setOnlineRate}
                placeholder="e.g. 12"
              />
              <Text style={styles.inputHelp}>
                Retained on all digital prepaid bookings (Razorpay, UPI, Cards, Net Banking).
              </Text>

              <Text style={[styles.inputLabel, { marginTop: spacing.m }]}>Cash-on-Ride Commission Rate (%)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={cashRate}
                onChangeText={setCashRate}
                placeholder="e.g. 10"
              />
              <Text style={styles.inputHelp}>
                Commission accrued as due and deducted from boat owner wallet upon ghat cash collection.
              </Text>

              <Text style={[styles.inputLabel, { marginTop: spacing.m }]}>Default / Fallback Commission Rate (%)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={defaultRate}
                onChangeText={setDefaultRate}
                placeholder="e.g. 12"
              />
              <Text style={styles.inputHelp}>
                Fallback rate utilized when payment method default is unspecified or for general wallet display.
              </Text>
            </Card>

            {/* ========================================================================= */}
            {/* 3. SECTION B: COMMISSION GST POLICY */}
            {/* ========================================================================= */}
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              🏛️ Commission GST Tax Policy
            </Text>
            <Card style={styles.formCard}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, marginRight: spacing.m }}>
                  <Text style={styles.inputLabel}>Charge GST on Commission</Text>
                  <Text style={styles.inputHelp}>
                    B2B tax levied solely on JalRide's retained commission portion (never added to passenger fare).
                  </Text>
                </View>
                <Switch
                  value={gstEnabled}
                  onValueChange={setGstEnabled}
                  trackColor={{ false: colors.gray300, true: colors.teal }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.gstStatusBanner}>
                {gstEnabled ? (
                  <View style={styles.gstAlertRow}>
                    <Text style={{ fontSize: 16 }}>⚠️</Text>
                    <Text style={styles.gstActiveText}>
                      GST Levy Active: {gstRate || '0'}% tax will be debited from owner settlement.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.gstAlertRow}>
                    <Text style={{ fontSize: 16 }}>🟢</Text>
                    <Text style={styles.gstDisabledText}>
                      GST Calculation Disabled: ₹0 tax charged to boat owners on commission.
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.inputLabel, { marginTop: spacing.m }]}>Commission GST Rate (%)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={gstRate}
                onChangeText={setGstRate}
                placeholder="e.g. 18"
              />
              <Text style={styles.inputHelp}>
                Statutory GST percentage applied when the toggle above is active (Target: 0%).
              </Text>
            </Card>

            {/* ========================================================================= */}
            {/* 4. SECTION C: OWNER PAYOUT POLICY */}
            {/* ========================================================================= */}
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              💸 Owner Settlement & Withdrawal Policy
            </Text>
            <Card style={styles.formCard}>
              <Text style={styles.inputLabel}>Minimum Withdrawal Amount (₹)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={minWithdraw}
                onChangeText={setMinWithdraw}
                placeholder="e.g. 1000"
              />
              <Text style={styles.inputHelp}>
                Minimum accumulated wallet balance required for an owner to request a RazorpayX payout.
              </Text>

              <Text style={[styles.inputLabel, { marginTop: spacing.m }]}>Payout Hold Duration (Days)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={holdDays}
                onChangeText={setHoldDays}
                placeholder="e.g. 2"
              />
              <Text style={styles.inputHelp}>
                Settlement dispute window: Days before trip earnings move from Pending to Available.
              </Text>
            </Card>

            {/* ========================================================================= */}
            {/* 5. SECTION D: ADDITIONAL PLATFORM SETTINGS */}
            {/* ========================================================================= */}
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              ⚙️ Additional Platform Controls
            </Text>
            <Card style={styles.formCard}>
              <Text style={styles.inputLabel}>Passenger Cashback Subsidy (%)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={cashbackPercent}
                onChangeText={setCashbackPercent}
                placeholder="e.g. 0"
              />
              <Text style={styles.inputHelp}>
                Automatic loyalty wallet credit rewarded to passengers upon ride completion (0 = disabled).
              </Text>

              <View style={[styles.toggleRow, { marginTop: spacing.l }]}>
                <View style={{ flex: 1, marginRight: spacing.m }}>
                  <Text style={styles.inputLabel}>Owner Subscription Purchases Gate</Text>
                  <Text style={styles.inputHelp}>
                    Master switch for Pro/Premium plan billing. When OFF, UI shows "Coming soon".
                  </Text>
                </View>
                <Switch
                  value={subPurchasesEnabled}
                  onValueChange={setSubPurchasesEnabled}
                  trackColor={{ false: colors.gray300, true: colors.teal }}
                  thumbColor={colors.white}
                />
              </View>

              {subPlans && (
                <View style={styles.subPlansBox}>
                  <Text style={styles.subPlansTitle}>Configured Subscription Discounts:</Text>
                  <Text style={styles.subPlansItem}>
                    • Pro Plan: {subPlans.pro?.commissionDiscount ?? '2'}% platform discount (₹{subPlans.pro?.price ?? 499}/mo)
                  </Text>
                  <Text style={styles.subPlansItem}>
                    • Premium Plan: {subPlans.premium?.commissionDiscount ?? '5'}% platform discount (₹{subPlans.premium?.price ?? 1499}/mo)
                  </Text>
                </View>
              )}
            </Card>

            {/* Save Button for Platform Settings */}
            <Button
              title="Review & Save Financial Policy"
              onPress={handleInitiateSave}
              loading={isSaving}
              style={{ marginVertical: spacing.l }}
            />

            {/* ========================================================================= */}
            {/* 6. SECTION E: READ-ONLY COMMISSION RESOLUTION PRECEDENCE */}
            {/* ========================================================================= */}
            <Card style={styles.precedenceCard}>
              <Text style={styles.precedenceTitle}>⚖️ Authoritative Commission Resolution Engine</Text>
              <Text style={styles.precedenceSub}>
                Strict backend resolution hierarchy executed in computeCommissionSplit():
              </Text>

              <View style={styles.precedenceStep}>
                <Text style={styles.stepNum}>1</Text>
                <Text style={styles.stepDesc}>
                  <Text style={styles.stepBold}>Boat Method Override:</Text> Specific boat online/cash rate (0–100%).
                </Text>
              </View>

              <View style={styles.precedenceStep}>
                <Text style={styles.stepNum}>2</Text>
                <Text style={styles.stepDesc}>
                  <Text style={styles.stepBold}>Boat General Override:</Text> General vessel commission rate (0–100%).
                </Text>
              </View>

              <View style={styles.precedenceStep}>
                <Text style={styles.stepNum}>3</Text>
                <Text style={styles.stepDesc}>
                  <Text style={styles.stepBold}>Owner Method Override:</Text> Specific owner online/cash rate (0–100%).
                </Text>
              </View>

              <View style={styles.precedenceStep}>
                <Text style={styles.stepNum}>4</Text>
                <Text style={styles.stepDesc}>
                  <Text style={styles.stepBold}>Owner General Override:</Text> Individual owner account rate (0–100%).
                </Text>
              </View>

              <View style={styles.precedenceStep}>
                <Text style={styles.stepNum}>5</Text>
                <Text style={styles.stepDesc}>
                  <Text style={styles.stepBold}>Platform Method Default:</Text> Online or Cash default from PlatformSettings.
                </Text>
              </View>

              <View style={styles.precedenceStep}>
                <Text style={styles.stepNum}>6</Text>
                <Text style={styles.stepDesc}>
                  <Text style={styles.stepBold}>Subscription Discount:</Text> Pro (-2%) or Premium (-5%) applied ONLY when no boat or owner override exists.
                </Text>
              </View>

              <View style={styles.precedenceStep}>
                <Text style={styles.stepNum}>7</Text>
                <Text style={styles.stepDesc}>
                  <Text style={styles.stepBold}>GST Calculation:</Text> Calculated if commissionGstEnabled === true.
                </Text>
              </View>

              <View style={styles.immutableBanner}>
                <Text style={styles.immutableText}>
                  🔒 <Text style={{ fontWeight: '700' }}>Historical Snapshot Immutability:</Text> All booking records permanently freeze their commission rate and amounts at creation time. Updating settings affects new bookings only.
                </Text>
              </View>
            </Card>

            {/* ========================================================================= */}
            {/* 7. SECTION F: PER-OWNER COMMISSION OVERRIDES */}
            {/* ========================================================================= */}
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              ⛵ Per-Owner Commission Overrides
            </Text>
            <Card style={styles.formCard}>
              <Text style={styles.inputHelp}>
                Set bespoke commission agreements for specific boat operators. Custom rates supersede platform defaults.
              </Text>

              <TextInput
                style={[styles.input, { marginVertical: spacing.m }]}
                placeholder="Search owner by name or email..."
                value={ownerSearch}
                onChangeText={setOwnerSearch}
              />

              {filteredOwners.length === 0 ? (
                <View style={{ paddingVertical: spacing.l, alignItems: 'center' }}>
                  <Text style={{ ...typography.caption, color: colors.gray500 }}>
                    {owners.length === 0 ? 'No boat owners registered.' : 'No owners matching search.'}
                  </Text>
                </View>
              ) : (
                filteredOwners.slice(0, 15).map((o) => (
                  <View key={o._id} style={styles.ownerRow}>
                    <View style={{ flex: 1, marginRight: spacing.s }}>
                      <Text style={styles.ownerName}>{o.name || 'Boat Operator'}</Text>
                      <Text style={styles.ownerEmail}>{o.email}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        {o.commissionRate !== null && o.commissionRate !== undefined ? (
                          <Badge label={`Custom: ${o.commissionRate}%`} variant="warning" size="small" />
                        ) : (
                          <Badge label="Inheriting Platform Default" variant="neutral" size="small" />
                        )}
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.editOwnerBtn}
                      onPress={() => handleOpenOwnerModal(o)}
                    >
                      <Text style={styles.editOwnerBtnText}>Set Rate ✎</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </Card>
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL BEFORE SAVING SETTINGS */}
      {/* ========================================================================= */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
            <Text style={[styles.modalTitle, isDark && styles.textLight]}>
              Confirm Policy Changes
            </Text>
            <Text style={styles.modalSub}>
              Please review the authoritative values that will be submitted to the production backend:
            </Text>

            {pendingPayload && (
              <View style={styles.confirmSummaryBox}>
                <Text style={styles.summaryRow}>
                  • Online Commission: <Text style={styles.summaryBold}>{pendingPayload.onlineCommissionRate}%</Text>
                </Text>
                <Text style={styles.summaryRow}>
                  • Cash on Ride Commission: <Text style={styles.summaryBold}>{pendingPayload.cashCommissionRate}%</Text>
                </Text>
                <Text style={styles.summaryRow}>
                  • Default Fallback Rate: <Text style={styles.summaryBold}>{pendingPayload.defaultCommissionRate}%</Text>
                </Text>
                <Text style={styles.summaryRow}>
                  • GST Status: <Text style={styles.summaryBold}>{pendingPayload.commissionGstEnabled ? `Active (${pendingPayload.commissionGstRate}%)` : 'Disabled (0%)'}</Text>
                </Text>
                <Text style={styles.summaryRow}>
                  • Min Withdrawal: <Text style={styles.summaryBold}>₹{pendingPayload.minWithdrawAmount}</Text>
                </Text>
                <Text style={styles.summaryRow}>
                  • Payout Hold Window: <Text style={styles.summaryBold}>{pendingPayload.payoutHoldDays} days</Text>
                </Text>
                <Text style={styles.summaryRow}>
                  • Cashback Subsidy: <Text style={styles.summaryBold}>{pendingPayload.cashbackPercent}%</Text>
                </Text>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowConfirmModal(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmModalBtn}
                onPress={handleExecuteSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.confirmModalBtnText}>Confirm & Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* OWNER OVERRIDE MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={showOwnerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOwnerModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
            <Text style={[styles.modalTitle, isDark && styles.textLight]}>
              Set Owner Commission Override
            </Text>
            <Text style={styles.modalSub}>
              Override platform default for {selectedOwner?.name || 'this owner'} ({selectedOwner?.email}).
            </Text>

            <Text style={[styles.inputLabel, { marginTop: spacing.m }]}>
              Custom Commission Rate (%)
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Leave blank to use platform default"
              value={ownerOverrideRate}
              onChangeText={setOwnerOverrideRate}
            />
            <Text style={styles.inputHelp}>
              Enter a percentage (0–100) or clear this field to inherit platform defaults.
            </Text>

            <View style={[styles.modalBtnRow, { marginTop: spacing.xl }]}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowOwnerModal(false)}
                disabled={isSavingOwnerRate}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmModalBtn}
                onPress={handleSaveOwnerOverride}
                disabled={isSavingOwnerRate}
              >
                {isSavingOwnerRate ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.confirmModalBtnText}>Update Override</Text>
                )}
              </TouchableOpacity>
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
  scroll: {
    padding: spacing.l,
  },
  freshnessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
    paddingHorizontal: 2,
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal,
  },
  freshnessText: {
    ...typography.caption,
    color: colors.gray600,
    fontSize: 11,
  },
  refreshLinkText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '700',
    fontSize: 11,
  },
  benchmarkCard: {
    padding: spacing.l,
    marginBottom: spacing.l,
    backgroundColor: '#0c272e',
    borderColor: 'rgba(232, 150, 60, 0.4)',
    borderWidth: 1.5,
  },
  benchmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.m,
  },
  benchmarkTitle: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.white,
  },
  benchmarkSubtitle: {
    ...typography.caption,
    color: colors.tealLight,
    marginTop: 2,
  },
  benchmarkTable: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: spacing.m,
  },
  benchmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  benchmarkKey: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    flex: 2,
  },
  benchmarkVal: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  benchmarkNote: {
    ...typography.caption,
    color: colors.gray400,
    fontSize: 10,
    marginTop: spacing.m,
    lineHeight: 14,
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gstStatusBanner: {
    marginVertical: spacing.m,
    padding: spacing.m,
    borderRadius: radii.s,
    backgroundColor: colors.gray50,
  },
  gstAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gstActiveText: {
    ...typography.caption,
    color: colors.coral,
    fontWeight: '700',
    flex: 1,
  },
  gstDisabledText: {
    ...typography.caption,
    color: '#065f46',
    fontWeight: '700',
    flex: 1,
  },
  subPlansBox: {
    marginTop: spacing.m,
    padding: spacing.m,
    backgroundColor: colors.gray50,
    borderRadius: radii.s,
  },
  subPlansTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  subPlansItem: {
    ...typography.caption,
    color: colors.gray600,
    lineHeight: 18,
  },
  precedenceCard: {
    padding: spacing.l,
    marginBottom: spacing.l,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.line,
  },
  precedenceTitle: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.ink,
  },
  precedenceSub: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: 2,
    marginBottom: spacing.m,
  },
  precedenceStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.teal,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '800',
    fontSize: 11,
    marginRight: 10,
    marginTop: 2,
  },
  stepDesc: {
    ...typography.caption,
    color: colors.gray700,
    flex: 1,
    lineHeight: 18,
  },
  stepBold: {
    fontWeight: '700',
    color: colors.ink,
  },
  immutableBanner: {
    marginTop: spacing.m,
    padding: spacing.m,
    backgroundColor: '#fffbeb',
    borderRadius: radii.s,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  immutableText: {
    ...typography.caption,
    color: '#92400e',
    lineHeight: 16,
  },
  ownerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  ownerName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  ownerEmail: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 1,
  },
  editOwnerBtn: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.s,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  editOwnerBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
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
  unauthorizedBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  unauthorizedTitle: {
    ...typography.h2,
    color: colors.coral,
    textAlign: 'center',
    marginBottom: spacing.m,
  },
  unauthorizedSub: {
    ...typography.bodyMedium,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.l,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: radii.l,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 440,
    ...shadows.lift,
  },
  modalCardDark: {
    backgroundColor: '#0c272e',
  },
  modalTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: 4,
  },
  modalSub: {
    ...typography.caption,
    color: colors.gray600,
    marginBottom: spacing.m,
    lineHeight: 18,
  },
  confirmSummaryBox: {
    backgroundColor: colors.gray50,
    padding: spacing.m,
    borderRadius: radii.s,
    marginBottom: spacing.l,
    gap: 6,
  },
  summaryRow: {
    ...typography.caption,
    color: colors.gray700,
  },
  summaryBold: {
    fontWeight: '800',
    color: colors.ink,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.m,
  },
  cancelModalBtn: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    borderRadius: radii.m,
  },
  cancelModalBtnText: {
    ...typography.button,
    color: colors.gray600,
  },
  confirmModalBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.m,
    borderRadius: radii.m,
    minWidth: 120,
    alignItems: 'center',
  },
  confirmModalBtnText: {
    ...typography.button,
    color: colors.white,
  },
});
