import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ReviewModal from '../../components/common/ReviewModal';

// Authoritative booking statuses supported by backend Booking model (enum in backend/models/Booking.js)
export const VALID_BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'expired'];

/**
 * Normalizes booking status safely according to backend contract.
 * Rules:
 * 1. If bookingStatus is present and valid, use it.
 * 2. If bookingStatus is absent but legacy status is valid, use legacy value.
 * 3. If both are absent, fallback to backend model schema default ('pending').
 * 4. If an unsupported/unrecognized status is provided, classify as 'unknown'.
 * 5. Unknown status is NEVER silently classified as 'confirmed'.
 */
export const getBookingStatus = (b) => {
  if (!b || typeof b !== 'object') return 'unknown';

  const rawBookingStatus = typeof b.bookingStatus === 'string' ? b.bookingStatus.trim().toLowerCase() : null;
  if (rawBookingStatus) {
    if (VALID_BOOKING_STATUSES.includes(rawBookingStatus)) {
      return rawBookingStatus;
    }
    return 'unknown';
  }

  const rawLegacyStatus = typeof b.status === 'string' ? b.status.trim().toLowerCase() : null;
  if (rawLegacyStatus) {
    if (VALID_BOOKING_STATUSES.includes(rawLegacyStatus)) {
      return rawLegacyStatus;
    }
    return 'unknown';
  }

  // Authoritative backend model default for new/empty booking is 'pending'
  return 'pending';
};

