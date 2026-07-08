import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import GlassCard from '../../components/glass/GlassCard';
import GlowInput from '../../components/glass/GlowInput';
import SpringCard from '../../components/animated/SpringCard';
import CategoryChip from '../../components/shared/CategoryChip';
import EmptyState3D from '../../components/shared/EmptyState3D';
import Colors from '../../utils/colors';
import { formatTimestamp } from '../../utils/helpers';
import { listenLostFound, resolveLostFound } from '../../services/dataService';
import type { LostFoundItem } from '../../services/dataService';
import { DARK_MAP_STYLE, calculateDistance } from '../../services/maps';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TYPE_CONFIG = {
  lost: { icon: 'search' as const, color: Colors.alertRed, label: 'Lost' },
  found: { icon: 'heart' as const, color: Colors.accent, label: 'Found' },
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Wallet: 'wallet',
  Pet: 'paw',
  Keys: 'key',
  Electronics: 'phone-portrait',
  Accessory: 'glasses',
};

/** Default reference point used for distance fallback when user location is unavailable. */
const REFERENCE_LAT = 33.6844;
const REFERENCE_LNG = 73.0479;

const LostFoundListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'lost' | 'found'>('lost');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapView, setMapView] = useState(false);
  const [items, setItems] = useState<LostFoundItem[]>([]);

  /* ------------------------------------------------------------------ */
  /*  Real-time listener                                                  */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const unsubscribe = listenLostFound((allItems) => {
      setItems(allItems);
    });
    return unsubscribe;
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Derived data                                                       */
  /* ------------------------------------------------------------------ */
  const config = TYPE_CONFIG[activeTab];

  const filteredItems = items
    .filter((item) => item.type === activeTab)
    .filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  // Active items first, resolved at the bottom
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.resolved && !b.resolved) return 1;
    if (!a.resolved && b.resolved) return -1;
    return 0;
  });

  const activeItems = sortedItems.filter((i) => !i.resolved);
  const resolvedItems = sortedItems.filter((i) => i.resolved);

  const itemsWithCoords = activeItems.filter(
    (i) => i.latitude != null && i.longitude != null,
  );

  /* ------------------------------------------------------------------ */
  /*  Handlers                                                           */
  /* ------------------------------------------------------------------ */
  const handleResolve = useCallback((item: LostFoundItem) => {
    Alert.alert(
      'Mark as Reunited',
      `Has "${item.title}" been reunited with its owner? It will be moved to the resolved section.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              await resolveLostFound(item.id);
            } catch (err) {
              console.warn('[LostFound] resolveLostFound error:', err);
            }
          },
        },
      ],
    );
  }, []);

  const handleShare = useCallback((item: LostFoundItem) => {
    const message = [
      `Lost & Found: ${item.title}`,
      '',
      item.description,
      `Location: ${item.location}`,
      `Type: ${item.type === 'lost' ? 'Lost' : 'Found'}`,
      `Reported: ${formatTimestamp(item.timestamp)}`,
    ].join('\n');
    Alert.alert('Share Item', message);
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Map helpers                                                        */
  /* ------------------------------------------------------------------ */
  const getMapRegion = () => {
    if (itemsWithCoords.length === 0) {
      return {
        latitude: REFERENCE_LAT,
        longitude: REFERENCE_LNG,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return {
      latitude: itemsWithCoords[0].latitude!,
      longitude: itemsWithCoords[0].longitude!,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  };

  /* ------------------------------------------------------------------ */
  /*  Render helpers                                                     */
  /* ------------------------------------------------------------------ */
  const renderItem = ({ item }: { item: LostFoundItem }) => {
    const isResolved = item.resolved;
    const itemConfig = TYPE_CONFIG[item.type];
    const itemDistance =
      item.latitude != null && item.longitude != null
        ? calculateDistance(
            REFERENCE_LAT,
            REFERENCE_LNG,
            item.latitude,
            item.longitude,
          )
        : null;

    return (
      <GlassCard
        onPress={() =>
          Alert.alert('Coming Soon', 'Item details coming soon.')
        }
        onLongPress={() => {
          if (!isResolved) handleResolve(item);
        }}
        style={[styles.itemCard, isResolved && styles.resolvedCard]}
        glowColor={
          isResolved
            ? 'rgba(130,130,130,0.08)'
            : item.type === 'lost'
              ? 'rgba(255,68,68,0.15)'
              : 'rgba(82,183,136,0.15)'
        }
      >
        <View style={styles.itemRow}>
          {/* ---- Thumbnail ---- */}
          <View
            style={[
              styles.itemThumbnail,
              {
                borderColor: isResolved
                  ? 'rgba(130,130,130,0.2)'
                  : item.type === 'lost'
                    ? 'rgba(255,68,68,0.2)'
                    : 'rgba(82,183,136,0.2)',
              },
            ]}
          >
            {item.image ? (
              <Image
                source={{ uri: item.image }}
                style={[
                  styles.thumbnailImage,
                  isResolved && styles.resolvedImage,
                ]}
              />
            ) : (
              <Ionicons
                name={CATEGORY_ICONS[item.category] || 'help-circle'}
                size={24}
                color={isResolved ? Colors.textMuted : itemConfig.color}
              />
            )}
            {isResolved && (
              <View style={styles.resolvedOverlay}>
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={Colors.accent}
                />
              </View>
            )}
          </View>

          {/* ---- Details ---- */}
          <View style={styles.itemDetails}>
            {/* Title row */}
            <View style={styles.itemTitleRow}>
              <Text
                style={[
                  styles.itemTitle,
                  isResolved && styles.resolvedText,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {isResolved ? (
                <View style={styles.reunitedBadge}>
                  <Ionicons name="checkmark" size={10} color={Colors.accent} />
                  <Text style={styles.reunitedBadgeText}>Reunited</Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor: itemConfig.color + '20',
                      borderColor: itemConfig.color + '40',
                    },
                  ]}
                >
                  <Ionicons
                    name={itemConfig.icon}
                    size={10}
                    color={itemConfig.color}
                  />
                  <Text
                    style={[styles.typeBadgeText, { color: itemConfig.color }]}
                  >
                    {itemConfig.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Description */}
            <Text
              style={[
                styles.itemDescription,
                isResolved && styles.resolvedText,
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>

            {/* Footer row */}
            <View style={styles.itemFooter}>
              <View style={styles.locationChip}>
                <Ionicons name="location" size={12} color={Colors.textMuted} />
                <Text
                  style={styles.locationText}
                  numberOfLines={1}
                >
                  {item.location}
                </Text>
              </View>

              {!isResolved && (
                <View style={styles.footerRight}>
                  <CategoryChip label={item.category} />

                  {itemDistance != null && (
                    <Text style={styles.distanceText}>
                      {itemDistance.toFixed(1)} km
                    </Text>
                  )}

                  <Text style={styles.timestamp}>
                    {formatTimestamp(item.timestamp)}
                  </Text>

                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={() => handleShare(item)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons
                      name="share-outline"
                      size={14}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {isResolved && (
                <View style={styles.footerRight}>
                  <Text style={styles.resolvedFooterText}>
                    Reunited {item.resolvedAt ? formatTimestamp(item.resolvedAt) : ''}
                  </Text>
                  <Text style={styles.timestamp}>
                    {formatTimestamp(item.timestamp)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </GlassCard>
    );
  };

  const renderMapMarkers = () => {
    if (itemsWithCoords.length === 0) return null;

    return itemsWithCoords.map((item) => (
      <Marker
        key={item.id}
        coordinate={{
          latitude: item.latitude!,
          longitude: item.longitude!,
        }}
        title={item.title}
        description={item.description}
      >
        <View
          style={[
            styles.markerContainer,
            {
              backgroundColor:
                item.type === 'lost' ? Colors.alertRed : Colors.accent,
            },
          ]}
        >
          <Ionicons
            name={item.type === 'lost' ? 'search' : 'heart'}
            size={16}
            color="#fff"
          />
        </View>
      </Marker>
    ));
  };

  const renderContent = () => {
    if (mapView) {
      // Map view – if no items have coordinates, show a helpful empty state
      if (itemsWithCoords.length === 0) {
        return (
          <View style={styles.mapEmptyContainer}>
            <EmptyState3D
              icon="map-outline"
              title="No location data"
              subtitle="Items need GPS coordinates to appear on the map"
              actionTitle={
                activeItems.length === 0 ? `Report ${config.label}` : undefined
              }
              onAction={
                activeItems.length === 0
                  ? () => navigation.navigate('CreateLostFound')
                  : undefined
              }
            />
          </View>
        );
      }

      return (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={
              Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined
            }
            customMapStyle={DARK_MAP_STYLE}
            initialRegion={getMapRegion()}
          >
            {renderMapMarkers()}
          </MapView>

          {/* Map info badge */}
          <View style={styles.mapInfoBadge}>
            <Ionicons
              name="information-circle"
              size={14}
              color={Colors.textSecondary}
            />
            <Text style={styles.mapInfoText}>
              {itemsWithCoords.length} item{itemsWithCoords.length !== 1 ? 's' : ''} with location
            </Text>
          </View>
        </View>
      );
    }

    // ---- List view ----
    return (
      <FlatList
        data={sortedItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState3D
            icon={config.icon}
            title={`No ${config.label.toLowerCase()} items`}
            subtitle={`No ${config.label.toLowerCase()} items reported. Be the first to report one!`}
            actionTitle={`Report ${config.label}`}
            onAction={() => navigation.navigate('CreateLostFound')}
          />
        }
      />
    );
  };

  /* ------------------------------------------------------------------ */
  /*  Main render                                                        */
  /* ------------------------------------------------------------------ */
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.headerTitle}>Lost & Found</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.viewToggle}
            onPress={() => setMapView((prev) => !prev)}
          >
            <Ionicons
              name={mapView ? 'list' : 'map-outline'}
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lost' && styles.tabLostActive]}
          onPress={() => setActiveTab('lost')}
        >
          <Ionicons
            name="search"
            size={16}
            color={
              activeTab === 'lost' ? Colors.alertRed : Colors.textMuted
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'lost' && { color: Colors.alertRed },
            ]}
          >
            Lost
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'found' && styles.tabFoundActive,
          ]}
          onPress={() => setActiveTab('found')}
        >
          <Ionicons
            name="heart"
            size={16}
            color={
              activeTab === 'found' ? Colors.accent : Colors.textMuted
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'found' && { color: Colors.accent },
            ]}
          >
            Found
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <GlowInput
          placeholder={`Search ${config.label.toLowerCase()} items...`}
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon="search"
        />
      </View>

      {/* Content (list or map) */}
      {renderContent()}

      {/* FAB Create */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CreateLostFound')}
      >
        <GlassCard
          glowColor={
            activeTab === 'lost'
              ? 'rgba(255,68,68,0.4)'
              : 'rgba(82,183,136,0.4)'
          }
          style={styles.fabCard}
        >
          <Ionicons
            name="add"
            size={28}
            color={activeTab === 'lost' ? Colors.alertRed : Colors.accent}
          />
        </GlassCard>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

/* -------------------------------------------------------------------- */
/*  Styles                                                               */
/* -------------------------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* ---- Header ---- */
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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

  /* ---- Tabs ---- */
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabLostActive: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.2)',
  },
  tabFoundActive: {
    backgroundColor: 'rgba(82,183,136,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.2)',
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  /* ---- Search ---- */
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },

  /* ---- List ---- */
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 100,
  },
  itemCard: {
    marginBottom: 10,
    padding: 0,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    padding: 14,
  },
  itemThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: Colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  thumbnailImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    flex: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  itemDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    lineHeight: 17,
    marginTop: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 4,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  locationText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter',
    maxWidth: 100,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  timestamp: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter',
  },
  distanceText: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  shareButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ---- Resolved state ---- */
  resolvedCard: {
    opacity: 0.6,
  },
  resolvedText: {
    opacity: 0.65,
  },
  resolvedImage: {
    opacity: 0.65,
  },
  resolvedOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 1,
  },
  reunitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
    backgroundColor: 'rgba(82,183,136,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.3)',
  },
  reunitedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accent,
    fontFamily: 'Inter',
  },
  resolvedFooterText: {
    fontSize: 11,
    color: Colors.accent,
    fontFamily: 'Inter',
    fontWeight: '500',
  },

  /* ---- Map ---- */
  mapContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 4,
  },
  map: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  mapEmptyContainer: {
    flex: 1,
    padding: 16,
  },
  mapInfoBadge: {
    position: 'absolute',
    top: 24,
    left: 26,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,15,10,0.85)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  mapInfoText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },

  /* ---- FAB ---- */
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

export default LostFoundListScreen;
