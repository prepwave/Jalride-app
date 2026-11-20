import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import StarRating from '../../components/common/StarRating';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';

export default function BoatDetailScreen({ navigation, route }) {
  const { boatId, boat: passedBoat } = route.params || {};
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { updateBookingDraft } = useAuth();
  const [boat, setBoat] = useState(passedBoat || null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!boat && boatId) {
      api.getBoatById(boatId).then((data) => setBoat(data));
    }
  }, [boatId]);

  if (!boat) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <Header title="Boat Details" onBack={() => navigation.goBack()} />
        <View style={styles.centerLoading}>
          <Text style={{ color: colors.gray500 }}>Loading boat information...</Text>
        </View>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Book ${boat.boatName} on JalRide at ${boat.location} for ₹${boat.price}! Reliable water tourism & boat booking.`,
        title: boat.boatName,
      });
    } catch (_) {}
  };

  const handleStartBooking = () => {
    updateBookingDraft({
      boat,
      baseFare: boat.price,
    });
    navigation.navigate('BookingWizard', { boat });
  };

  const rawImages = Array.isArray(boat?.images) ? boat.images : [];
  const normalizedImages = rawImages
    .map((img) => (typeof img === 'string' ? img : img?.url || null))
    .filter(Boolean);
  const images =
    normalizedImages.length > 0
      ? normalizedImages
      : ['https://images.unsplash.com/photo-1598977123418-454555aa04f8?w=800&q=80'];

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title={boat.boatName}
        subtitle={`${boat.boatType} • ${boat.location}`}
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
            <Text style={styles.shareIcon}>↗</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Photo Gallery Carousel */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: images[activeImageIndex] }} style={styles.mainImage} />
          <View style={styles.galleryBadge}>
            <Text style={styles.galleryBadgeText}>
              {activeImageIndex + 1} / {images.length} Photos
            </Text>
          </View>
        </View>

        {images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailRow}
          >
            {images.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setActiveImageIndex(idx)}
                style={[
                  styles.thumbnailWrapper,
                  activeImageIndex === idx && styles.thumbnailActive,
                ]}
              >
                <Image source={{ uri: img }} style={styles.thumbnailImg} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Title & Info Card */}
        <View style={styles.contentWrap}>
          <View style={styles.rowBetween}>
            <Badge label={boat.boatType} variant="teal" />
            <StarRating rating={boat.rating} count={boat.reviewCount} size={16} />
          </View>

          <Text style={[styles.boatTitle, isDark && styles.textLight]}>{boat.boatName}</Text>

          <View style={styles.locationRow}>
            <Text style={styles.locationText}>📍 Boarding Point: <Text style={{ fontWeight: '700', color: colors.teal }}>{boat.location}</Text></Text>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statIcon}>👥</Text>
              <Text style={styles.statVal}>{boat.capacity} Max</Text>
              <Text style={styles.statLbl}>Rider Capacity</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statIcon}>🦺</Text>
              <Text style={styles.statVal}>
                {boat.safety?.lifeJacketsCount
                  ? `${boat.safety.lifeJacketsCount} Available`
                  : boat.safety?.lifeJacketsAvailable
                  ? 'Equipped'
                  : 'On Request'}
              </Text>
              <Text style={styles.statLbl}>Life Jackets</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statIcon}>🩹</Text>
              <Text style={styles.statVal}>
                {boat.safety?.firstAidKit ? 'Equipped' : 'Standard'}
              </Text>
              <Text style={styles.statLbl}>First Aid</Text>
            </View>
          </View>

          {/* Whole Boat Charter Option if enabled by owner */}
          {boat.allowWholeBoatBooking && (
            <Card style={styles.charterCard}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.charterTitle}>🛥️ Full Boat Private Charter</Text>
                  <Text style={styles.charterSub}>Reserve entire vessel exclusively for your party</Text>
                </View>
                <Text style={styles.charterPrice}>₹{boat.wholeBoatPrice || boat.price * boat.capacity}</Text>
              </View>
            </Card>
          )}

          {/* Description */}
          <Text style={[styles.sectionTitle, isDark && styles.textLight]}>About the Ride</Text>
          <Text style={styles.descriptionText}>{boat.description || 'Reliable water tourism and transport booking on JalRide.'}</Text>

          {/* Amenities Checklist */}
          {Array.isArray(boat.amenities) && boat.amenities.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Onboard Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {boat.amenities.map((amenity, idx) => (
                  <View key={idx} style={styles.amenityItem}>
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkIcon}>✓</Text>
                    </View>
                    <Text style={styles.amenityLabel}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Boat Operator Profile */}
          <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Boat Operator & Dispatch</Text>
          <Card style={styles.captainCard}>
            <View style={styles.captainRow}>
              <View style={styles.captainAvatar}>
                <Text style={styles.avatarLetter}>
                  {boat.owner?.name ? boat.owner.name.charAt(0).toUpperCase() : 'B'}
                </Text>
              </View>

              <View style={styles.captainInfo}>
                <View style={styles.rowBetween}>
                  <Text style={styles.captainName}>{boat.owner?.name || 'Verified Boat Operator'}</Text>
                  {boat.owner?.isVerifiedOwner ? (
                    <Badge label="Verified Operator" variant="success" size="small" />
                  ) : (
                    <Badge label="Listed Operator" variant="teal" size="small" />
                  )}
                </View>
                {boat.owner?.experience ? (
                  <Text style={styles.captainExperience}>{boat.owner.experience} Years on Waterways</Text>
                ) : null}
                <Text style={styles.captainPhone}>Verified Operator • JalRide Dispatch Support</Text>
              </View>
            </View>
          </Card>

          {/* Safety & Cancellation Policy */}
          <View style={styles.policyCard}>
            <Text style={styles.policyHeading}>100% Instant Refund Policy</Text>
            <Text style={styles.policyText}>
              Cancel anytime up to 2 hours before departure for a full 100% instant refund into your JalRide wallet. Weather warnings trigger automatic immediate refunds.
            </Text>
          </View>
        </View>

        <View style={{ height: 80 + Math.max(insets.bottom, 16) }} />
      </ScrollView>

      {/* Sticky Bottom Booking Bar */}
      <View style={[styles.bottomBar, isDark && styles.bottomBarDark, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View>
          <Text style={styles.bottomPricePrefix}>Fare per Person</Text>
          <Text style={styles.bottomPrice}>
            ₹{boat.price} <Text style={styles.bottomPriceUnit}>/ seat</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.bookNowStickyBtn}
          onPress={handleStartBooking}
          activeOpacity={0.85}
        >
          <Text style={styles.bookNowStickyText}>Book Ride Now →</Text>
        </TouchableOpacity>
      </View>
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
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIcon: {
    fontSize: 18,
    color: colors.ink,
    fontWeight: '700',
  },
  scroll: {
    paddingBottom: 20,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 250,
    backgroundColor: colors.gray200,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  galleryBadge: {
    position: 'absolute',
    bottom: spacing.m,
    right: spacing.m,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  galleryBadgeText: {
    color: colors.white,
    ...typography.caption,
    fontWeight: '600',
  },
  thumbnailRow: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    gap: spacing.s,
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: radii.s,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: colors.teal,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  contentWrap: {
    padding: spacing.l,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  boatTitle: {
    ...typography.h2,
    color: colors.ink,
    marginBottom: 4,
  },
  locationRow: {
    marginBottom: spacing.l,
  },
  locationText: {
    ...typography.body,
    color: colors.gray600,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.m,
    marginBottom: spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.m,
    borderRadius: radii.m,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  statIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  statVal: {
    ...typography.bodyMedium,
    color: colors.ink,
    fontWeight: '700',
  },
  statLbl: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 10,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.ink,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  descriptionText: {
    ...typography.body,
    color: colors.gray600,
    lineHeight: 22,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.m,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '46%',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.successMist,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkIcon: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  amenityLabel: {
    ...typography.bodySmall,
    color: colors.ink,
    fontWeight: '500',
  },
  captainCard: {
    marginTop: spacing.s,
  },
  captainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  captainAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  avatarLetter: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 20,
  },
  captainInfo: {
    flex: 1,
  },
  captainName: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
  captainExperience: {
    ...typography.caption,
    color: colors.gray500,
    marginBottom: 2,
  },
  captainPhone: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '600',
  },
  charterCard: {
    backgroundColor: '#f0f9ff',
    borderColor: '#b9e6fe',
    borderWidth: 1,
    padding: spacing.m,
    borderRadius: radii.m,
    marginBottom: spacing.l,
  },
  charterTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.teal,
  },
  charterSub: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: 2,
  },
  charterPrice: {
    ...typography.h3,
    color: colors.sunDeep,
    fontWeight: '700',
    marginLeft: spacing.m,
  },
  policyCard: {
    backgroundColor: colors.tealMist,
    padding: spacing.l,
    borderRadius: radii.m,
    marginTop: spacing.xl,
  },
  policyHeading: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  policyText: {
    ...typography.bodySmall,
    color: colors.deep,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.m,
    paddingBottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.lift,
  },
  bottomBarDark: {
    backgroundColor: '#0a1e23',
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  bottomPricePrefix: {
    ...typography.caption,
    color: colors.gray500,
  },
  bottomPrice: {
    ...typography.h2,
    color: colors.teal,
    fontWeight: '700',
  },
  bottomPriceUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.gray500,
  },
  bookNowStickyBtn: {
    backgroundColor: colors.teal,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.m,
  },
  bookNowStickyText: {
    ...typography.button,
    color: colors.white,
  },
});
