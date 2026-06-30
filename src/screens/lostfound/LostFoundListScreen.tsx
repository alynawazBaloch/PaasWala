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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/glass/GlassCard';
import GlowInput from '../../components/glass/GlowInput';
import SpringCard from '../../components/animated/SpringCard';
import CategoryChip from '../../components/shared/CategoryChip';
import EmptyState3D from '../../components/shared/EmptyState3D';
import Colors from '../../utils/colors';
import { formatTimestamp } from '../../utils/helpers';
import { getLostFoundItems } from '../../services/dataService';
import type { LostFoundItem } from '../../services/dataService';

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

const LostFoundListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'lost' | 'found'>('lost');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapView, setMapView] = useState(false);
  const [lostItems, setLostItems] = useState<LostFoundItem[]>([]);
  const [foundItems, setFoundItems] = useState<LostFoundItem[]>([]);

  useEffect(() => { loadItems(); }, []);
  const loadItems = async () => {
    const all = await getLostFoundItems();
    setLostItems(all.filter(i => i.type === 'lost'));
    setFoundItems(all.filter(i => i.type === 'found'));
  };

  const currentItems = activeTab === 'lost' ? lostItems : foundItems;
  const config = TYPE_CONFIG[activeTab];

  const filteredItems = currentItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: LostFoundItem }) => (
    <SpringCard onPress={() => Alert.alert('Coming Soon', 'Item details coming soon.')}>
      <GlassCard
        style={styles.itemCard}
        glowColor={
          item.type === 'lost'
            ? 'rgba(255,68,68,0.15)'
            : 'rgba(82,183,136,0.15)'
        }
      >
        <View style={styles.itemRow}>
          {/* Photo Thumbnail */}
          <View
            style={[
              styles.itemThumbnail,
              {
                borderColor:
                  item.type === 'lost'
                    ? 'rgba(255,68,68,0.2)'
                    : 'rgba(82,183,136,0.2)',
              },
            ]}
          >
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.thumbnailImage} />
            ) : (
              <Ionicons
                name={CATEGORY_ICONS[item.category] || 'help-circle'}
                size={24}
                color={config.color}
              />
            )}
          </View>

          {/* Details */}
          <View style={styles.itemDetails}>
            <View style={styles.itemTitleRow}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: config.color + '20', borderColor: config.color + '40' },
                ]}
              >
                <Ionicons name={config.icon} size={10} color={config.color} />
                <Text style={[styles.typeBadgeText, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>
            </View>
            <Text style={styles.itemDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.itemFooter}>
              <View style={styles.locationChip}>
                <Ionicons name="location" size={12} color={Colors.textMuted} />
                <Text style={styles.locationText}>{item.location}</Text>
              </View>
              <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
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
        <Text style={styles.headerTitle}>Lost & Found</Text>
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

      {/* Tab Toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lost' && styles.tabLostActive]}
          onPress={() => setActiveTab('lost')}
        >
          <Ionicons
            name="search"
            size={16}
            color={activeTab === 'lost' ? Colors.alertRed : Colors.textMuted}
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
            color={activeTab === 'found' ? Colors.accent : Colors.textMuted}
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

      {/* Items List */}
      {mapView ? (
        <View style={styles.mapViewContainer}>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.mapPlaceholderText}>
              {config.label} Items Map View
            </Text>
            <Text style={styles.mapPlaceholderSubtext}>
              Showing {filteredItems.length} {config.label.toLowerCase()} items
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState3D
              icon={config.icon}
              title={`No ${config.label.toLowerCase()} items`}
              subtitle={`No ${config.label.toLowerCase()} items reported in your neighborhood`}
              actionTitle={`Report ${config.label}`}
              onAction={() => Alert.alert('Report', 'Lost & Found reporting coming soon.')}
            />
          }
        />
      )}

      {/* FAB Create */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => Alert.alert('Coming Soon', 'Lost & Found creation coming soon.')}>
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
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
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
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter',
  },
  timestamp: {
    color: Colors.textMuted,
    fontSize: 11,
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