export default function MyRidesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'completed'
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewBooking, setSelectedReviewBooking] = useState(null);

  const isReviewEligible = (b) => {
    if (!b) return false;
    const s = getBookingStatus(b);
    if (s === 'cancelled' || s === 'expired' || s === 'unknown' || s === 'pending') return false;
    return (
      s === 'completed' ||
      s === 'confirmed' ||
      b.paymentStatus === 'paid'
    );
  };

  const isFetchingRef = useRef(false);

  const loadBookings = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!isSilent) setLoading(true);
    try {
      const data = await api.getMyBookings();
      const list = Array.isArray(data) ? data : (data?.bookings || data?.data || []);
      // Sort newest bookings first
      list.sort((a, b) => {
        const timeA = new Date(a.createdAt || `${a.bookingDate}T${a.bookingTime || '00:00'}:00Z`).getTime() || 0;
        const timeB = new Date(b.createdAt || `${b.bookingDate}T${b.bookingTime || '00:00'}:00Z`).getTime() || 0;
        return timeB - timeA;
      });
      setBookings(list);
    } catch (e) {
      console.warn('Error fetching bookings:', e);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookings(true);
    }, [loadBookings])
  );

  useEffect(() => {
    loadBookings();
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadBookings(true);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [loadBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings(false);
  };

  const upcomingList = bookings.filter((b) => {
    const s = getBookingStatus(b);
    return s === 'confirmed' || s === 'pending';
  });

  const pastList = bookings.filter((b) => {
    const s = getBookingStatus(b);
    return s === 'completed' || s === 'cancelled' || s === 'expired' || s === 'unknown';
  });

  const filteredBookings = activeTab === 'upcoming' ? upcomingList : pastList;

  const renderBookingCard = ({ item }) => {
    const itemStatus = getBookingStatus(item);
    const badgeVariant =
      itemStatus === 'confirmed'
        ? 'success'
        : itemStatus === 'pending'
        ? 'warning'
        : itemStatus === 'completed'
        ? 'teal'
        : itemStatus === 'cancelled'
        ? 'danger'
        : itemStatus === 'expired'
        ? 'default'
        : 'default';

    return (
      <Card
        style={styles.card}
        onPress={() => navigation.navigate('Ticket', { booking: item })}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.ticketId}>{item.ticketId}</Text>
            <Text style={[styles.boatName, isDark && styles.textLight]}>
              {item.boat?.boatName}
            </Text>
          </View>
          <Badge
            label={itemStatus.toUpperCase()}
            variant={badgeVariant}
          />
        </View>

      <View style={styles.cardDivider} />

      <View style={styles.infoRow}>
        <View style={styles.infoCol}>
          <Text style={styles.infoLabel}>Boarding Ghat</Text>
          <Text style={styles.infoValue}>📍 {item.boat?.location}</Text>
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.infoLabel}>Date & Time</Text>
          <Text style={styles.infoValue}>🕒 {item.bookingDate} ({item.bookingTime})</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoCol}>
          <Text style={styles.infoLabel}>Passengers</Text>
          <Text style={styles.infoValue}>👥 {item.passengers} Rider{item.passengers > 1 ? 's' : ''}</Text>
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.infoLabel}>Paid Fare</Text>
          <Text style={styles.fareValue}>₹{item.totalAmount}</Text>
        </View>
      </View>

      {/* Card Action Buttons */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtnOutline}
          onPress={() => navigation.navigate('Ticket', { booking: item })}
        >
          <Text style={styles.actionBtnOutlineText}>View QR Ticket</Text>
        </TouchableOpacity>

        {isReviewEligible(item) ? (
          <TouchableOpacity
            style={styles.actionBtnReview}
            onPress={() => {
              setSelectedReviewBooking(item);
              setShowReviewModal(true);
            }}
          >
            <Text style={styles.actionBtnReviewText}>
              {item.reviewed ? '★ Reviewed' : '⭐ Rate Ride'}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.actionBtnChat}
          onPress={() => navigation.navigate('Chat', { bookingId: item._id })}
        >
          <Text style={styles.actionBtnChatText}>💬 Chat</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Screen Header Bar */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, spacing.m) }, isDark && styles.topHeaderDark]}>
        <Text style={[styles.screenTitle, isDark && styles.textLight]}>
          My Rides & Passes
        </Text>
        <Text style={styles.screenSubtitle}>
          Access digital tickets, boarding QR, and cancellation history
        </Text>

        {/* Segmented Control Tabs */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'upcoming' && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'upcoming' && styles.segmentTextActive,
              ]}
            >
              Upcoming ({upcomingList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'completed' && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab('completed')}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'completed' && styles.segmentTextActive,
              ]}
            >
              Past Trips ({pastList.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrapper}>
          <LoadingSkeleton height={180} style={{ marginBottom: spacing.l }} />
          <LoadingSkeleton height={180} />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item._id}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.teal]}
              tintColor={colors.teal}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="🎫"
              title={activeTab === 'upcoming' ? 'No Upcoming Rides' : 'No Past Rides'}
              message={
                activeTab === 'upcoming'
                  ? 'You do not have any active boat bookings right now. Explore Varanasi boats and book your Ganga ride!'
                  : 'You have not taken any rides yet.'
              }
              actionTitle="Explore Boats"
              onAction={() => navigation.navigate('Boats')}
            />
          }
        />
      )}

      {/* Post-Ride Community Review Modal */}
      <ReviewModal
        visible={showReviewModal}
        booking={selectedReviewBooking}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedReviewBooking(null);
        }}
        onReviewSubmitted={(rev) => {
          setBookings((prev) =>
            prev.map((b) =>
              b._id === selectedReviewBooking?._id
                ? { ...b, reviewed: true, userReview: rev }
                : b
            )
          );
          loadBookings(true);
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
  topHeader: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  topHeaderDark: {
    backgroundColor: '#0a1e23',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  screenTitle: {
    ...typography.h2,
    color: colors.ink,
  },
  screenSubtitle: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
    marginBottom: spacing.m,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: radii.m,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.s,
  },
  segmentBtnActive: {
    backgroundColor: colors.white,
    ...shadows.card,
  },
  segmentText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.gray600,
  },
  segmentTextActive: {
    color: colors.teal,
    fontWeight: '700',
  },
  loadingWrapper: {
    padding: spacing.l,
  },
  list: {
    padding: spacing.l,
    paddingBottom: 40,
  },
  card: {
    marginBottom: spacing.l,
    padding: spacing.l,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketId: {
    ...typography.mono,
    color: colors.teal,
    fontSize: 12,
  },
  boatName: {
    ...typography.h3,
    color: colors.ink,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.m,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.gray500,
  },
  infoValue: {
    ...typography.bodySmall,
    color: colors.ink,
    fontWeight: '600',
    marginTop: 2,
  },
  fareValue: {
    ...typography.h4,
    color: colors.teal,
    fontWeight: '700',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.m,
    marginTop: spacing.s,
  },
  actionBtnOutline: {
    flex: 1,
    backgroundColor: colors.tealMist,
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  actionBtnOutlineText: {
    ...typography.button,
    color: colors.teal,
    fontSize: 13,
  },
  actionBtnReview: {
    flex: 1,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  actionBtnReviewText: {
    ...typography.button,
    color: '#92400e',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnChat: {
    paddingVertical: 10,
    paddingHorizontal: spacing.l,
    backgroundColor: colors.gray100,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  actionBtnChatText: {
    ...typography.button,
    color: colors.gray700,
    fontSize: 13,
  },
});
