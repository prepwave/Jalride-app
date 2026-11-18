import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { MOCK_GHATS } from '../../services/mockData';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import StarRating from '../../components/common/StarRating';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

const BOAT_TYPES = [
  { id: 'all', label: 'All Boats' },
  { id: 'Bajra', label: 'Bajra (Luxury)' },
  { id: 'Motor', label: 'Motor Boat' },
  { id: 'Hand', label: 'Hand Rowing' },
];

export default function BoatsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const initialType = route?.params?.filterType || 'all';

  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGhat, setSelectedGhat] = useState('All Ghats');
  const [selectedType, setSelectedType] = useState(initialType);
  const [sortBy, setSortBy] = useState('popular'); // 'popular' | 'priceLow' | 'rating'

  const fetchBoats = async () => {
    try {
      const data = await api.getBoats({
        location: selectedGhat,
        boatType: selectedType,
        search: searchQuery,
      });
      let result = data || [];

      // Sort
      if (sortBy === 'priceLow') {
        result.sort((a, b) => a.price - b.price);
      } else if (sortBy === 'rating') {
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }

      setBoats(result);
    } catch (e) {
      console.warn('Error fetching boats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBoats();
  }, [selectedGhat, selectedType, searchQuery, sortBy]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBoats();
  };

  const renderBoatItem = ({ item }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('BoatDetail', { boatId: item._id, boat: item })}
    >
      <Image
        source={{ uri: item.images?.[0] || 'https://images.unsplash.com/photo-1598977123418-454555aa04f8?w=800&q=80' }}
        style={styles.boatImg}
      />
      <View style={styles.badgeRow}>
        <Badge label={item.boatType} variant="teal" size="small" />
        {item.isFeatured && (
          <Badge label="Featured" variant="sun" size="small" style={{ marginLeft: 6 }} />
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.rowBetween}>
          <Text style={[styles.boatTitle, isDark && styles.textLight]} numberOfLines={1}>
            {item.boatName}
          </Text>
          <StarRating rating={item.rating} count={item.reviewCount} />
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaGhat}>📍 {item.location}</Text>
          <Text style={styles.metaDivider}>•</Text>
          <Text style={styles.metaCapacity}>👥 {item.capacity} Seats</Text>
        </View>

        <Text style={styles.desc} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.footerRow}>
          <View>
            <Text style={styles.pricePrefix}>Price per seat</Text>
            <Text style={styles.priceTag}>
              ₹{item.price} <Text style={styles.priceUnit}>/ ride</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => navigation.navigate('BoatDetail', { boatId: item._id, boat: item })}
          >
            <Text style={styles.bookBtnText}>Select & Book →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Screen Title */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, spacing.m) }, isDark && styles.headerBarDark]}>
        <Text style={[styles.headerTitle, isDark && styles.textLight]}>
          Find Your Boat
        </Text>
        <Text style={styles.headerSubtitle}>
          Verified boats, live availability & upfront pricing
        </Text>

        {/* Search Bar Input */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            placeholder="Search boats, ghats, bajras..."
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Filter Tabs (Boat Types) */}
      <View style={styles.filterStrip}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={BOAT_TYPES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filterScroll}
          renderItem={({ item }) => {
            const isActive = selectedType === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.typeTab,
                  isActive && styles.typeTabActive,
                  isDark && !isActive && styles.typeTabDark,
                ]}
                onPress={() => setSelectedType(item.id)}
              >
                <Text
                  style={[
                    styles.typeTabText,
                    isActive && styles.typeTabTextActive,
                    isDark && !isActive && styles.textLight,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Ghat Horizontal Filter */}
      <View style={styles.ghatFilterStrip}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={MOCK_GHATS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.ghatScroll}
          renderItem={({ item }) => {
            const isSelected = selectedGhat === item;
            return (
              <TouchableOpacity
                style={[
                  styles.ghatPill,
                  isSelected && styles.ghatPillSelected,
                  isDark && !isSelected && styles.ghatPillDark,
                ]}
                onPress={() => setSelectedGhat(item)}
              >
                <Text
                  style={[
                    styles.ghatPillText,
                    isSelected && styles.ghatPillTextSelected,
                    isDark && !isSelected && styles.textLight,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Boats List */}
      {loading ? (
        <View style={styles.loadingWrapper}>
          <LoadingSkeleton height={200} style={{ marginBottom: spacing.l }} />
          <LoadingSkeleton height={200} />
        </View>
      ) : (
        <FlatList
          data={boats}
          keyExtractor={(item) => item._id}
          renderItem={renderBoatItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.teal]}
              tintColor={colors.teal}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="🛶"
              title="No Boats Available"
              message={`No boats found at ${selectedGhat}. Try selecting 'All Ghats' or another boat category.`}
              actionTitle="Reset Filters"
              onAction={() => {
                setSelectedGhat('All Ghats');
                setSelectedType('all');
                setSearchQuery('');
              }}
            />
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
  headerBar: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerBarDark: {
    backgroundColor: '#0a1e23',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.ink,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
    marginBottom: spacing.m,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.s,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
  },
  searchInputDark: {
    color: '#eaf6f6',
  },
  filterStrip: {
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
  },
  filterScroll: {
    paddingHorizontal: spacing.l,
    gap: spacing.s,
  },
  typeTab: {
    paddingVertical: 7,
    paddingHorizontal: spacing.m,
    borderRadius: radii.m,
    backgroundColor: colors.gray100,
  },
  typeTabDark: {
    backgroundColor: '#12262b',
  },
  typeTabActive: {
    backgroundColor: colors.deep,
  },
  typeTabText: {
    ...typography.caption,
    color: colors.gray700,
    fontWeight: '600',
  },
  typeTabTextActive: {
    color: colors.white,
  },
  ghatFilterStrip: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  ghatScroll: {
    paddingHorizontal: spacing.l,
    gap: 6,
  },
  ghatPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  ghatPillDark: {
    backgroundColor: '#12262b',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ghatPillSelected: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  ghatPillText: {
    ...typography.caption,
    color: colors.gray700,
    fontWeight: '500',
  },
  ghatPillTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  listContainer: {
    padding: spacing.l,
    paddingBottom: 40,
  },
  loadingWrapper: {
    padding: spacing.l,
  },
  card: {
    marginBottom: spacing.l,
  },
  boatImg: {
    width: '100%',
    height: 170,
    backgroundColor: colors.gray200,
  },
  badgeRow: {
    position: 'absolute',
    top: spacing.m,
    left: spacing.m,
    flexDirection: 'row',
  },
  cardContent: {
    padding: spacing.l,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  boatTitle: {
    ...typography.h3,
    color: colors.ink,
    flex: 1,
    marginRight: spacing.s,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  metaGhat: {
    ...typography.bodySmall,
    color: colors.gray600,
    fontWeight: '500',
  },
  metaDivider: {
    marginHorizontal: 6,
    color: colors.gray400,
  },
  metaCapacity: {
    ...typography.bodySmall,
    color: colors.gray600,
  },
  desc: {
    ...typography.bodySmall,
    color: colors.gray500,
    lineHeight: 18,
    marginBottom: spacing.m,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.m,
  },
  pricePrefix: {
    ...typography.caption,
    color: colors.gray500,
  },
  priceTag: {
    ...typography.h3,
    color: colors.teal,
    fontWeight: '700',
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.gray500,
  },
  bookBtn: {
    backgroundColor: colors.teal,
    paddingVertical: 10,
    paddingHorizontal: spacing.l,
    borderRadius: radii.m,
  },
  bookBtnText: {
    ...typography.button,
    color: colors.white,
    fontSize: 13,
  },
});
