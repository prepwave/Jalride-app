import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  StatusBar,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { MOCK_GHATS } from '../../services/mockData';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import StarRating from '../../components/common/StarRating';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, switchRole } = useAuth();
  const { isDark } = useTheme();
  const [boats, setBoats] = useState([]);
  const [selectedGhat, setSelectedGhat] = useState('All Ghats');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await api.getBoats({ location: selectedGhat });
      setBoats(data || []);
    } catch (e) {
      console.warn('Error loading boats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedGhat]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, spacing.m) }, isDark && styles.topBarDark]}>
        <View>
          <Text style={[styles.welcomeSub, isDark && styles.textMutedDark]}>
            Har Har Gange 🙏
          </Text>
          <Text style={[styles.userName, isDark && styles.textLight]}>
            {user?.name ? user.name : 'Welcome to JalRide'}
          </Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.notifIcon}>🔔</Text>
            <View style={styles.notifDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
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
        {/* Hero Card Banner */}
        <View style={styles.heroWrapper}>
          <View style={styles.heroCard}>
            <View style={styles.heroOverlay}>
              <Badge
                label="VARANASI GANGA GHATS"
                variant="sun"
                size="small"
                style={styles.heroBadge}
              />
              <Text style={styles.heroTitle}>Book Safe & Smart Boat Rides</Text>
              <Text style={styles.heroSubtitle}>
                Instant ghat QR boarding or advance slot reservations across 84 holy ghats.
              </Text>

              <View style={styles.heroBtnRow}>
                <TouchableOpacity
                  style={styles.heroPrimaryBtn}
                  onPress={() => navigation.navigate('Boats')}
                >
                  <Text style={styles.heroPrimaryBtnText}>Explore Fleet</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.heroSecondaryBtn}
                  onPress={() => navigation.navigate('ScanQR')}
                >
                  <Text style={styles.heroSecondaryBtnText}>⚡ Scan Ghat QR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Action Grid */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('ScanQR')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: colors.sunMist }]}>
              <Text style={styles.actionIcon}>⚡</Text>
            </View>
            <Text style={[styles.actionLabel, isDark && styles.textLight]}>
              Instant QR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Boats')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: colors.tealMist }]}>
              <Text style={styles.actionIcon}>🛶</Text>
            </View>
            <Text style={[styles.actionLabel, isDark && styles.textLight]}>
              Book Boat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('MyRides')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: colors.successMist }]}>
              <Text style={styles.actionIcon}>🎫</Text>
            </View>
            <Text style={[styles.actionLabel, isDark && styles.textLight]}>
              My Passes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Wallet')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: colors.infoMist }]}>
              <Text style={styles.actionIcon}>👛</Text>
            </View>
            <Text style={[styles.actionLabel, isDark && styles.textLight]}>
              Wallet
            </Text>
          </TouchableOpacity>
        </View>

        {/* Ganga Aarti Special Banner */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.aartiBanner}
          onPress={() => navigation.navigate('Boats', { filterType: 'Bajra' })}
        >
          <View style={styles.aartiLeft}>
            <Text style={styles.aartiTag}>🔥 EVENING GANGA AARTI</Text>
            <Text style={styles.aartiHeading}>Dashashwamedh Ghat Aarti Bajra</Text>
            <Text style={styles.aartiDesc}>
              Front-row river views of the sacred Maha Aarti with traditional music.
            </Text>
          </View>
          <View style={styles.aartiRight}>
            <Text style={styles.aartiArrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Ghat Filter Chips */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
            Explore by Ghat
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ghatScroll}
        >
          {MOCK_GHATS.map((ghat) => {
            const isSelected = selectedGhat === ghat;
            return (
              <TouchableOpacity
                key={ghat}
                style={[
                  styles.ghatChip,
                  isSelected && styles.ghatChipSelected,
                  isDark && !isSelected && styles.ghatChipDark,
                ]}
                onPress={() => setSelectedGhat(ghat)}
              >
                <Text
                  style={[
                    styles.ghatChipText,
                    isSelected && styles.ghatChipTextSelected,
                    isDark && !isSelected && styles.textLight,
                  ]}
                >
                  {ghat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Verified Boats Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
            Verified Boats & Naviks
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Boats')}>
            <Text style={styles.seeAllText}>See All ({boats.length})</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.skeletonContainer}>
            <LoadingSkeleton height={180} style={{ marginBottom: spacing.m }} />
            <LoadingSkeleton height={180} />
          </View>
        ) : (
          <View style={styles.boatList}>
            {boats.map((boat) => (
              <Card
                key={boat._id}
                style={styles.boatCard}
                onPress={() => navigation.navigate('BoatDetail', { boatId: boat._id, boat })}
              >
                <Image
                  source={{ uri: boat.images?.[0] || 'https://images.unsplash.com/photo-1598977123418-454555aa04f8?w=800&q=80' }}
                  style={styles.boatImage}
                />
                <View style={styles.boatBadgeOverlay}>
                  <Badge label={boat.boatType} variant="teal" size="small" />
                  {boat.isFeatured && (
                    <Badge label="Featured" variant="sun" size="small" style={{ marginLeft: 6 }} />
                  )}
                </View>

                <View style={styles.boatCardBody}>
                  <View style={styles.boatTitleRow}>
                    <Text style={styles.boatName} numberOfLines={1}>
                      {boat.boatName}
                    </Text>
                    <StarRating rating={boat.rating} count={boat.reviewCount} />
                  </View>

                  <View style={styles.boatMetaRow}>
                    <Text style={styles.metaItem}>📍 {boat.location}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaItem}>👥 Up to {boat.capacity} seats</Text>
                  </View>

                  {/* Amenities Preview */}
                  <View style={styles.amenityRow}>
                    {boat.amenities?.slice(0, 3).map((a, idx) => (
                      <View key={idx} style={styles.amenityChip}>
                        <Text style={styles.amenityText}>✓ {a}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.boatFooterRow}>
                    <View>
                      <Text style={styles.priceLabel}>Starting from</Text>
                      <Text style={styles.priceValue}>₹{boat.price} <Text style={styles.priceUnit}>/ seat</Text></Text>
                    </View>

                    <TouchableOpacity
                      style={styles.bookNowBtn}
                      onPress={() => navigation.navigate('BoatDetail', { boatId: boat._id, boat })}
                    >
                      <Text style={styles.bookNowText}>Book Now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Trust Badges */}
        <View style={styles.trustSection}>
          <Text style={[styles.trustTitle, isDark && styles.textLight]}>
            The JalRide Safety Guarantee
          </Text>
          <View style={styles.trustGrid}>
            <View style={styles.trustCard}>
              <Text style={styles.trustIcon}>🦺</Text>
              <Text style={styles.trustHeading}>100% Life Jackets</Text>
              <Text style={styles.trustSub}>Compulsory safety jackets provided for all riders.</Text>
            </View>

            <View style={styles.trustCard}>
              <Text style={styles.trustIcon}>⚖️</Text>
              <Text style={styles.trustHeading}>Fair Govt Rates</Text>
              <Text style={styles.trustSub}>No bargaining or inflated tourist pricing on ghats.</Text>
            </View>

            <View style={styles.trustCard}>
              <Text style={styles.trustIcon}>🛡️</Text>
              <Text style={styles.trustHeading}>Verified Captains</Text>
              <Text style={styles.trustSub}>All naviks are police & navigation authority certified.</Text>
            </View>
          </View>
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
  textMutedDark: {
    color: '#8fd6de',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.m,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  topBarDark: {
    backgroundColor: '#0a1e23',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  welcomeSub: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  userName: {
    ...typography.h3,
    color: colors.ink,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.s,
    position: 'relative',
  },
  notifIcon: {
    fontSize: 16,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  heroWrapper: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
  },
  heroCard: {
    backgroundColor: colors.deep,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.lift,
  },
  heroOverlay: {
    padding: spacing.xl,
  },
  heroBadge: {
    marginBottom: spacing.s,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.l,
    lineHeight: 20,
  },
  heroBtnRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  heroPrimaryBtn: {
    backgroundColor: colors.sun,
    paddingVertical: 12,
    paddingHorizontal: spacing.l,
    borderRadius: radii.m,
  },
  heroPrimaryBtnText: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 14,
  },
  heroSecondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 12,
    paddingHorizontal: spacing.l,
    borderRadius: radii.m,
  },
  heroSecondaryBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.l,
    marginTop: spacing.xl,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionIconBox: {
    width: 56,
    height: 56,
    borderRadius: radii.l,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    ...shadows.card,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionLabel: {
    ...typography.caption,
    color: colors.ink,
    fontWeight: '600',
  },
  aartiBanner: {
    marginHorizontal: spacing.l,
    marginTop: spacing.xl,
    backgroundColor: '#1b120c',
    borderRadius: radii.l,
    padding: spacing.l,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 150, 60, 0.35)',
    ...shadows.lift,
  },
  aartiLeft: {
    flex: 1,
  },
  aartiTag: {
    ...typography.caption,
    color: colors.sun,
    fontWeight: '700',
    marginBottom: 4,
  },
  aartiHeading: {
    ...typography.h3,
    color: colors.white,
    marginBottom: 4,
  },
  aartiDesc: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.75)',
  },
  aartiRight: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.sun,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.m,
  },
  aartiArrow: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    marginTop: spacing.xxl,
    marginBottom: spacing.m,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.ink,
  },
  seeAllText: {
    ...typography.bodySmall,
    color: colors.teal,
    fontWeight: '600',
  },
  ghatScroll: {
    paddingHorizontal: spacing.l,
    gap: spacing.s,
  },
  ghatChip: {
    paddingHorizontal: spacing.m,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  ghatChipDark: {
    backgroundColor: '#12262b',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ghatChipSelected: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  ghatChipText: {
    ...typography.bodySmall,
    color: colors.ink,
    fontWeight: '500',
  },
  ghatChipTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  boatList: {
    paddingHorizontal: spacing.l,
    gap: spacing.l,
  },
  boatCard: {
    marginBottom: spacing.m,
  },
  boatImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.gray200,
  },
  boatBadgeOverlay: {
    position: 'absolute',
    top: spacing.m,
    left: spacing.m,
    flexDirection: 'row',
  },
  boatCardBody: {
    padding: spacing.l,
  },
  boatTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  boatName: {
    ...typography.h3,
    color: colors.ink,
    flex: 1,
    marginRight: spacing.s,
  },
  boatMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  metaItem: {
    ...typography.bodySmall,
    color: colors.gray600,
  },
  metaDot: {
    marginHorizontal: 6,
    color: colors.gray400,
  },
  amenityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.l,
  },
  amenityChip: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.s,
  },
  amenityText: {
    ...typography.caption,
    color: colors.gray700,
  },
  boatFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.m,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.gray500,
  },
  priceValue: {
    ...typography.h3,
    color: colors.teal,
    fontWeight: '700',
  },
  priceUnit: {
    ...typography.caption,
    color: colors.gray500,
    fontWeight: '400',
  },
  bookNowBtn: {
    backgroundColor: colors.teal,
    paddingVertical: 10,
    paddingHorizontal: spacing.l,
    borderRadius: radii.m,
  },
  bookNowText: {
    ...typography.button,
    color: colors.white,
    fontSize: 13,
  },
  trustSection: {
    paddingHorizontal: spacing.l,
    marginTop: spacing.xxl,
  },
  trustTitle: {
    ...typography.h3,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.l,
  },
  trustGrid: {
    gap: spacing.m,
  },
  trustCard: {
    backgroundColor: colors.white,
    padding: spacing.l,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.line,
  },
  trustIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  trustHeading: {
    ...typography.h4,
    color: colors.ink,
    marginBottom: 2,
  },
  trustSub: {
    ...typography.bodySmall,
    color: colors.gray600,
    lineHeight: 18,
  },
  skeletonContainer: {
    paddingHorizontal: spacing.l,
  },
});
