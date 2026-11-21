import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';

export default function AdminBookingsScreen({ navigation }) {
  const { isDark } = useTheme();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'confirmed' | 'completed' | 'cancelled' | 'pending'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadBookings = useCallback(async (p = 1, showIndicator = true) => {
    if (showIndicator) setLoading(true);
    try {
      const res = await api.getAdminUniversalBookings(p, 25, {
        status: statusFilter,
        search: searchQuery.trim(),
      });
      setBookings(res.bookings || []);
      setTotalPages(res.totalPages || 1);
      setPage(res.page || p);
    } catch (e) {
      console.warn('Error loading universal bookings:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadBookings(1);
  }, [statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings(1, false);
  };

  const handleSearchSubmit = () => {
    loadBookings(1);
  };

  const handleCancelBooking = (booking) => {
    Alert.alert(
      'Administrative Cancellation',
      `Are you sure you want to cancel booking ${booking.ticketId || booking._id} for ${booking.boat?.boatName || 'Boat'}?\n\nThis will trigger platform escrow cancellation logic.`,
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Confirm Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.adminCancelBooking(booking._id, 'Administrative cancellation by platform supervisor');
              Alert.alert('Booking Cancelled', `Booking ${booking.ticketId || booking._id} has been cancelled.`);
              loadBookings(page, false);
            } catch (err) {
              Alert.alert('Cancellation Failed', err.message || 'Unable to cancel booking.');
            }
          },
        },
      ]
    );
  };

  const getStatusVariant = (st) => {
    switch (st) {
      case 'confirmed':
        return 'success';
      case 'completed':
        return 'info';
      case 'cancelled':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const renderBookingItem = ({ item }) => {
    const isInstant = item.bookingType === 'instant_qr';
    const isCash = item.paymentMethod === 'cash';

    return (
      <Card style={styles.bookingCard}>
        {/* Header Row: Ticket ID & Status */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.ticketId, isDark && styles.textLight]}>
                {item.ticketId || `#${item._id?.slice(-8)?.toUpperCase()}`}
              </Text>
              {isInstant && (
                <Badge label="⚡ Walk-In QR" variant="sun" size="small" />
              )}
            </View>
            <Text style={styles.bookingDate}>
              📅 {item.bookingDate || 'Today'} • {item.bookingTime || 'Scheduled'}
            </Text>
          </View>
          <Badge
            label={(item.bookingStatus || 'pending').toUpperCase()}
            variant={getStatusVariant(item.bookingStatus)}
          />
        </View>

        <View style={styles.divider} />

        {/* Vessel & Route Detail */}
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>🛶</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.boatName, isDark && styles.textLight]}>
              {item.boat?.boatName || 'Express Waterways Vessel'}
            </Text>
            <Text style={styles.ghatText}>
              📍 {item.boat?.location || 'Varanasi Ghat'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.fareAmount}>₹{item.amount || item.totalPrice || 0}</Text>
            <Text style={styles.passengerCount}>{item.passengers || 1} seat(s)</Text>
          </View>
        </View>

        {/* Customer & Payment Strip */}
        <View style={styles.customerStrip}>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerLabel}>PASSENGER</Text>
            <Text style={[styles.customerName, isDark && styles.textLight]} numberOfLines={1}>
              {item.customer?.name || item.guestDetails?.name || 'Tourist Guest'}
            </Text>
            <Text style={styles.customerContact} numberOfLines={1}>
              {item.customer?.email || item.customer?.phone || 'Direct Ghat Boarding'}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.customerLabel}>PAYMENT</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.payMethodText}>
                {isCash ? '💵 Cash on Ride' : '💳 Online Payment'}
              </Text>
            </View>
            <Text
              style={[
                styles.payStatusText,
                { color: item.paymentStatus === 'paid' ? colors.teal : colors.sunDeep },
              ]}
            >
              {item.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Unpaid'}
            </Text>
          </View>
        </View>

        {/* Admin Action Row */}
        {item.bookingStatus !== 'cancelled' && item.bookingStatus !== 'completed' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => handleCancelBooking(item)}
            >
              <Text style={styles.cancelBtnText}>✕ Admin Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'completed', label: 'Completed' },
    { key: 'pending', label: 'Pending' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Universal Booking Ledger"
        subtitle="Search & supervise all platform boat rides"
        onBack={() => navigation.goBack()}
      />

      {/* Search Input Bar */}
      <View style={[styles.searchBar, isDark && styles.searchBarDark]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, isDark && styles.textLight]}
          placeholder="Search ticket ID, passenger name, boat..."
          placeholderTextColor={colors.gray400}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              loadBookings(1);
            }}
          >
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs Strip */}
      <View style={styles.filterStrip}>
        {filterTabs.map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterTab,
                isActive && styles.filterTabActive,
                isDark && styles.filterTabDark,
                isActive && isDark && styles.filterTabActiveDark,
              ]}
              onPress={() => setStatusFilter(tab.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bookings List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.sunDeep} />
          <Text style={[styles.loadingText, isDark && styles.textLight]}>
            Loading universal bookings ledger...
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.sunDeep]}
              tintColor={colors.sunDeep}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>📋</Text>
              <Text style={[styles.emptyTitle, isDark && styles.textLight]}>
                No Bookings Found
              </Text>
              <Text style={styles.emptySubtitle}>
                No ride bookings matched the selected status or query.
              </Text>
            </View>
          }
        />
      )}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.l,
    marginTop: spacing.s,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.m,
    height: 46,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchBarDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.s,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.ink,
  },
  clearSearch: {
    fontSize: 16,
    color: colors.gray400,
    padding: 4,
  },
  filterStrip: {
    flexDirection: 'row',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    gap: spacing.s,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radii.full,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterTabDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  filterTabActive: {
    backgroundColor: colors.sunDeep,
    borderColor: colors.sunDeep,
  },
  filterTabActiveDark: {
    backgroundColor: colors.sunDeep,
    borderColor: colors.sunDeep,
  },
  filterTabText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.gray600,
    fontSize: 11,
  },
  filterTabTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.l,
    paddingBottom: 40,
  },
  bookingCard: {
    marginBottom: spacing.m,
    padding: spacing.m,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketId: {
    fontFamily: 'monospace',
    fontWeight: '800',
    fontSize: 14,
    color: colors.ink,
  },
  bookingDate: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.s,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 24,
    marginRight: spacing.s,
  },
  boatName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  ghatText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '600',
  },
  fareAmount: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.teal,
  },
  passengerCount: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 11,
  },
  customerStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: spacing.s,
    borderRadius: radii.s,
    marginTop: spacing.s,
  },
  customerLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.gray500,
    marginBottom: 2,
  },
  customerName: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
  },
  customerContact: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 10,
  },
  payMethodText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.ink,
    fontSize: 11,
  },
  payStatusText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.s,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  cancelBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing.m,
    borderRadius: radii.s,
    backgroundColor: '#fff0f0',
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  cancelBtnText: {
    ...typography.caption,
    color: colors.coral,
    fontWeight: '700',
    fontSize: 11,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.gray600,
    marginTop: spacing.m,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.gray500,
    textAlign: 'center',
  },
});
