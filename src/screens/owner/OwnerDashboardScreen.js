import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  AppState,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import JalRideLogo from '../../components/common/JalRideLogo';

export default function OwnerDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const isFetchingRef = useRef(false);
  const hasQueuedRefreshRef = useRef(false);

  const loadOwnerData = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) {
      hasQueuedRefreshRef.current = true;
      return;
    }
    isFetchingRef.current = true;
    if (!isSilent) setLoading(true);
    setErrorMessage(null);
    try {
      const [s, b] = await Promise.all([
        api.getOwnerDashboard(),
        api.getOwnerBookings(),
      ]);
      setStats(s || {});
      setBookings(Array.isArray(b) ? b : []);
    } catch (e) {
      console.warn('Error loading owner data:', e);
      setErrorMessage(e.message || 'Unable to update dashboard data. Pull down to retry.');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      if (hasQueuedRefreshRef.current) {
        hasQueuedRefreshRef.current = false;
        loadOwnerData(true);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOwnerData(true);
    }, [loadOwnerData])
  );

  useEffect(() => {
    loadOwnerData();
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadOwnerData(true);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [loadOwnerData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOwnerData(false);
  };

  const statusCounts = stats?.bookingStatusCounts || {
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Screen Top Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, spacing.m) }, isDark && styles.topBarDark]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <JalRideLogo size={36} variant="badge" />
          <View>
            <Text style={styles.topBarRole}>⚓ BOAT OWNER CONSOLE</Text>
            <Text style={[styles.topBarName, isDark && styles.textLight]}>
              {user?.name || 'Boat Operator'}
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
        {/* Error Notice if fetch failed */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {errorMessage}</Text>
          </View>
        )}

        {!loading && !stats && errorMessage ? (
          <Card style={styles.errorCard}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>⚠️</Text>
            <Text style={[styles.errorCardTitle, isDark && styles.textLight]}>
              Failed to Load Fleet Dashboard
            </Text>
            <Text style={styles.errorCardSub}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadOwnerData(false)}>
              <Text style={styles.retryBtnText}>🔄 Retry Loading</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <>
            {/* Authoritative Earnings KPI Banner */}
            <View style={styles.earningsBanner}>
          <Text style={styles.earningsLabel}>TOTAL OPERATOR EARNINGS</Text>
          <Text style={styles.earningsValue}>
            ₹{(stats?.totalEarnings ?? 0).toLocaleString('en-IN')}
          </Text>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCol}>
              <Text style={styles.kpiVal}>{stats?.totalPaidRides ?? 0}</Text>
              <Text style={styles.kpiLbl}>Completed Rides</Text>
            </View>

            <View style={styles.kpiDivider} />

            <View style={styles.kpiCol}>
              <Text style={styles.kpiVal}>{stats?.totalBoats ?? 0}</Text>
              <Text style={styles.kpiLbl}>Active Fleet</Text>
            </View>

            <View style={styles.kpiDivider} />

            <View style={styles.kpiCol}>
              <Text style={styles.kpiVal}>{statusCounts.confirmed ?? 0}</Text>
              <Text style={styles.kpiLbl}>Confirmed Upcoming</Text>
            </View>
          </View>
        </View>

        {/* Live Booking Status Breakdown Strip */}
        <View style={styles.statusStrip}>
          <View style={[styles.statusItem, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
            <Text style={[styles.statusCount, { color: '#b45309' }]}>{statusCounts.pending ?? 0}</Text>
            <Text style={[styles.statusLabel, { color: '#92400e' }]}>Pending</Text>
          </View>

          <View style={[styles.statusItem, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
            <Text style={[styles.statusCount, { color: '#047857' }]}>{statusCounts.confirmed ?? 0}</Text>
            <Text style={[styles.statusLabel, { color: '#065f46' }]}>Confirmed</Text>
          </View>

          <View style={[styles.statusItem, { backgroundColor: '#f0fdfa', borderColor: '#99f6e4' }]}>
            <Text style={[styles.statusCount, { color: '#0f766e' }]}>{statusCounts.completed ?? 0}</Text>
            <Text style={[styles.statusLabel, { color: '#115e59' }]}>Completed</Text>
          </View>

          <View style={[styles.statusItem, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <Text style={[styles.statusCount, { color: '#b91c1c' }]}>{statusCounts.cancelled ?? 0}</Text>
            <Text style={[styles.statusLabel, { color: '#991b1b' }]}>Cancelled</Text>
          </View>
        </View>

        {/* Quick Fleet Dispatch Navigation Grid */}
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          Quick Fleet Console
        </Text>

        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('OwnerBookings')}
          >
            <Text style={styles.quickIcon}>📋</Text>
            <Text style={styles.quickText}>Passenger Manifest</Text>
            <Badge
              label={`${statusCounts.pending} Pending`}
              variant={statusCounts.pending > 0 ? 'warning' : 'default'}
              size="small"
              style={{ marginTop: 4 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('OwnerFleet')}
          >
            <Text style={styles.quickIcon}>🛶</Text>
            <Text style={styles.quickText}>My Fleet & Fares</Text>
            <Badge
              label={`${stats?.totalBoats ?? 0} Vessels`}
              variant="teal"
              size="small"
              style={{ marginTop: 4 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('OwnerQrPosters')}
          >
            <Text style={styles.quickIcon}>📱</Text>
            <Text style={styles.quickText}>Ghat Standee QR</Text>
            <Badge label="Print Standee" variant="sun" size="small" style={{ marginTop: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('OwnerWallet')}
          >
            <Text style={styles.quickIcon}>💳</Text>
            <Text style={styles.quickText}>Wallet & Payouts</Text>
            <Badge label="Bank Transfer" variant="success" size="small" style={{ marginTop: 4 }} />
          </TouchableOpacity>
        </View>

        {/* Recent Bookings Activity */}
        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
            Recent Booking Manifest
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('OwnerBookings')}>
            <Text style={styles.seeAllText}>View All Bookings →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.teal} style={{ marginVertical: 20 }} />
        ) : bookings.length === 0 ? (
          <Card style={{ padding: 28, alignItems: 'center', marginVertical: spacing.s }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
            <Text style={{ ...typography.bodyMedium, color: colors.gray500, textAlign: 'center' }}>
              No passenger bookings recorded yet.
            </Text>
          </Card>
        ) : (
          bookings.slice(0, 5).map((booking) => {
            const customerName = booking.customer?.name || booking.customerName || 'Devotee / Passenger';
            const boatName = booking.boat?.boatName || 'JalRide Vessel';
            const status = booking.bookingStatus || booking.status || 'confirmed';

            return (
              <Card
                key={booking._id}
                style={styles.bookingCard}
                onPress={() => navigation.navigate('OwnerBookings')}
              >
                <View style={styles.bookingCardTop}>
                  <View>
                    <Text style={styles.bookingTicketId}>{booking.ticketId}</Text>
                    <Text style={[styles.bookingCustomer, isDark && styles.textLight]}>
                      {customerName}
                    </Text>
                  </View>
                  <Badge
                    label={status}
                    variant={
                      status === 'confirmed'
                        ? 'success'
                        : status === 'pending'
                        ? 'warning'
                        : status === 'completed'
                        ? 'teal'
                        : 'default'
                    }
                  />
                </View>

                <View style={styles.bookingDivider} />

                <View style={styles.bookingDetailsRow}>
                  <Text style={styles.bookingMetaText}>🛶 {boatName}</Text>
                  <Text style={styles.bookingMetaText}>🕒 {booking.bookingDate} ({booking.bookingTime})</Text>
                </View>

                <View style={styles.bookingFooterRow}>
                  <Text style={styles.bookingPaxText}>👥 {booking.passengers} Rider(s)</Text>
                  <Text style={styles.bookingFareText}>₹{booking.totalAmount || booking.amount}</Text>
                </View>
              </Card>
            );
          })
        )}
          </>
        )}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  topBarDark: {
    backgroundColor: '#0a1e23',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  topBarRole: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: colors.teal,
    letterSpacing: 1,
  },
  topBarName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  profileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.gray100,
  },
  profileBtnText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.ink,
  },
  scroll: {
    padding: spacing.l,
    paddingBottom: 80,
  },
  earningsBanner: {
    backgroundColor: '#0a2e36',
    borderRadius: radii.l,
    padding: spacing.l,
    marginBottom: spacing.m,
    ...shadows.card,
  },
  earningsLabel: {
    ...typography.caption,
    color: '#99f6e4',
    fontWeight: '700',
    letterSpacing: 1,
  },
  earningsValue: {
    ...typography.h1,
    color: '#f59e0b',
    fontSize: 32,
    marginTop: 4,
    marginBottom: spacing.m,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.m,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  kpiCol: {
    flex: 1,
    alignItems: 'center',
  },
  kpiVal: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
  },
  kpiLbl: {
    ...typography.caption,
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  kpiDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statusStrip: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.l,
  },
  statusItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.m,
    borderWidth: 1,
  },
  statusCount: {
    fontSize: 18,
    fontWeight: '800',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: spacing.m,
  },
  textLight: {
    color: colors.white,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.m,
    marginBottom: spacing.xl,
  },
  quickCard: {
    width: '47.5%',
    backgroundColor: colors.white,
    padding: spacing.m,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'flex-start',
    ...shadows.soft,
  },
  quickIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  quickText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.ink,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAllText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '700',
  },
  bookingCard: {
    marginBottom: spacing.m,
    padding: spacing.m,
    borderRadius: radii.m,
    ...shadows.soft,
  },
  bookingCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingTicketId: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: colors.teal,
  },
  bookingCustomer: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  bookingDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.s,
  },
  bookingDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bookingMetaText: {
    ...typography.caption,
    color: colors.gray600,
  },
  bookingFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  bookingPaxText: {
    ...typography.caption,
    color: colors.gray500,
    fontWeight: '600',
  },
  bookingFareText: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.teal,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: radii.m,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  errorCard: {
    padding: 32,
    alignItems: 'center',
    marginVertical: spacing.l,
  },
  errorCardTitle: {
    ...typography.headlineMedium,
    color: colors.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  errorCardSub: {
    ...typography.bodyMedium,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radii.m,
  },
  retryBtnText: {
    ...typography.bodyMedium,
    color: colors.white,
    fontWeight: '700',
  },
});
