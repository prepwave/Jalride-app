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

  const loadFleet = async () => {
    try {
      const data = await api.getOwnerBoats();
      setBoats(data || []);
    } catch (e) {
      console.warn('Error fetching fleet:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFleet();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadFleet();
  };

  const handleToggleStatus = (boatId, currentStatus) => {
    const nextStatus = currentStatus === 'available' ? 'maintenance' : 'available';
    setBoats((prev) =>
      prev.map((b) => (b._id === boatId ? { ...b, status: nextStatus } : b))
    );
    Alert.alert('Boat Status Updated', `Boat marked as ${nextStatus.toUpperCase()} on Varanasi ghat schedule.`);
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="My Boat Fleet"
        subtitle="Manage vessels, fares, and ghat availability"
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
        renderItem={({ item }) => (
          <Card style={styles.boatCard}>
            <Image
              source={{ uri: item.images?.[0] || 'https://images.unsplash.com/photo-1598977123418-454555aa04f8?w=800&q=80' }}
              style={styles.boatImg}
            />

            <View style={styles.cardBody}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.boatName, isDark && styles.textLight]}>{item.boatName}</Text>
                  <Text style={styles.ghatText}>📍 Stationed: {item.location}</Text>
                </View>
                <Badge
                  label={item.status || 'available'}
                  variant={item.status === 'maintenance' ? 'warning' : 'success'}
                />
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLbl}>Capacity</Text>
                  <Text style={styles.metaVal}>{item.capacity} Seats</Text>
                </View>

                <View style={styles.metaCol}>
                  <Text style={styles.metaLbl}>Base Fare</Text>
                  <Text style={styles.metaVal}>₹{item.price} / seat</Text>
                </View>

                <View style={styles.metaCol}>
                  <Text style={styles.metaLbl}>Category</Text>
                  <Text style={styles.metaVal}>{item.boatType}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.statusToggleBtn}
                  onPress={() => handleToggleStatus(item._id, item.status)}
                >
                  <Text style={styles.statusToggleText}>
                    {item.status === 'available' ? 'Set Maintenance' : 'Set Available'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => navigation.navigate('AddEditBoat', { boat: item })}
                >
                  <Text style={styles.editBtnText}>Edit Details ✏️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🛶</Text>
            <Text style={{ ...typography.bodyMedium, color: colors.gray500, textAlign: 'center', marginBottom: spacing.m }}>
              No vessels registered in your fleet yet.
            </Text>
            <TouchableOpacity
              style={styles.addBoatBtn}
              onPress={() => navigation.navigate('AddEditBoat')}
            >
              <Text style={styles.addBoatBtnText}>+ Register First Vessel</Text>
            </TouchableOpacity>
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
  addBoatBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  addBoatBtnText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  list: {
    padding: spacing.l,
    gap: spacing.l,
    paddingBottom: 40,
  },
  boatCard: {
    padding: 0,
    overflow: 'hidden',
  },
  boatImg: {
    width: '100%',
    height: 160,
    backgroundColor: colors.gray200,
  },
  cardBody: {
    padding: spacing.l,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.m,
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.gray50,
    padding: spacing.m,
    borderRadius: radii.m,
    marginBottom: spacing.m,
  },
  metaCol: {
    alignItems: 'center',
    flex: 1,
  },
  metaLbl: {
    ...typography.caption,
    color: colors.gray500,
  },
  metaVal: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  statusToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.gray100,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  statusToggleText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.gray700,
  },
  editBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.tealMist,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  editBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.teal,
  },
});
