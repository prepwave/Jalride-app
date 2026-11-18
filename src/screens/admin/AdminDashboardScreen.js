import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import JalRideLogo from '../../components/common/JalRideLogo';

export default function AdminDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await api.getAdminStats();
      setStats(data || {});
    } catch (e) {
      console.warn('Error loading admin stats:', e);
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

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Admin Header */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, spacing.m) }, isDark && styles.headerBarDark]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <JalRideLogo size={36} variant="badge" />
          <View>
            <Text style={styles.headerRole}>👑 SUPER ADMINISTRATOR CONSOLE</Text>
            <Text style={[styles.headerName, isDark && styles.textLight]}>
              Pushpendra Singh (Admin)
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.profileBtnText}>⚙️ Profile</Text>
        </TouchableOpacity>
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
        {/* Platform Revenue & Commission KPI Card */}
        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>PLATFORM GROSS BOOKING VALUE</Text>
          <Text style={styles.revenueValue}>₹{stats?.totalRevenue?.toLocaleString('en-IN') || '2,84,500'}</Text>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCol}>
              <Text style={styles.kpiVal}>₹{stats?.platformCommissionRevenue?.toLocaleString('en-IN') || '38,940'}</Text>
              <Text style={styles.kpiLbl}>Retained Commission (15%)</Text>
            </View>

            <View style={styles.kpiDivider} />

            <View style={styles.kpiCol}>
              <Text style={styles.kpiVal}>₹{stats?.gstCollected?.toLocaleString('en-IN') || '7,009'}</Text>
              <Text style={styles.kpiLbl}>GST Pool Collected</Text>
            </View>

            <View style={styles.kpiDivider} />

            <View style={styles.kpiCol}>
              <Text style={styles.kpiVal}>{stats?.todayBookings || '38'}</Text>
              <Text style={styles.kpiLbl}>Today's Rides</Text>
            </View>
          </View>
        </View>

        {/* Attention Items Grid */}
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Needs Attention</Text>
        <View style={styles.attentionGrid}>
          <TouchableOpacity
            style={styles.attentionCard}
            onPress={() => navigation.navigate('AdminBoats')}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.attentionIcon}>🛶</Text>
              <Badge label={`${stats?.pendingBoatApprovals || 5} Pending`} variant="warning" size="small" />
            </View>
            <Text style={styles.attentionTitle}>Pending Boat Approvals</Text>
            <Text style={styles.attentionSub}>Vessels awaiting port inspection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attentionCard}
            onPress={() => Alert.alert('Refunds Queue', 'Reviewing 2 customer refund requests for cancellations.')}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.attentionIcon}>🔄</Text>
              <Badge label={`${stats?.pendingRefunds || 2} Requests`} variant="danger" size="small" />
            </View>
            <Text style={styles.attentionTitle}>Refund Authorizations</Text>
            <Text style={styles.attentionSub}>100% wallet escrow reversals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attentionCard}
            onPress={() => Alert.alert('KYC Audit Queue', 'Reviewing operator identity and captain certificates.')}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.attentionIcon}>🪪</Text>
              <Badge label={`${stats?.pendingKyc || 3} Pending`} variant="info" size="small" />
            </View>
            <Text style={styles.attentionTitle}>KYC Review Queue</Text>
            <Text style={styles.attentionSub}>Aadhaar & Captain License audit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attentionCard}
            onPress={() => navigation.navigate('AdminSettings')}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.attentionIcon}>⚙️</Text>
              <Badge label="Active" variant="success" size="small" />
            </View>
            <Text style={styles.attentionTitle}>Rates & Commission</Text>
            <Text style={styles.attentionSub}>Global 15% rate & GST rules</Text>
          </TouchableOpacity>
        </View>

        {/* Platform Overview Modules */}
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Management Consoles</Text>
        <Card style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AdminBoats')}
          >
            <Text style={styles.menuItemIcon}>🚢</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, isDark && styles.textLight]}>Fleet Fleet Oversight (42 Boats)</Text>
              <Text style={styles.menuItemSub}>Approve, reject, or suspend Varanasi vessels</Text>
            </View>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AdminUsers')}
          >
            <Text style={styles.menuItemIcon}>👥</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, isDark && styles.textLight]}>User Directory (1,450 Riders)</Text>
              <Text style={styles.menuItemSub}>Inspect accounts, verify emails & toggle active</Text>
            </View>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AdminSettings')}
          >
            <Text style={styles.menuItemIcon}>🏷️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, isDark && styles.textLight]}>Coupons & Promo Campaigns</Text>
              <Text style={styles.menuItemSub}>Create Aarti discount codes & cashback subsidies</Text>
            </View>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
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
  headerBar: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerBarDark: {
    backgroundColor: '#0a1e23',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerRole: {
    ...typography.caption,
    color: colors.sunDeep,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerName: {
    ...typography.h3,
    color: colors.ink,
    marginTop: 2,
  },
  profileBtn: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  profileBtnText: {
    ...typography.caption,
    color: colors.ink,
    fontWeight: '600',
  },
  scroll: {
    padding: spacing.l,
  },
  revenueCard: {
    backgroundColor: '#0c272e',
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.lift,
    borderWidth: 1,
    borderColor: 'rgba(232, 150, 60, 0.3)',
  },
  revenueLabel: {
    ...typography.caption,
    color: colors.sun,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  revenueValue: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.white,
    marginVertical: spacing.s,
  },
  kpiRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radii.m,
    padding: spacing.m,
    marginTop: spacing.s,
  },
  kpiCol: {
    flex: 1,
    alignItems: 'center',
  },
  kpiVal: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.tealLight,
  },
  kpiLbl: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  kpiDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: spacing.m,
  },
  attentionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.m,
    marginBottom: spacing.xl,
  },
  attentionCard: {
    width: '47%',
    backgroundColor: colors.white,
    padding: spacing.l,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  attentionIcon: {
    fontSize: 24,
  },
  attentionTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 4,
  },
  attentionSub: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
    fontSize: 10,
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.l,
  },
  menuItemIcon: {
    fontSize: 26,
    marginRight: spacing.m,
  },
  menuItemTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  menuItemSub: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 18,
    color: colors.gray400,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.line,
  },
});
