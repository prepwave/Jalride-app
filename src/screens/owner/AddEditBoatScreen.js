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
  'Pilgrim Guide',
  'Ganga Aarti Special View',
  'Sound System & Shehnai',
  'Mineral Water',
  'Cushioned Mattresses',
  'Onboard Bio-Toilet',
];

export default function AddEditBoatScreen({ navigation, route }) {
  const { boat } = route.params || {};
  const isEditing = !!boat;
  const { isDark } = useTheme();

  const [boatName, setBoatName] = useState(boat?.boatName || '');
  const [location, setLocation] = useState(boat?.location || 'Assi Ghat');
  const [boatType, setBoatType] = useState(boat?.boatType || 'Bajra (Luxury)');
  const [capacity, setCapacity] = useState(boat ? String(boat.capacity) : '25');
  const [price, setPrice] = useState(boat ? String(boat.price) : '350');
  const [description, setDescription] = useState(boat?.description || '');
  const [selectedAmenities, setSelectedAmenities] = useState(
    boat?.amenities || ['Life Jackets', 'Pilgrim Guide']
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
        boatName: boatName.trim(),
        location,
        boatType,
        capacity: parseInt(capacity) || 25,
        price: parseFloat(price) || 350,
        description: description.trim(),
        amenities: selectedAmenities,
      };

      if (isEditing) {
        await api.updateBoat(boat._id, payload);
      } else {
        await api.createBoat(payload);
      }

      Alert.alert(
        isEditing ? 'Boat Updated' : 'Boat Registered',
        `${boatName} has been saved and submitted to the JalRide navigation registry.`,
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
        subtitle="Varanasi Port & Inland Waterways Registry"
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
        <Text style={[styles.label, isDark && styles.textLight]}>Vessel Category</Text>
        <View style={styles.catGrid}>
          {['Bajra (Luxury)', 'Motor Boat', 'Hand Boat (Rowing)'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.catCard,
                boatType === cat && styles.catCardActive,
              ]}
              onPress={() => setBoatType(cat)}
            >
              <Text style={[styles.catText, boatType === cat && styles.catTextActive]}>
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
              placeholder="25"
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
          title={isEditing ? 'Save Changes' : 'Register Vessel & Create Standee'}
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
