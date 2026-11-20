import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  Switch,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { MOCK_GHATS } from '../../services/mockData';

const ALL_AMENITIES = [
  'Life Jackets',
  'First Aid Kit',
  'Waterproof Storage',
  'Tour Guide / Narrator',
  'Sound System & Music',
  'Cushioned Seating',
  'Mineral Water',
  'Onboard Restroom',
  'Canopy / Sun Shade',
];

const BOAT_CATEGORIES = [
  'Motor Boat',
  'Speed Boat',
  'Row Boat',
  'Pedal Boat',
  'Shikara',
  'Bajra / Deck Cruiser',
  'Houseboat',
  'Luxury Yacht',
  'Ferry',
];

export default function AddEditBoatScreen({ navigation, route }) {
  const { boat } = route.params || {};
  const isEditing = !!boat;
  const { isDark } = useTheme();

  const [boatName, setBoatName] = useState(boat?.boatName || '');
  const [location, setLocation] = useState(boat?.location || 'Assi Ghat');
  const [boatType, setBoatType] = useState(boat?.boatType || 'Motor Boat');
  const [capacity, setCapacity] = useState(boat ? String(boat.capacity) : '20');
  const [price, setPrice] = useState(boat ? String(boat.price) : '350');
  const [description, setDescription] = useState(boat?.description || '');
  const [experience, setExperience] = useState(boat?.owner?.experience ? String(boat.owner.experience) : '5');

  // Safety Information fields
  const [lifeJacketsAvailable, setLifeJacketsAvailable] = useState(
    boat?.safety?.lifeJacketsAvailable ?? true
  );
  const [lifeJacketsCount, setLifeJacketsCount] = useState(
    boat?.safety?.lifeJacketsCount ? String(boat.safety.lifeJacketsCount) : '20'
  );
  const [childLifeJackets, setChildLifeJackets] = useState(
    boat?.safety?.childLifeJackets ?? true
  );
  const [firstAidKit, setFirstAidKit] = useState(
    boat?.safety?.firstAidKit ?? true
  );

  // Whole boat booking
  const [allowWholeBoatBooking, setAllowWholeBoatBooking] = useState(
    boat?.allowWholeBoatBooking ?? false
  );
  const [wholeBoatPrice, setWholeBoatPrice] = useState(
    boat?.wholeBoatPrice ? String(boat.wholeBoatPrice) : '3500'
  );

  // Commission Rates for Owner
  const [onlineCommissionRate, setOnlineCommissionRate] = useState(
    boat?.onlineCommissionRate ? String(boat.onlineCommissionRate) : '10'
  );
  const [cashCommissionRate, setCashCommissionRate] = useState(
    boat?.cashCommissionRate ? String(boat.cashCommissionRate) : '12'
  );

  const [selectedAmenities, setSelectedAmenities] = useState(
    boat?.amenities || ['Life Jackets', 'First Aid Kit']
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggleAmenity = (item) => {
    if (selectedAmenities.includes(item)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== item));
    } else {
      setSelectedAmenities([...selectedAmenities, item]);
    }
  };

  const handleSave = async () => {
    if (!boatName.trim()) {
      Alert.alert('Required', 'Please enter a boat name.');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid fare per seat.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...(boat || {}), // preserve existing properties like images, reviews, ratings
        boatName: boatName.trim(),
        location,
        boatType,
        capacity: parseInt(capacity) || 20,
        price: parseFloat(price) || 350,
        description: description.trim(),
        amenities: selectedAmenities,
        allowWholeBoatBooking,
        wholeBoatPrice: allowWholeBoatBooking ? (parseFloat(wholeBoatPrice) || 0) : undefined,
        onlineCommissionRate: parseFloat(onlineCommissionRate) || 10,
        cashCommissionRate: parseFloat(cashCommissionRate) || 12,
        safety: {
          lifeJacketsAvailable,
          lifeJacketsCount: lifeJacketsAvailable ? (parseInt(lifeJacketsCount) || 0) : 0,
          childLifeJackets,
          firstAidKit,
        },
        experience: parseInt(experience) || 0,
      };

      if (isEditing) {
        await api.updateBoat(boat._id, payload);
      } else {
        await api.createBoat(payload);
      }

      Alert.alert(
        isEditing ? 'Boat Updated' : 'Boat Registered',
        `${boatName} has been saved to the JalRide navigation directory.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Save Error', err.message || 'Unable to save boat details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title={isEditing ? 'Edit Boat Details' : 'Register New Boat'}
        subtitle="Global Waterways & Boat Registry"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Boat Name */}
        <Text style={[styles.label, isDark && styles.textLight]}>Boat / Bajra Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Maa Ganga Deluxe Bajra"
          value={boatName}
          onChangeText={setBoatName}
        />

        {/* Ghat Stationed */}
        <Text style={[styles.label, isDark && styles.textLight]}>Boarding Ghat Station</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ghatRow}>
          {MOCK_GHATS.filter((g) => g !== 'All Ghats').map((g) => (
            <TouchableOpacity
              key={g}
              style={[
                styles.ghatChip,
                location === g && styles.ghatChipActive,
              ]}
              onPress={() => setLocation(g)}
            >
              <Text style={[styles.ghatText, location === g && styles.ghatTextActive]}>
                📍 {g}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Boat Category */}
        <Text style={[styles.label, isDark && styles.textLight]}>Boat Category / Vessel Type</Text>
        <View style={styles.catWrap}>
          {BOAT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.catPill,
                boatType === cat && styles.catPillActive,
              ]}
              onPress={() => setBoatType(cat)}
            >
              <Text style={[styles.catPillText, boatType === cat && styles.catPillTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Capacity & Price Row */}
        <View style={styles.twoColRow}>
          <View style={{ flex: 1, marginRight: spacing.s }}>
            <Text style={[styles.label, isDark && styles.textLight]}>Passenger Capacity</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="20"
              value={capacity}
              onChangeText={setCapacity}
            />
          </View>

          <View style={{ flex: 1, marginLeft: spacing.s }}>
            <Text style={[styles.label, isDark && styles.textLight]}>Price per Seat (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="350"
              value={price}
              onChangeText={setPrice}
            />
          </View>
        </View>

        {/* Whole Boat Charter Option */}
        <Card style={styles.optionCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Allow Full Boat Private Charter</Text>
              <Text style={styles.optionSub}>Passengers can reserve entire boat for private trips</Text>
            </View>
            <Switch
              value={allowWholeBoatBooking}
              onValueChange={setAllowWholeBoatBooking}
              thumbColor={allowWholeBoatBooking ? colors.teal : colors.gray300}
              trackColor={{ true: colors.tealMist, false: colors.gray200 }}
            />
          </View>
          {allowWholeBoatBooking && (
            <View style={{ marginTop: spacing.m }}>
              <Text style={[styles.label, { marginTop: 0 }]}>Whole Boat Charter Price (₹)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="3500"
                value={wholeBoatPrice}
                onChangeText={setWholeBoatPrice}
              />
            </View>
          )}
        </Card>

        {/* Safety Information Section */}
        <Text style={[styles.sectionHeading, isDark && styles.textLight]}>Safety Equipment & Compliance</Text>
        <Card style={styles.safetyCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>🦺 Adult Life Jackets Available</Text>
              <Text style={styles.optionSub}>Verified life vests for passenger capacity</Text>
            </View>
            <Switch
              value={lifeJacketsAvailable}
              onValueChange={setLifeJacketsAvailable}
              thumbColor={lifeJacketsAvailable ? colors.teal : colors.gray300}
              trackColor={{ true: colors.tealMist, false: colors.gray200 }}
            />
          </View>

          {lifeJacketsAvailable && (
            <View style={{ marginTop: spacing.m }}>
              <Text style={[styles.label, { marginTop: 0 }]}>Number of Available Life Jackets</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="20"
                value={lifeJacketsCount}
                onChangeText={setLifeJacketsCount}
              />
            </View>
          )}

          <View style={[styles.rowBetween, { marginTop: spacing.m }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>👶 Child-Sized Life Vests</Text>
              <Text style={styles.optionSub}>Specialized safety jackets for children</Text>
            </View>
            <Switch
              value={childLifeJackets}
              onValueChange={setChildLifeJackets}
              thumbColor={childLifeJackets ? colors.teal : colors.gray300}
              trackColor={{ true: colors.tealMist, false: colors.gray200 }}
            />
          </View>

          <View style={[styles.rowBetween, { marginTop: spacing.m }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>🩹 First Aid Kit Onboard</Text>
              <Text style={styles.optionSub}>Emergency first aid medical supplies</Text>
            </View>
            <Switch
              value={firstAidKit}
              onValueChange={setFirstAidKit}
              thumbColor={firstAidKit ? colors.teal : colors.gray300}
              trackColor={{ true: colors.tealMist, false: colors.gray200 }}
            />
          </View>
        </Card>

        {/* Commission Engine Configuration for Vessel */}
        <Text style={[styles.sectionHeading, isDark && styles.textLight]}>Commission & Payout Preferences</Text>
        <Card style={styles.optionCard}>
          <Text style={styles.optionTitle}>Online Payment Commission Rate (%)</Text>
          <Text style={styles.optionSub}>Platform fee deducted from digital payouts (UPI, Card, Wallet) - Default: 10%</Text>
          <TextInput
            style={[styles.input, { marginTop: spacing.s }]}
            keyboardType="numeric"
            placeholder="10"
            value={onlineCommissionRate}
            onChangeText={setOnlineCommissionRate}
          />

          <Text style={[styles.optionTitle, { marginTop: spacing.m }]}>Cash-on-Ride Commission Rate (%)</Text>
          <Text style={styles.optionSub}>Platform fee debited against wallet for cash collected directly on ghat - Default: 12%</Text>
          <TextInput
            style={[styles.input, { marginTop: spacing.s }]}
            keyboardType="numeric"
            placeholder="12"
            value={cashCommissionRate}
            onChangeText={setCashCommissionRate}
          />
        </Card>

        {/* Operating Experience */}
        <Text style={[styles.label, isDark && styles.textLight]}>Captain / Operator Experience (Years)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="e.g. 8"
          value={experience}
          onChangeText={setExperience}
        />

        {/* Description */}
        <Text style={[styles.label, isDark && styles.textLight]}>Ride Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your tour, timings, Aarti views, and amenities..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        {/* Amenities Selection */}
        <Text style={[styles.label, isDark && styles.textLight]}>Onboard Amenities & Equipment</Text>
        <View style={styles.amenityWrap}>
          {ALL_AMENITIES.map((am) => {
            const isSelected = selectedAmenities.includes(am);
            return (
              <TouchableOpacity
                key={am}
                style={[
                  styles.amenityPill,
                  isSelected && styles.amenityPillActive,
                ]}
                onPress={() => toggleAmenity(am)}
              >
                <Text style={[styles.amenityText, isSelected && styles.amenityTextActive]}>
                  {isSelected ? '✓ ' : '+ '}
                  {am}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Photo Uploader Box */}
        <Text style={[styles.label, isDark && styles.textLight]}>Boat Photos</Text>
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={() => Alert.alert('Upload Photo', 'Select camera or photo gallery to upload vessel pictures.')}
        >
          <Text style={styles.uploadIcon}>📷</Text>
          <Text style={styles.uploadTitle}>Tap to Upload Boat Photos</Text>
          <Text style={styles.uploadSub}>PNG, JPG up to 10MB each</Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <Button
          title={isEditing ? 'Save Changes' : 'Register Vessel'}
          onPress={handleSave}
          loading={isSaving}
          style={{ marginTop: spacing.xl }}
        />

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
  scroll: {
    padding: spacing.l,
  },
  label: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.m,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    paddingVertical: 12,
    ...typography.body,
    color: colors.ink,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  ghatRow: {
    gap: spacing.s,
    paddingVertical: 4,
  },
  ghatChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  ghatChipActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  ghatText: {
    ...typography.caption,
    color: colors.ink,
    fontWeight: '600',
  },
  ghatTextActive: {
    color: colors.white,
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  catPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.gray300,
  },
  catPillActive: {
    backgroundColor: colors.tealMist,
    borderColor: colors.teal,
  },
  catPillText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.ink,
  },
  catPillTextActive: {
    color: colors.teal,
    fontWeight: '700',
  },
  optionCard: {
    padding: spacing.m,
    marginVertical: spacing.m,
  },
  optionTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  optionSub: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeading: {
    ...typography.h3,
    color: colors.ink,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  safetyCard: {
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  catGrid: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  catCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: radii.m,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    alignItems: 'center',
  },
  catCardActive: {
    backgroundColor: colors.tealMist,
    borderColor: colors.teal,
  },
  catText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
  },
  catTextActive: {
    color: colors.teal,
    fontWeight: '700',
  },
  twoColRow: {
    flexDirection: 'row',
  },
  amenityWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  amenityPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  amenityPillActive: {
    backgroundColor: colors.tealMist,
    borderColor: colors.teal,
  },
  amenityText: {
    ...typography.caption,
    color: colors.ink,
    fontWeight: '500',
  },
  amenityTextActive: {
    color: colors.teal,
    fontWeight: '700',
  },
  uploadBox: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.tealLight,
    borderRadius: radii.m,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  uploadTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  uploadSub: {
    ...typography.caption,
    color: colors.gray500,
  },
});
