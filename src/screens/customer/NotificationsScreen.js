import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';

const MOCK_NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'Ride Confirmed for Subah-e-Banaras 🌅',
    message: 'Your booking for Maa Ganga Express Bajra tomorrow at 05:30 AM is confirmed. Captain Rameshwar is preparing the vessel.',
    time: '15 mins ago',
    type: 'booking',
    unread: true,
  },
  {
    id: 'n2',
    title: 'Cashback Credited: ₹100 🎁',
    message: 'Promotional ₹100 cashback has been credited to your JalRide wallet balance.',
    time: '2 hours ago',
    type: 'wallet',
    unread: true,
  },
  {
    id: 'n3',
    title: 'Ganga Water Level Normal 🌊',
    message: 'District Ganga Navigation Authority reports calm river currents. All 84 ghats open for boat tours.',
    time: '1 day ago',
    type: 'weather',
    unread: false,
  },
  {
    id: 'n4',
    title: 'Dev Deepawali Special Slots Open ✨',
    message: 'Advance bookings for grand Ganga Aarti illumination bajras now live with early bird discounts.',
    time: '2 days ago',
    type: 'promo',
    unread: false,
  },
];

export default function NotificationsScreen({ navigation }) {
  const { isDark } = useTheme();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Notifications"
        subtitle="Live alerts & pilgrimage announcements"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markReadText}>Mark all read</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card style={[styles.notifCard, item.unread && styles.notifCardUnread]}>
            <View style={styles.notifRow}>
              <View style={styles.iconBox}>
                <Text style={styles.iconEmoji}>
                  {item.type === 'booking' ? '🛶' : item.type === 'wallet' ? '👛' : item.type === 'weather' ? '🌊' : '✨'}
                </Text>
              </View>

              <View style={styles.notifContent}>
                <View style={styles.notifHeaderRow}>
                  <Text style={[styles.notifTitle, isDark && styles.textLight]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.unread && <View style={styles.unreadDot} />}
                </View>

                <Text style={styles.notifMessage}>{item.message}</Text>
                <Text style={styles.notifTime}>{item.time}</Text>
              </View>
            </View>
          </Card>
        )}
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
  markReadText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '700',
  },
  list: {
    padding: spacing.l,
    gap: spacing.m,
  },
  notifCard: {
    padding: spacing.l,
  },
  notifCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: colors.teal,
  },
  notifRow: {
    flexDirection: 'row',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  iconEmoji: {
    fontSize: 20,
  },
  notifContent: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal,
    marginLeft: spacing.s,
  },
  notifMessage: {
    ...typography.bodySmall,
    color: colors.gray600,
    lineHeight: 18,
    marginBottom: 6,
  },
  notifTime: {
    ...typography.caption,
    color: colors.gray400,
    fontSize: 11,
  },
});
