import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/glass/GlassCard';
import GlowInput from '../../components/glass/GlowInput';
import SpringCard from '../../components/animated/SpringCard';
import CategoryChip from '../../components/shared/CategoryChip';
import EmptyState3D from '../../components/shared/EmptyState3D';
import Colors from '../../utils/colors';
import { formatTimestamp } from '../../utils/helpers';
import { getListings, listenListings } from '../../services/dataService';
import type { Listing } from '../../services/dataService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

const CATEGORIES = ['All', 'Furniture', 'Electronics', 'Clothing', 'Books', 'Sports', 'Other'];


const CONDITION_COLORS: Record<string, string> = {
  'New': Colors.accent,
  'Like New': Colors.accent,
  'Excellent': Colors.glow,
  'Good': Colors.primary,
  'Used': Colors.textSecondary,
};

const MarketplaceListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const unsub = listenListings((all) => {
      setListings(all.sort((a, b) => b.timestamp - a.timestamp));
    });
    return unsub;
  }, []);

  const filteredListings = listings.filter((listing) => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || listing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderListingCard = ({ item }: { item: Listing }) => (
    <SpringCard style={styles.cardWrapper} onPress={() => navigation.navigate('ListingDetail', { listing: item })}>
      <GlassCard style={styles.listingCard} glowColor="rgba(45,106,79,0.15)">
        {/* Image Thumbnail */}
        <View style={styles.listingImageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.listingImage} />
          ) : (
            <View style={styles.listingImagePlaceholder}>
              <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.placeholderText}>{item.category}</Text>
            </View>
          )}
          <View style={styles.conditionBadge}>
            <Text
              style={[
                styles.conditionText,
                { color: CONDITION_COLORS[item.condition] || Colors.textSecondary },
              ]}
            >
              {item.condition}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.listingDetails}>
          <Text style={styles.listingTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.listingPrice}>
            PKR {item.price.toLocaleString()}
          </Text>
          <View style={styles.listingMetaRow}>
            <View style={styles.listingLocation}>
              <Ionicons name="location" size={11} color={Colors.textMuted} />
              <Text style={styles.listingMetaText}>{item.location}</Text>
            </View>
            <Text style={styles.listingMetaText}>{formatTimestamp(item.timestamp)}</Text>
          </View>
        </View>
      </GlassCard>
    </SpringCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => Alert.alert('Filter', 'Filtering coming soon.')}>
          <Ionicons name="filter" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <GlowInput
          placeholder="Search listings..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon="search"
        />
      </View>

      {/* Category Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContent}
        style={styles.categoryContainer}
      >
        {CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat}
            label={cat}
            active={selectedCategory === cat}
            onPress={() => setSelectedCategory(cat)}
            color={Colors.accent}
          />
        ))}
      </ScrollView>

      {/* Listings Grid */}
      <FlatList
        data={filteredListings}
        renderItem={renderListingCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState3D
            icon="storefront-outline"
            title="No listings found"
            subtitle="Be the first to create a listing in your neighborhood"
            actionTitle="Create Listing"
            onAction={() => Alert.alert('Create Listing', 'Listing creation coming soon.')}
          />
        }
      />

      {/* FAB Create Listing */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => navigation.navigate('CreateListing')}>
        <GlassCard
          glowColor="rgba(82,183,136,0.4)"
          style={styles.fabCard}
        >
          <Ionicons name="add" size={28} color={Colors.accent} />
        </GlassCard>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  categoryContainer: {
    marginBottom: 4,
  },
  categoryContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  gridContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 100,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 12,
  },
  listingCard: {
    padding: 0,
    overflow: 'hidden',
  },
  listingImageContainer: {
    height: CARD_WIDTH * 0.75,
    overflow: 'hidden',
    position: 'relative',
  },
  listingImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  listingImagePlaceholder: {
    flex: 1,
    backgroundColor: Colors.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  placeholderText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: 'Inter',
  },
  conditionBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.glassBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  conditionText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  listingDetails: {
    padding: 12,
  },
  listingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    lineHeight: 18,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.accent,
    fontFamily: 'Inter',
    marginTop: 5,
  },
  listingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 4,
  },
  listingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  listingMetaText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: 'Inter',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 30,
  },
  fabCard: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
});

export default MarketplaceListScreen;

