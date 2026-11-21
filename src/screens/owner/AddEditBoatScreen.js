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
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { MOCK_GHATS } from '../../services/mockData';

// Authoritative Boat Category Enum matching backend Boat.js schema
const BOAT_CATEGORIES = [
  'Rowboat',
  'Sailboat',
  'Motor Boat',
  'Speed Boat',
  'Deck Cruiser',
  'Houseboat',
  'Sunset Cruiser',
];

const RIDE_CATEGORIES = [
  { key: 'general', label: 'General / Heritage' },
  { key: 'sunrise', label: '🌅 Sunrise Ride' },
  { key: 'aarti', label: '🪔 Aarti View' },
  { key: 'whole_boat', label: '👑 Private Charter' },
];

const PRESET_GHATS = MOCK_GHATS.filter((g) => g !== 'All Ghats');

export default function AddEditBoatScreen({ navigation, route }) {
  const { boat } = route.params || {};
  const isEditing = !!boat;
  const { isDark } = useTheme();

  const [boatName, setBoatName] = useState(boat?.boatName || '');
  const initialLocation = boat?.location || 'Assi Ghat';
  const isCustomInitial = !!initialLocation && !PRESET_GHATS.includes(initialLocation);
  const [selectedGhat, setSelectedGhat] = useState(isCustomInitial ? 'Other' : initialLocation);
  const [customStationName, setCustomStationName] = useState(isCustomInitial ? initialLocation : '');

  const [boatType, setBoatType] = useState(boat?.boatType || 'Motor Boat');
  const [selectedThemes, setSelectedThemes] = useState(() => {
    if (boat?.rideCategory) {
      const themes = [boat.rideCategory];
      if (boat.allowWholeBoatBooking && !themes.includes('whole_boat')) {
        themes.push('whole_boat');
      }
      return themes;
    }
    return ['general'];
  });

  const toggleTheme = (key) => {
    setSelectedThemes((prev) => {
      const exists = prev.includes(key);
      let next;
      if (exists) {
        next = prev.filter((k) => k !== key);
        if (next.length === 0) next = ['general'];
      } else {
        next = [...prev, key];
      }
      if (next.includes('whole_boat')) {
        setAllowWholeBoatBooking(true);
      }
      return next;
    });
  };
  const [capacity, setCapacity] = useState(boat ? String(boat.capacity) : '20');
  const [price, setPrice] = useState(boat ? String(boat.price) : '350');
  const [description, setDescription] = useState(boat?.description || '');

  // Whole boat charter
  const [allowWholeBoatBooking, setAllowWholeBoatBooking] = useState(
    boat?.allowWholeBoatBooking ?? false
  );
  const [wholeBoatPrice, setWholeBoatPrice] = useState(
    boat?.wholeBoatPrice ? String(boat.wholeBoatPrice) : '3500'
  );

  // Photos state
  // Existing images from backend: array of { url, publicId, thumbnailUrl } or strings
  const [existingImages, setExistingImages] = useState(
    Array.isArray(boat?.images) ? boat.images : []
  );
  // Newly selected photos from device: array of ImagePickerAsset
  const [newPhotos, setNewPhotos] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const totalPhotoCount = existingImages.length + newPhotos.length;

  const handlePickPhotos = async () => {
    const remainingSlots = 6 - totalPhotoCount;
    if (remainingSlots <= 0) {
      Alert.alert('Maximum Reached', 'You can upload up to 6 photos per boat.');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Needed',
          'Gallery access is required to upload boat photos for rider verification.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const validAssets = [];
        for (const asset of result.assets) {
          // File size limit: 5MB matching backend upload.js limits
          if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
            Alert.alert(
              'File Too Large',
              `"${asset.fileName || 'Selected image'}" exceeds the 5MB size limit. Please choose a smaller image.`
            );
            continue;
          }
          validAssets.push(asset);
        }

        setNewPhotos((prev) => [...prev, ...validAssets].slice(0, 6 - existingImages.length));
      }
    } catch (err) {
      console.warn('Error picking image:', err);
      Alert.alert('Image Picker Error', 'Could not open photo library. Please try again.');
    }
  };

  const handleRemoveNewPhoto = (index) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingPhoto = async (index) => {
    // If editing and backend boat ID exists, delete through verified endpoint; do not remove optimistically on error
    Alert.alert(
      'Remove Photo',
      'Remove this photo from your boat listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (isEditing && boat?._id) {
              try {
                await api.deleteBoatImage(boat._id, index);
                setExistingImages((prev) => prev.filter((_, i) => i !== index));
              } catch (e) {
                Alert.alert('Delete Photo Failed', e.message || 'Could not remove image from server. Please try again.');
              }
            } else {
              setExistingImages((prev) => prev.filter((_, i) => i !== index));
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    const cleanName = boatName.trim();
    if (!cleanName) {
      Alert.alert('Required Field', 'Please enter a boat name.');
      return;
    }

    const numCapacity = parseInt(capacity, 10);
    if (!numCapacity || isNaN(numCapacity) || numCapacity < 1 || numCapacity > 200) {
      Alert.alert('Invalid Capacity', 'Passenger capacity must be between 1 and 200 riders.');
      return;
    }

    const numPrice = parseFloat(price);
    if (!numPrice || isNaN(numPrice) || numPrice < 10) {
      Alert.alert('Invalid Price', 'Base fare must be at least ₹10 per seat.');
      return;
    }

    // Backend rule: at least 1 photo required for new boat creation
    if (!isEditing && newPhotos.length === 0) {
      Alert.alert(
        'Boat Photo Required',
        'Official ghat regulations require at least one photo of your boat to publish a listing.'
      );
      return;
    }

    const finalLocation = selectedGhat === 'Other' ? customStationName.trim() : selectedGhat.trim();
    if (!finalLocation) {
      Alert.alert('Required Field', 'Please enter or select a boarding ghat station.');
      return;
    }

    const primaryRideCategory =
      selectedThemes.find((t) => ['sunrise', 'aarti', 'whole_boat', 'general'].includes(t)) || 'general';
    const isWholeBoatActive = selectedThemes.includes('whole_boat') || allowWholeBoatBooking;

    setIsSaving(true);
    try {
      if (newPhotos.length > 0) {
        // Construct multipart FormData
        const formData = new FormData();
        formData.append('boatName', cleanName);
        formData.append('location', finalLocation);
        formData.append('boatType', boatType);
        formData.append('capacity', String(numCapacity));
        formData.append('price', String(Math.round(numPrice)));
        formData.append('currency', 'INR');
        formData.append('description', description.trim());
        formData.append('rideCategory', primaryRideCategory);
        formData.append('allowWholeBoatBooking', String(isWholeBoatActive));
        if (isWholeBoatActive && wholeBoatPrice) {
          formData.append('wholeBoatPrice', String(parseFloat(wholeBoatPrice) || 0));
        }

        newPhotos.forEach((photo, idx) => {
          const uri = photo.uri;
          const name = photo.fileName || `boat_photo_${Date.now()}_${idx}.jpg`;
          const ext = (name.split('.').pop() || 'jpg').toLowerCase();
          const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          formData.append('images', {
            uri,
            name,
            type,
          });
        });

        if (isEditing) {
          await api.updateBoat(boat._id, formData);
        } else {
          await api.createBoat(formData);
        }
      } else {
        // Edit mode without new photos: send JSON payload to preserve existing gallery
        const payload = {
          boatName: cleanName,
          location: finalLocation,
          boatType,
          capacity: numCapacity,
          price: Math.round(numPrice),
          currency: 'INR',
          description: description.trim(),
          rideCategory: primaryRideCategory,
          allowWholeBoatBooking: Boolean(isWholeBoatActive),
          wholeBoatPrice: isWholeBoatActive ? (parseFloat(wholeBoatPrice) || null) : null,
        };

        await api.updateBoat(boat._id, payload);
      }

      Alert.alert(
        isEditing ? 'Boat Updated! ⛵' : 'Boat Published! 🎉',
        isEditing
          ? `${cleanName} details have been updated on the Varanasi live booking grid.`
          : `${cleanName} has been listed! It is now active on the JalRide booking directory.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Unable to save boat details. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title={isEditing ? 'Edit Boat Listing' : 'Register New Boat'}
        subtitle="Varanasi Smart Ghat Vessel Directory"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Vessel Name */}
        <Text style={[styles.label, isDark && styles.textLight]}>Boat / Bajra Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Maa Ganga Deluxe Bajra"
          value={boatName}
          onChangeText={setBoatName}
          maxLength={100}
        />

        {/* Boarding Ghat Selection */}
        <Text style={[styles.label, isDark && styles.textLight]}>Boarding Ghat Station *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ghatRow}>
          {PRESET_GHATS.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.ghatChip, selectedGhat === g && styles.ghatChipActive]}
              onPress={() => setSelectedGhat(g)}
            >
              <Text style={[styles.ghatText, selectedGhat === g && styles.ghatTextActive]}>
                📍 {g}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.ghatChip, selectedGhat === 'Other' && styles.ghatChipActive]}
            onPress={() => setSelectedGhat('Other')}
          >
            <Text style={[styles.ghatText, selectedGhat === 'Other' && styles.ghatTextActive]}>
              ➕ Other / Custom Station
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {selectedGhat === 'Other' && (
          <View style={{ marginTop: spacing.s, marginBottom: spacing.m }}>
            <Text style={[styles.label, isDark && styles.textLight, { fontSize: 13, marginBottom: 4 }]}>
              Custom Boarding Ghat / Station Name *
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Scindia Ghat, Panchganga Ghat, or Kedar Ghat"
              value={customStationName}
              onChangeText={setCustomStationName}
              maxLength={100}
            />
          </View>
        )}

        {/* Verified Boat Category (Enum) */}
        <Text style={[styles.label, isDark && styles.textLight]}>Vessel Type (Authoritative Registry) *</Text>
        <View style={styles.catWrap}>
          {BOAT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catPill, boatType === cat && styles.catPillActive]}
              onPress={() => setBoatType(cat)}
            >
              <Text style={[styles.catPillText, boatType === cat && styles.catPillTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ride Category */}
        <Text style={[styles.label, isDark && styles.textLight]}>Ride Theme / Classification (Multi-Select)</Text>
        <View style={styles.catWrap}>
          {RIDE_CATEGORIES.map((rc) => {
            const isSelected = selectedThemes.includes(rc.key);
            return (
              <TouchableOpacity
                key={rc.key}
                style={[styles.catPill, isSelected && styles.catPillActive]}
                onPress={() => toggleTheme(rc.key)}
              >
                <Text style={[styles.catPillText, isSelected && styles.catPillTextActive]}>
                  {isSelected ? '✓ ' : ''}{rc.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Capacity & Price Row */}
        <View style={styles.twoColRow}>
          <View style={{ flex: 1, marginRight: spacing.s }}>
            <Text style={[styles.label, isDark && styles.textLight]}>Capacity (Seats) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="20"
              value={capacity}
              onChangeText={setCapacity}
            />
          </View>

          <View style={{ flex: 1, marginLeft: spacing.s }}>
            <Text style={[styles.label, isDark && styles.textLight]}>Fare / Seat (₹) *</Text>
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
        <Text style={[styles.label, isDark && styles.textLight]}>Vessel Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Verified boat ride piloted by certified crew with standard life jackets provided for all passengers..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          maxLength={1000}
        />

        {/* Whole Boat Charter Option */}
        <Card style={styles.optionCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: spacing.m }}>
              <Text style={styles.optionTitle}>Allow Full Boat Private Charter</Text>
              <Text style={styles.optionSub}>Devotees can book the entire vessel for private Aarti or family darshan</Text>
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
              <Text style={[styles.label, { marginTop: 0 }]}>Whole Boat Fixed Fare (₹)</Text>
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

        {/* Boat Photo Gallery Section */}
        <Text style={[styles.sectionHeading, isDark && styles.textLight]}>
          Vessel Photos ({totalPhotoCount}/6) {!isEditing && '*'}
        </Text>
        <Text style={styles.photoHint}>
          Official ghat photo for passenger verification. JPG, PNG or WebP up to 5MB.
        </Text>

        {/* Thumbnails Row */}
        <View style={styles.photoGrid}>
          {/* Existing Photos */}
          {existingImages.map((img, i) => {
            const url = typeof img === 'object' && img ? (img.url || img.secure_url) : String(img || '');
            return (
              <View key={`existing-${i}`} style={styles.photoThumbWrapper}>
                <Image source={{ uri: url }} style={styles.photoThumb} />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => handleRemoveExistingPhoto(i)}
                >
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.photoTag}>
                  <Text style={styles.photoTagText}>Live #{i + 1}</Text>
                </View>
              </View>
            );
          })}

          {/* New Selected Photos */}
          {newPhotos.map((photo, i) => (
            <View key={`new-${i}`} style={styles.photoThumbWrapper}>
              <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => handleRemoveNewPhoto(i)}
              >
                <Text style={styles.removePhotoText}>✕</Text>
              </TouchableOpacity>
              <View style={[styles.photoTag, { backgroundColor: colors.teal }]}>
                <Text style={styles.photoTagText}>New</Text>
              </View>
            </View>
          ))}

          {/* Add Photo Button */}
          {totalPhotoCount < 6 && (
            <TouchableOpacity style={styles.addPhotoCard} onPress={handlePickPhotos}>
              <Text style={styles.addPhotoIcon}>📷</Text>
              <Text style={styles.addPhotoTitle}>+ Add Photo</Text>
              <Text style={styles.addPhotoSub}>{6 - totalPhotoCount} left</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Button */}
        <Button
          title={isEditing ? 'Save Boat Changes' : 'Publish Boat Listing'}
          onPress={handleSave}
          loading={isSaving}
          variant="primary"
          style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }}
        />
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
  scroll: {
    padding: spacing.l,
    paddingBottom: 80,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.m,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textLight: {
    color: colors.white,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    paddingVertical: 12,
    ...typography.body,
    color: colors.ink,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  ghatRow: {
    paddingVertical: spacing.xs,
    gap: spacing.s,
  },
  ghatChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.full,
    paddingHorizontal: spacing.m,
    paddingVertical: 8,
  },
  ghatChipActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  ghatText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.gray600,
  },
  ghatTextActive: {
    color: colors.white,
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  catPill: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    paddingVertical: 10,
  },
  catPillActive: {
    backgroundColor: colors.tealMist,
    borderColor: colors.teal,
  },
  catPillText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.ink,
  },
  catPillTextActive: {
    color: colors.teal,
    fontWeight: '700',
  },
  twoColRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  optionCard: {
    marginTop: spacing.l,
    padding: spacing.m,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  sectionHeading: {
    ...typography.h3,
    color: colors.ink,
    marginTop: spacing.xl,
    marginBottom: 4,
  },
  photoHint: {
    ...typography.caption,
    color: colors.gray500,
    marginBottom: spacing.m,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.m,
  },
  photoThumbWrapper: {
    width: 100,
    height: 100,
    borderRadius: radii.m,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.line,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10,46,54,0.85)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  photoTagText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  addPhotoCard: {
    width: 100,
    height: 100,
    borderRadius: radii.m,
    borderWidth: 2,
    borderColor: colors.teal,
    borderStyle: 'dashed',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  addPhotoIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  addPhotoTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.teal,
  },
  addPhotoSub: {
    fontSize: 9,
    color: colors.gray400,
  },
});
