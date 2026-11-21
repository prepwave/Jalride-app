import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';

export const resolveBoatImage = (item) => {
  if (Array.isArray(item?.images) && item.images.length > 0) {
    const first = item.images[0];
    if (first && typeof first === 'object') {
      const candidate = first.url || first.secure_url || first.thumbnailUrl;
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
    if (typeof first === 'string' && first.trim().length > 0) {
      return first.trim();
    }
  }
  if (typeof item?.imageUrl === 'string' && item.imageUrl.trim().length > 0) {
    return item.imageUrl.trim();
  }
  return 'https://images.unsplash.com/photo-1598977123418-454555aa04f8?w=800&q=80';
};

export default function AdminBoatsScreen({ route, navigation }) {
  const { isDark } = useTheme();
  const initialFilter = route?.params?.initialFilter || 'all';
  const [boats, setBoats] = useState([]);
  const [filter, setFilter] = useState(initialFilter); // 'all' | 'pending' | 'approved' | 'rejected'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (route?.params?.initialFilter) {
      setFilter(route.params.initialFilter);
    }
  }, [route?.params?.initialFilter]);

  const loadBoats = async () => {
    setError(null);
    try {
      const data = await api.getAdminBoats();
      if (isMountedRef.current) {
        const boatList = Array.isArray(data) ? data : (Array.isArray(data?.boats) ? data.boats : []);
        setBoats(boatList);
      }
    } catch (e) {
      console.warn('Error fetching admin boats:', e);
      if (isMountedRef.current) {
        setError(e.message || 'Failed to load fleet data.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
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
    if (actionLoadingId) return;
    setActionLoadingId(boatId);
    try {
      await api.approveBoat(boatId);
      if (isMountedRef.current) {
        setBoats((prev) =>
          prev.map((b) => (b._id === boatId ? { ...b, approvalStatus: 'approved' } : b))
        );
        Alert.alert('Boat Approved ✓', 'Boat is now officially listed and searchable on Varanasi ghat schedule.');
      }
    } catch (err) {
      Alert.alert('Approval Error', err.message || 'Failed to approve boat.');
    } finally {
      if (isMountedRef.current) {
        setActionLoadingId(null);
      }
    }
  };

  const handleReject = async (boatId) => {
    if (actionLoadingId) return;
    setActionLoadingId(boatId);
    try {
      await api.rejectBoat(boatId, 'Administrative compliance review requirement not met');
      if (isMountedRef.current) {
        setBoats((prev) =>
          prev.map((b) => (b._id === boatId ? { ...b, approvalStatus: 'rejected' } : b))
        );
        Alert.alert('Boat Rejected ✕', 'Boat registration has been rejected and owner notified.');
      }
    } catch (err) {
      Alert.alert('Rejection Error', err.message || 'Failed to reject boat.');
    } finally {
      if (isMountedRef.current) {
        setActionLoadingId(null);
      }
    }
  };

  const filteredBoats = boats.filter((b) => {
    if (filter === 'all') return true;
    const approval = b.approvalStatus || 'pending';
    return approval.toLowerCase() === filter.toLowerCase();
  });

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
        {['all', 'pending', 'approved', 'rejected'].map((f) => (
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

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={[styles.loadingText, isDark && styles.textLight]}>
            Loading registered vessels...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>⚠️</Text>
          <Text style={[styles.errorText, isDark && styles.textLight]}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadBoats}>
            <Text style={styles.retryBtnText}>Retry Loading Fleet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredBoats}
          keyExtractor={(item, index) => item?._id || item?.id || String(index)}
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
            const approvalStatus = (item.approvalStatus || 'pending').toLowerCase();
            const badgeVariant =
              approvalStatus === 'approved'
                ? 'success'
                : approvalStatus === 'rejected'
                ? 'danger'
                : 'warning';
            const isActing = actionLoadingId === item._id;

            const ownerName =
              item.owner && typeof item.owner === 'object'
                ? item.owner.name || item.owner.email || 'Registered Operator'
                : typeof item.owner === 'string'
                ? item.owner
                : 'Registered Operator';

            return (
              <Card style={styles.card}>
                <View style={styles.cardRow}>
                  <Image
                    source={{ uri: resolveBoatImage(item) }}
                    style={styles.cardImg}
                    resizeMode="cover"
                  />

                  <View style={styles.cardInfo}>
                    <View style={styles.rowBetween}>
                      <Text style={[styles.boatTitle, isDark && styles.textLight]} numberOfLines={1}>
                        {item.boatName || 'Unnamed Vessel'}
                      </Text>
                      <Badge
                        label={approvalStatus.toUpperCase()}
                        variant={badgeVariant}
                        size="small"
                      />
                    </View>

                    <Text style={styles.ghatLabel}>
                      📍 {item.location || 'Varanasi Ghats'} • {item.boatType || 'Boat'}
                    </Text>
                    <Text style={styles.ownerText}>Owner: {ownerName}</Text>
                    <Text style={styles.fareText}>
                      ₹{item.price ?? 0} / seat • {item.capacity ?? 0} Seats
                    </Text>
                  </View>
                </View>

                {/* Admin Approval Action Row */}
                <View style={styles.actionRow}>
                  {approvalStatus === 'approved' ? (
                    <View style={styles.resolvedRow}>
                      <Text style={styles.approvedNotice}>✓ Vessel Active & Approved for Passenger Boarding</Text>
                      <TouchableOpacity
                        style={[styles.smallRejectBtn, isActing && styles.btnDisabled]}
                        disabled={isActing}
                        onPress={() => handleReject(item._id)}
                      >
                        <Text style={styles.rejectText}>Revoke / Reject</Text>
                      </TouchableOpacity>
                    </View>
                  ) : approvalStatus === 'rejected' ? (
                    <View style={styles.resolvedRow}>
                      <Text style={styles.rejectedNotice}>✕ Vessel Application Rejected</Text>
                      <TouchableOpacity
                        style={[styles.smallApproveBtn, isActing && styles.btnDisabled]}
                        disabled={isActing}
                        onPress={() => handleApprove(item._id)}
                      >
                        <Text style={styles.approveText}>Re-Approve</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.approveBtn, isActing && styles.btnDisabled]}
                        disabled={isActing}
                        onPress={() => handleApprove(item._id)}
                      >
                        {isActing ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Text style={styles.approveText}>✓ Approve Vessel</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.rejectBtn, isActing && styles.btnDisabled]}
                        disabled={isActing}
                        onPress={() => handleReject(item._id)}
                      >
                        <Text style={styles.rejectText}>✕ Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🛶</Text>
              <Text style={{ ...typography.bodyMedium, color: colors.gray500, textAlign: 'center' }}>
                {filter === 'pending'
                  ? 'No pending boat registrations awaiting inspection.'
                  : filter === 'approved'
                  ? 'No approved vessels in this category.'
                  : filter === 'rejected'
                  ? 'No rejected vessels.'
                  : 'No vessels registered in the platform registry.'}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.gray600,
    marginTop: spacing.m,
  },
  errorText: {
    ...typography.bodyMedium,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.m,
  },
  retryBtn: {
    backgroundColor: colors.teal,
    paddingVertical: 10,
    paddingHorizontal: spacing.l,
    borderRadius: radii.m,
  },
  retryBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
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
  resolvedRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  approvedNotice: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    flex: 1,
  },
  rejectedNotice: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
    flex: 1,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: colors.success,
    paddingVertical: 8,
    borderRadius: radii.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallApproveBtn: {
    backgroundColor: colors.success,
    paddingVertical: 6,
    paddingHorizontal: spacing.m,
    borderRadius: radii.m,
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
    justifyContent: 'center',
  },
  smallRejectBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.m,
    backgroundColor: colors.dangerMist,
    borderRadius: radii.m,
  },
  rejectText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.danger,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
