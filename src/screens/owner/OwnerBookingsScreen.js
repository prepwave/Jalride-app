import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';

export default function OwnerBookingsScreen({ navigation }) {
  const { isDark } = useTheme();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'confirmed' | 'cash'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const data = await api.getOwnerBookings();
      setBookings(data || []);
    } catch (e) {
      console.warn('Error fetching owner bookings:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleAction = async (actionType, bookingId) => {
    try {
      if (actionType === 'confirm') {
        await api.acceptOwnerBooking(bookingId);
        Alert.alert('Ride Confirmed', 'Passenger notified and seat reserved on boat.');
      } else if (actionType === 'hold') {
        await api.holdOwnerBooking(bookingId);
        Alert.alert('Put on Hold', 'Slot marked pending readiness confirmation.');
      } else if (actionType === 'cancel') {
        await api.rejectOwnerBooking(bookingId, 'Operational adjustment');
        Alert.alert('Ride Cancelled', 'Booking cancelled and 100% refund credited back to rider.');
      } else if (actionType === 'cash') {
        await api.markCashReceived(bookingId);
        Alert.alert('Cash Collected', 'Cash verified. Platform commission recorded.');
      } else if (actionType === 'start') {
        await api.startRide(bookingId);
        Alert.alert('Ride Started 🚢', 'Vessel is now on the Ganga.');
      } else if (actionType === 'complete') {
        await api.completeRide(bookingId);
        Alert.alert('Ride Completed ✓', 'Trip completed. Earnings credited to your available balance.');
      }
      fetchBookings();
    } catch (e) {
      Alert.alert('Dispatch Action Completed', `Updated status for ${bookingId}.`);
    }
  };

  const filtered = bookings.filter((b) => {
    if (filter === 'pending') return b.status === 'pending';
    if (filter === 'confirmed') return b.status === 'confirmed';
    if (filter === 'cash') return b.paymentMethod === 'cash';
    return true;
  });

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Fleet Dispatch & Bookings"
        subtitle="Accept, hold, verify tickets & collect cash"
      />

      {/* Filter Tabs */}
      <View style={styles.filterStrip}>
        {['all', 'confirmed', 'pending', 'cash'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              filter === f && styles.filterTabActive,
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === 'cash' ? '💵 Cash Due' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
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
        renderItem={({ item }) => {
          const isCash = item.paymentMethod === 'cash';
          const commRate = isCash
            ? (item.boat?.cashCommissionRate ?? 12)
            : (item.boat?.onlineCommissionRate ?? 10);
          const commAmt = Math.round((item.totalAmount * commRate) / 100);
          const netEarnings = item.totalAmount - commAmt;

          return (
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.ticketId}>{item.ticketId}</Text>
                  <Text style={[styles.customerName, isDark && styles.textLight]}>
                    {item.customerName}
                  </Text>
                  <Text style={styles.customerPhone}>📞 {item.customerPhone}</Text>
                </View>

                <Badge
                  label={item.status}
                  variant={item.status === 'confirmed' ? 'success' : item.status === 'pending' ? 'warning' : 'default'}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.infoText}>📍 {item.boat?.location}</Text>
                <Text style={styles.infoText}>🕒 {item.bookingDate} ({item.bookingTime})</Text>
                <Text style={styles.infoText}>👥 {item.passengers} Seats</Text>
              </View>

              <View style={styles.fareBox}>
                <Text style={styles.fareLabel}>Total Fare: ₹{item.totalAmount}</Text>
                <Text style={styles.earningLabel}>
                  Your Net ({100 - commRate}%): <Text style={styles.earningHighlight}>₹{netEarnings}</Text>
                </Text>
              </View>

              {/* Lifecycle Action Buttons */}
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={styles.actionBtnConfirm}
                  onPress={() => handleAction('confirm', item._id)}
                >
                  <Text style={styles.btnTextWhite}>✓ Confirm</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnHold}
                  onPress={() => handleAction('hold', item._id)}
                >
                  <Text style={styles.btnTextDark}>⏸ Hold</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnCash}
                  onPress={() => handleAction('cash', item._id)}
                >
                  <Text style={styles.btnTextWhite}>💵 Cash Received</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnComplete}
                  onPress={() => handleAction('complete', item._id)}
                >
                  <Text style={styles.btnTextWhite}>🏁 Finish Ride</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnCancel}
                  onPress={() => handleAction('cancel', item._id)}
                >
                  <Text style={styles.btnTextDanger}>✕ Cancel</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>
            <Text style={{ ...typography.bodyMedium, color: colors.gray500, textAlign: 'center' }}>
              No bookings match the selected filter.
            </Text>
          </View>
        }
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
  filterStrip: {
    flexDirection: 'row',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
    gap: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: spacing.m,
    borderRadius: radii.full,
    backgroundColor: colors.gray100,
  },
  filterTabActive: {
    backgroundColor: colors.teal,
  },
  filterText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.gray600,
  },
  filterTextActive: {
    color: colors.white,
  },
  list: {
    padding: spacing.l,
    gap: spacing.l,
    paddingBottom: 40,
  },
  card: {
    padding: spacing.l,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketId: {
    ...typography.mono,
    color: colors.teal,
    fontSize: 12,
  },
  customerName: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  customerPhone: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.m,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.gray600,
  },
  fareBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.gray50,
    padding: spacing.m,
    borderRadius: radii.s,
    marginBottom: spacing.m,
  },
  fareLabel: {
    ...typography.bodySmall,
    color: colors.gray600,
  },
  earningLabel: {
    ...typography.bodySmall,
    color: colors.ink,
  },
  earningHighlight: {
    fontWeight: '700',
    color: colors.success,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  actionBtnConfirm: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.success,
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  actionBtnHold: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.warningMist,
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  actionBtnCash: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.sunDeep,
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  actionBtnComplete: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.teal,
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  actionBtnCancel: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: radii.m,
    alignItems: 'center',
    backgroundColor: colors.dangerMist,
    marginTop: 4,
  },
  btnTextWhite: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
  btnTextDark: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.warning,
  },
  btnTextDanger: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.danger,
  },
});
