import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
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

export default function AdminBoatsScreen({ navigation }) {
  const { isDark } = useTheme();
  const [boats, setBoats] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'approved'
  const [refreshing, setRefreshing] = useState(false);

  const loadBoats = async () => {
    try {
      const data = await api.getAdminBoats();
      setBoats(data || []);
    } catch (e) {
      console.warn('Error fetching admin boats:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBoats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadBoats();
  };

  const handleApprove = async (boatId) => {
    try {
      await api.approveBoat(boatId);
      setBoats((prev) =>
        prev.map((b) => (b._id === boatId ? { ...b, approvalStatus: 'approved', status: 'approved' } : b))
      );
      Alert.alert('Boat Approved ✓', 'Boat is now officially listed and searchable on Varanasi ghat schedule.');
      loadBoats();
    } catch (err) {
      Alert.alert('Approval Error', err.message || 'Failed to approve boat.');
    }
  };

  const handleReject = async (boatId) => {
    try {
      await api.rejectBoat(boatId, 'Administrative compliance review requirement not met');
      setBoats((prev) =>
        prev.map((b) => (b._id === boatId ? { ...b, approvalStatus: 'rejected', status: 'rejected' } : b))
      );
      Alert.alert('Boat Rejected ✕', 'Boat registration has been rejected and owner notified.');
      loadBoats();
    } catch (err) {
      Alert.alert('Rejection Error', err.message || 'Failed to reject boat.');
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Fleet Approval & Oversight"
        subtitle="Varanasi River Navigation Compliance"
        onBack={() => navigation.goBack()}
      />

      {/* Filter strip */}
      <View style={styles.filterStrip}>
        {['all', 'pending', 'approved'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterPill,
              filter === f && styles.filterPillActive,
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterPillText,
                filter === f && styles.filterPillTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={boats}
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
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardRow}>
              <Image
                source={{ uri: item.images?.[0] || 'https://images.unsplash.com/photo-1598977123418-454555aa04f8?w=800&q=80' }}
                style={styles.cardImg}
              />

              <View style={styles.cardInfo}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.boatTitle, isDark && styles.textLight]} numberOfLines={1}>
                    {item.boatName}
                  </Text>
                  <Badge
                    label={item.status || 'approved'}
                    variant={item.status === 'rejected' ? 'danger' : 'success'}
                    size="small"
                  />
                </View>

                <Text style={styles.ghatLabel}>📍 {item.location} • {item.boatType}</Text>
                <Text style={styles.ownerText}>Owner: {item.owner?.name || 'Registered Operator'}</Text>
                <Text style={styles.fareText}>₹{item.price} / seat • {item.capacity} Seats</Text>
              </View>
            </View>

            {/* Admin Approval Action Row */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => handleApprove(item._id)}
              >
                <Text style={styles.approveText}>✓ Approve Vessel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => handleReject(item._id)}
              >
                <Text style={styles.rejectText}>✕ Reject</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🛶</Text>
            <Text style={{ ...typography.bodyMedium, color: colors.gray500, textAlign: 'center' }}>
              No vessels registered under this status.
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
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.m,
    borderRadius: radii.full,
    backgroundColor: colors.gray100,
  },
  filterPillActive: {
    backgroundColor: colors.teal,
  },
  filterPillText: {
    ...typography.caption,
    color: colors.gray600,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: colors.white,
  },
  list: {
    padding: spacing.l,
    gap: spacing.m,
    paddingBottom: 40,
  },
  card: {
    padding: spacing.m,
  },
  cardRow: {
    flexDirection: 'row',
  },
  cardImg: {
    width: 80,
    height: 80,
    borderRadius: radii.m,
    backgroundColor: colors.gray200,
    marginRight: spacing.m,
  },
  cardInfo: {
    flex: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boatTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
    flex: 1,
    marginRight: 4,
  },
  ghatLabel: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '600',
    marginTop: 2,
  },
  ownerText: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: 2,
  },
  fareText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.s,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: colors.success,
    paddingVertical: 8,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  approveText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
  rejectBtn: {
    paddingVertical: 8,
    paddingHorizontal: spacing.l,
    backgroundColor: colors.dangerMist,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  rejectText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.danger,
  },
});
