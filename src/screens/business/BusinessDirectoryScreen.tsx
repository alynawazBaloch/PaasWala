import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/glass/GlassCard';
import GlowInput from '../../components/glass/GlowInput';
import SpringCard from '../../components/animated/SpringCard';
import CategoryChip from '../../components/shared/CategoryChip';
import EmptyState3D from '../../components/shared/EmptyState3D';
import Colors from '../../utils/colors';
import { getBusinesses } from '../../services/dataService';
import type { Business } from '../../services/dataService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = ['All', 'Restaurants', 'Retail', 'Services', 'Healthcare', 'Education', 'Fitness'];

const renderStars = (rating: number) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      stars.push(
        <Ionicons key={i} name="star" size={14} color={Colors.accent} />
      );
    } else if (i === fullStars + 1 && hasHalf) {
      stars.push(
        <Ionicons key={i} name="star-half" size={14} color={Colors.accent} />
      );
    } else {
      stars.push(
        <Ionicons key={i} name="star-outline" size={14} color={Colors.textMuted} />
      );
    }
  }
  return stars;
};

const BusinessDirectoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [mapView, setMapView] = useState(false);

  useEffect(() => { loadBiz(); }, []);
  const loadBiz = async () => {
    const all = await getBusinesses();
    setBusinesses(all);
  };

  const filteredBusinesses = businesses.filter((biz) => {
    const matchesSearch =
      biz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      biz.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || biz.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderBusinessCard = ({ item }: { item: Business }) => (
    <SpringCard onPress={() => navigation.navigate('BusinessDetail', { business: item })}>
      <GlassCard style={styles.businessCard}>
        <View style={styles.businessRow}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="storefront" size={24} color={Colors.accent} />
              </View>
            )}
          </View>

          {/* Details */}
          <View style={styles.businessInfo}>
            <View style={styles.businessNameRow}>
              <Text style={styles.businessName} numberOfLines={1}>
                {item.name}
              </Text>
              <View
                style={[
                  styles.openBadge,
                  item.isOpen
                    ? { backgroundColor: 'rgba(82,183,136,0.15)', borderColor: 'rgba(82,183,136,0.3)' }
                    : { backgroundColor: 'rgba(255,68,68,0.1)', borderColor: 'rgba(255,68,68,0.2)' },
                ]}
              >
                <View
                  style={[
                    styles.openDot,
                    { backgroundColor: item.isOpen ? Colors.success : Colors.error },
                  ]}
                />
                <Text
                  style={[
                    styles.openText,
                    { color: item.isOpen ? Colors.success : Colors.error },
                  ]}
                >
                  {item.isOpen ? 'Open' : 'Closed'}
                </Text>
              </View>
            </View>

            {/* Category Chip */}
            <View style={styles.categoryRow}>
              <CategoryChip
                label={item.category}
                active
                color={Colors.primary}
              />
            </View>

            {/* Rating */}
            <View style={styles.ratingRow}>
              <View style={styles.starsRow}>
                {renderStars(item.rating)}
              </View>
              <Text style={styles.ratingText}>
                {item.rating} ({item.reviewCount})
              </Text>
            </View>

            {/* Distance */}
            <View style={styles.distanceRow}>
              <Ionicons name="location" size={12} color={Colors.textMuted} />
              <Text style={styles.distanceText}>{item.distance}</Text>
            </View>
          </View>
        </View>
      </GlassCard>
    </SpringCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.headerTitle}>Business Directory</Text>
        <TouchableOpacity
          style={styles.viewToggle}
          onPress={() => setMapView(!mapView)}
        >
          <Ionicons
            name={mapView ? 'list' : 'map-outline'}
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <GlowInput
          placeholder="Search businesses..."
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

      {/* Business List / Map */}
      {mapView ? (
        <View style={styles.mapViewContainer}>
          <MapView
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: 31.481,
              longitude: 74.315,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation
            showsCompass
          >
            {filteredBusinesses.map(function(biz, idx) {
              var lat = 31.480 + (idx * 0.0008);
              var lng = 74.314 + (idx * 0.0012);
              return (
                <Marker
                  key={biz.id}
                  coordinate={{ latitude: lat, longitude: lng }}
                  title={biz.name}
                  description={biz.category + ' • ' + biz.distance}
                  onPress={function() {
                    Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(biz.name)).catch(function() {});
                  }}
                  pinColor="#52B788"
                />
              );
            })}
          </MapView>
        </View>
      ) : (
        <FlatList
          data={filteredBusinesses}
          renderItem={renderBusinessCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState3D
              icon="storefront-outline"
              title="No businesses found"
              subtitle="Try adjusting your search or category filter"
            />
          }
        />
      )}
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
  viewToggle: {
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
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  businessCard: {
    marginBottom: 10,
    padding: 0,
    overflow: 'hidden',
  },
  businessRow: {
    flexDirection: 'row',
    padding: 14,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  logoImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    resizeMode: 'cover',
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessInfo: {
    flex: 1,
    marginLeft: 12,
  },
  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    flex: 1,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  openText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  categoryRow: {
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  distanceText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter',
  },
  mapViewContainer: {
    flex: 1,
    padding: 16,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.mapDark,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mapPlaceholderText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  mapPlaceholderSubtext: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter',
  },
});

export default BusinessDirectoryScreen;

