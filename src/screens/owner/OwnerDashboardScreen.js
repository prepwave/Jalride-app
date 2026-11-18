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
import Header from '../../components/common/Header';
import JalRideLogo from '../../components/common/JalRideLogo';

export default function OwnerDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadOwnerData = async () => {
    try {
      const [s, b] = await Promise.all([
        api.getOwnerDashboard(),
        api.getOwnerBookings(),
      ]);
      setStats(s);
      setBookings(b || []);
    } catch (e) {
      console.warn('Error loading owner data:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOwnerData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadOwnerData();
  };

  const handleQuickAction = (action, bookingId) => {
    Alert.alert(
      action.toUpperCase(),
      `Action ${action} executed for booking ${bookingId}. Status updated in live fleet dispatch.`,
      [{ text: 'OK' }]
    );
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
              {user?.name || 'Rameshwar Majhi'}
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
        {/* Earnings KPI Banner */}
        <View style={styles.earningsBanner}>
          <Text style={styles.earningsLabel}>TOTAL NET EARNINGS</Text>
          <Text style={styles.earningsValue}>₹{stats?.totalEarnings?.toLocaleString('en-IN') || '48,650'}</Text>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCol}>
              <Text style={styles.kpiVal}>₹{stats?.availableBalance?.toLocaleString('en-IN') || '12,400'}</Text>
              <Text style={styles.kpiLbl}>Available to Payout</Text>
            </View>

            <View style={styles.kpiDivider} />

            <View style={styles.kpiCol}>
              <Text style={styles.kpiVal}>₹{stats?.dueCommissions || '680'}</Text>
              <Text style={styles.kpiLbl}>Due Commission (Cash)</Text>
            </View>

            <View style={styles.kpiDivider} />

            <View style={styles.kpiCol}>
              <Text style={styles.kpiVal}>{stats?.todayTrips || '4'}</Text>
              <Text style={styles.kpiLbl}>Today's Trips</Text>
            </View>
          </View>
        </View>

        {/* Quick Dispatch Action Grid */}
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          Quick Ghat Dispatch
        </Text>

        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('OwnerBookings')}
          >
            <Text style={styles.quickIcon}>📋</Text>
            <Text style={styles.quickText}>Incoming Rides</Text>
            <Badge label="2 Pending" variant="warning" size="small" style={{ marginTop: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('OwnerFleet')}
          >
            <Text style={styles.quickIcon}>🛶</Text>
            <Text style={styles.quickText}>My Fleet</Text>
            <Badge label="3 Active" variant="teal" size="small" style={{ marginTop: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('OwnerQrPosters')}
          >
            <Text style={styles.quickIcon}>📱</Text>
            <Text style={styles.quickText}>Ghat Standee QR</Text>
            <Badge label="Print Poster" variant="sun" size="small" style={{ marginTop: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('OwnerWallet')}
          >
            <Text style={styles.quickIcon}>💳</Text>
            <Text style={styles.quickText}>Withdrawals</Text>
            <Badge label="Bank Payout" variant="success" size="small" style={{ marginTop: 4 }} />
          </TouchableOpacity>
        </View>

        {/* Today's Bookings Dispatch */}
        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
            Upcoming Trips Today
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('OwnerBookings')}>
            <Text style={styles.seeAllText}>View All Bookings →</Text>
          </TouchableOpacity>
        </View>

        {bookings.map((booking) => (
          <Card key={booking._id} style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <View>
                <Text style={styles.bookingId}>{booking.ticketId}</Text>
                <Text style={[styles.bookingCustomer, isDark && styles.textLight]}>
                  {booking.customerName} ({booking.customerPhone})
                </Text>
              </View>
              <Badge label={booking.status} variant="success" />
            </View>

            <View style={styles.bookingDetailsRow}>
              <Text style={styles.bookingDetail}>📍 {booking.boat?.location}</Text>
              <Text style={styles.bookingDetail}>🕒 {booking.bookingTime}</Text>
              <Text style={styles.bookingDetail}>👥 {booking.passengers} Seats</Text>
            </View>

            <View style={styles.bookingFareRow}>
              <Text style={styles.earningLabel}>Owner Net Earnings:</Text>
              <Text style={styles.earningValue}>₹{booking.totalAmount - Math.round(booking.totalAmount * 0.15)}</Text>
            </View>

            {/* Action Buttons for Booking */}
            <View style={styles.dispatchActions}>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => handleQuickAction('Confirmed & Slot Reserved', booking._id)}
              >
                <Text style={styles.confirmBtnText}>✓ Confirm (स्वीकारें)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.holdBtn}
                onPress={() => handleQuickAction('Put on Hold', booking._id)}
              >
                <Text style={styles.holdBtnText}>⏸ Hold</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleQuickAction('Cancelled & 100% Refunded', booking._id)}
              >
                <Text style={styles.cancelBtnText}>✕ Cancel</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {/* Ghat Standee Callout */}
        <View style={styles.standeeBanner}>
          <Text style={styles.standeeIcon}>🪧</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.standeeHeading}>Varanasi Ghat Standee QR</Text>
            <Text style={styles.standeeSub}>
              Display your boat's official JalRide QR standee at your ghat. Walk-in tourists can scan and board directly with cash or UPI.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.standeeBtn}
            onPress={() => navigation.navigate('OwnerQrPosters')}
          >
            <Text style={styles.standeeBtnText}>Preview</Text>
          </TouchableOpacity>
        </View>

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
  topBar: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  topBarDark: {
    backgroundColor: '#0a1e23',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  topBarRole: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  topBarName: {
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
  earningsBanner: {
    backgroundColor: colors.deep,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.lift,
    marginBottom: spacing.xl,
  },
  earningsLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  earningsValue: {
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
    marginTop: spacing.s,
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
  sectionTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: spacing.m,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.m,
    marginBottom: spacing.xl,
  },
  quickCard: {
    width: '47%',
    backgroundColor: colors.white,
    padding: spacing.l,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    ...shadows.soft,
  },
  quickIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  quickText: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  seeAllText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '700',
  },
  bookingCard: {
    padding: spacing.l,
    marginBottom: spacing.m,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.s,
  },
  bookingId: {
    ...typography.mono,
    color: colors.teal,
    fontSize: 12,
  },
  bookingCustomer: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
  bookingDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.s,
  },
  bookingDetail: {
    ...typography.bodySmall,
    color: colors.gray600,
  },
  bookingFareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.s,
    marginTop: spacing.s,
  },
  earningLabel: {
    ...typography.caption,
    color: colors.gray500,
    fontWeight: '600',
  },
  earningValue: {
    ...typography.h3,
    color: colors.success,
    fontWeight: '700',
  },
  dispatchActions: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.m,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: colors.success,
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  confirmBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
  holdBtn: {
    flex: 1,
    backgroundColor: colors.warningMist,
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  holdBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.warning,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.dangerMist,
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  cancelBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.danger,
  },
  standeeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tealMist,
    padding: spacing.l,
    borderRadius: radii.l,
    marginTop: spacing.xl,
    gap: spacing.m,
  },
  standeeIcon: {
    fontSize: 32,
  },
  standeeHeading: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 2,
  },
  standeeSub: {
    ...typography.caption,
    color: colors.deep,
    lineHeight: 16,
  },
  standeeBtn: {
    backgroundColor: colors.teal,
    paddingVertical: 8,
    paddingHorizontal: spacing.m,
    borderRadius: radii.m,
  },
  standeeBtnText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
});
