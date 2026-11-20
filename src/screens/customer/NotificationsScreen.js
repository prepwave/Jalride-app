import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';

export default function NotificationsScreen({ navigation }) {
  const { isDark } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data || []);
    } catch (e) {
      console.warn('Error fetching notifications:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false, read: true })));
    try {
      await api.markAllNotificationsRead();
    } catch (_) {}
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Notifications"
        subtitle="Live alerts & ride updates"
        onBack={() => navigation.goBack()}
        rightAction={
          notifications.length > 0 ? (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={styles.markReadText}>Mark all read</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={(item, index) => item._id || item.id || String(index)}
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
          const isUnread = item.unread ?? !item.read;
          return (
            <Card style={[styles.notifCard, isUnread && styles.notifCardUnread]}>
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
                    {isUnread && <View style={styles.unreadDot} />}
                  </View>

                  <Text style={styles.notifMessage}>{item.message || item.body}</Text>
                  <Text style={styles.notifTime}>{item.time || (item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent')}</Text>
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={{ padding: 48, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🔔</Text>
              <Text style={{ ...typography.bodyMedium, color: colors.gray500, textAlign: 'center' }}>
                No notifications right now.
              </Text>
              <Text style={{ ...typography.caption, color: colors.gray400, textAlign: 'center', marginTop: 4 }}>
                Trip updates and ghat announcements will appear here.
              </Text>
            </View>
          ) : null
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
