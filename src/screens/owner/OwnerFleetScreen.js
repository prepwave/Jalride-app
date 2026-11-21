import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  AppState,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';

export default function OwnerFleetScreen({ navigation }) {
  const { isDark } = useTheme();
  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const isFetchingRef = useRef(false);
  const hasQueuedRefreshRef = useRef(false);

  const loadFleet = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) {
      hasQueuedRefreshRef.current = true;
      return;
    }
    isFetchingRef.current = true;
    if (!isSilent) setLoading(true);
    try {
      const data = await api.getOwnerBoats();
      setBoats(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Error fetching fleet:', e);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      if (hasQueuedRefreshRef.current) {
        hasQueuedRefreshRef.current = false;
        loadFleet(true);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFleet(true);
    }, [loadFleet])
  );

  useEffect(() => {
    loadFleet();
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadFleet(true);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [loadFleet]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFleet(false);
  };

  const handleToggleStatus = async (boatId, currentStatus) => {
    const nextStatus = currentStatus === 'available' ? 'maintenance' : 'available';
    setUpdatingId(boatId);
    try {
      const res = await api.updateBoatStatus(boatId, nextStatus);
      if (res && res.success) {
        Alert.alert(
          'Vessel Status Updated',
          `Boat marked as ${nextStatus.toUpperCase()} on Varanasi live booking schedule.`
        );
        await loadFleet(true);
      } else {
        throw new Error(res?.message || 'Status update failed.');
      }
    } catch (err) {
      Alert.alert('Status Update Failed', err.message || 'Could not update boat status on server.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteBoat = (boat) => {
    Alert.alert(
      'Delete Boat Listing',
      `Are you sure you want to remove "${boat.boatName}" from your active fleet?\n\nThis will permanently delete the vessel and its photos from public listings. Any completed passenger ride history will remain preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            setUpdatingId(boat._id);
            try {
              const res = await api.deleteBoat(boat._id);
              if (res && res.success) {
                Alert.alert('Boat Deleted', `${boat.boatName} has been removed from your fleet.`);
                await loadFleet(true);
              } else {
                throw new Error(res?.message || 'Delete operation failed.');
              }
            } catch (err) {
              Alert.alert('Delete Failed', err.message || 'Unable to delete vessel. Please try again.');
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  const resolveBoatImage = (item) => {
    if (Array.isArray(item.images) && item.images.length > 0) {
      const first = item.images[0];
      if (typeof first === 'object' && first !== null) {
        return first.url || first.secure_url || first.thumbnailUrl;
      }
      if (typeof first === 'string' && first.length > 0) {
        return first;
      }
    }
    return item.imageUrl || 'https://images.unsplash.com/photo-1598977123418-454555aa04f8?w=800&q=80';
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="My Boat Fleet"
        subtitle="Manage vessels, fares, departure slots & availability"
        rightAction={
          <TouchableOpacity
            style={styles.addBoatBtn}
            onPress={() => navigation.navigate('AddEditBoat')}
          >
            <Text style={styles.addBoatBtnText}>+ Add Boat</Text>
          </TouchableOpacity>
        }
      />

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
        renderItem={({ item }) => {
          const isBusy = updatingId === item._id;
          const imgUri = resolveBoatImage(item);
          const isMaintenance = item.status === 'maintenance';

          return (
            <Card style={styles.boatCard}>
              <View style={styles.mediaContainer}>
                <Image source={{ uri: imgUri }} style={styles.boatImg} />
                <View style={styles.badgeOver}>
                  <Badge
                    label={isMaintenance ? '🛠️ In Maintenance' : '🟢 Active & Available'}
                    variant={isMaintenance ? 'warning' : 'success'}
                    size="small"
                  />
                </View>
                <View style={styles.approvalBadgeOver}>
                  <Badge
                    label={item.approvalStatus === 'approved' ? '✓ Verified' : (item.approvalStatus || 'Pending')}
                    variant={item.approvalStatus === 'approved' ? 'teal' : 'default'}
                    size="small"
                  />
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.boatName, isDark && styles.textLight]}>{item.boatName}</Text>
                    <Text style={styles.ghatText}>📍 Stationed: {item.location}</Text>
                  </View>
                  <Text style={styles.boatTypePill}>{item.boatType}</Text>
                </View>

                {/* Metadata Grid */}
                <View style={styles.metaRow}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLbl}>Capacity</Text>
                    <Text style={styles.metaVal}>{item.capacity} Riders</Text>
                  </View>

                  <View style={styles.metaCol}>
                    <Text style={styles.metaLbl}>Standard Fare</Text>
                    <Text style={styles.metaFare}>₹{item.price} / seat</Text>
                  </View>

                  <View style={styles.metaCol}>
                    <Text style={styles.metaLbl}>Private Charter</Text>
                    <Text style={styles.metaVal}>
                      {item.allowWholeBoatBooking && item.wholeBoatPrice
                        ? `₹${item.wholeBoatPrice}`
                        : 'Unavailable'}
                    </Text>
                  </View>
                </View>

                {/* Primary Action Button: Calendar & Departure Slots */}
                <TouchableOpacity
                  style={styles.calendarBtn}
                  onPress={() => navigation.navigate('OwnerAvailability', { boat: item })}
                >
                  <Text style={styles.calendarBtnText}>📅 Calendar, Slots & Maintenance →</Text>
                </TouchableOpacity>

                {/* Secondary Action Row: Maintenance Toggle & Edit & Delete */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[
                      styles.statusToggleBtn,
                      isMaintenance ? styles.statusToggleBtnActive : {},
                    ]}
                    onPress={() => handleToggleStatus(item._id, item.status)}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color={colors.ink} />
                    ) : (
                      <Text style={styles.statusToggleText}>
                        {isMaintenance ? '🟢 Set Available' : '🛠️ Maintenance'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => navigation.navigate('AddEditBoat', { boat: item })}
                  >
                    <Text style={styles.editBtnText}>✏️ Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteBoat(item)}
                    disabled={isBusy}
                  >
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 60, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.teal} />
              <Text style={{ marginTop: 12, ...typography.bodySmall, color: colors.gray500 }}>
                Loading registered fleet...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>🛶</Text>
              <Text style={styles.emptyTitle}>No Vessels Registered Yet</Text>
              <Text style={styles.emptySub}>
                List your boat or bajra to start accepting pilgrim rides, Ganga Aarti bookings, and sunrise cruises.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => navigation.navigate('AddEditBoat')}
              >
                <Text style={styles.emptyAddBtnText}>+ Register Your First Boat</Text>
              </TouchableOpacity>
            </View>
          )
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
  list: {
    padding: spacing.m,
    paddingBottom: 80,
  },
  addBoatBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  addBoatBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
  boatCard: {
    marginBottom: spacing.l,
    overflow: 'hidden',
    padding: 0,
    backgroundColor: colors.white,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  mediaContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: colors.gray100,
  },
  boatImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgeOver: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  approvalBadgeOver: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  cardBody: {
    padding: spacing.l,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  boatName: {
    ...typography.h3,
    color: colors.ink,
  },
  ghatText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '600',
    marginTop: 2,
  },
  boatTypePill: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.gray600,
    backgroundColor: colors.gray100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.s,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: colors.mist,
    padding: spacing.m,
    borderRadius: radii.m,
    marginTop: spacing.m,
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 1,
  },
  metaLbl: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  metaVal: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  metaFare: {
    ...typography.bodySmall,
    fontWeight: '800',
    color: colors.teal,
    marginTop: 2,
  },
  calendarBtn: {
    backgroundColor: colors.tealMist,
    borderWidth: 1,
    borderColor: colors.teal,
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
    marginTop: spacing.m,
  },
  calendarBtnText: {
    ...typography.button,
    color: colors.teal,
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.s,
  },
  statusToggleBtn: {
    flex: 2,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusToggleBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  statusToggleText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
  },
  editBtn: {
    flex: 1.5,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
  },
  deleteBtn: {
    width: 44,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 14,
  },
  emptyBox: {
    padding: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: 8,
  },
  emptySub: {
    ...typography.bodySmall,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.l,
    maxWidth: 280,
  },
  emptyAddBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.l,
    paddingVertical: 12,
    borderRadius: radii.full,
    ...shadows.soft,
  },
  emptyAddBtnText: {
    ...typography.button,
    color: colors.white,
  },
});
