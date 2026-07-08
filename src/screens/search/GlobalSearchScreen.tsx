import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/glass/GlassCard';
import GlowInput from '../../components/glass/GlowInput';
import SpringCard from '../../components/animated/SpringCard';
import AvatarBadge from '../../components/shared/AvatarBadge';
import CategoryChip from '../../components/shared/CategoryChip';
import EmptyState3D from '../../components/shared/EmptyState3D';
import Colors from '../../utils/colors';
import { formatTimestamp } from '../../utils/helpers';
import {
  searchUsersByName,
  searchUsersByEmail,
  searchPostsByKeyword,
  searchBusinessesByKeyword,
  searchEventsByTitle,
  searchListingsByTitle,
} from '../../services/dataService';
import type { UserData } from '../../context/AuthContext';
import type { Post, Business, Event, Listing } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SearchTab = 'people' | 'posts' | 'businesses' | 'events' | 'listings';

const TABS: { key: SearchTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'people', label: 'People', icon: 'people-outline' },
  { key: 'posts', label: 'Posts', icon: 'document-text-outline' },
  { key: 'businesses', label: 'Businesses', icon: 'business-outline' },
  { key: 'events', label: 'Events', icon: 'calendar-outline' },
  { key: 'listings', label: 'Listings', icon: 'pricetag-outline' },
];

interface PeopleResult {
  user: UserData;
  source: 'name' | 'email';
}

const renderStars = (rating: number): string => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let stars = '';
  for (let i = 0; i < full; i++) stars += '★';
  if (half) stars += '½';
  const empty = 5 - Math.ceil(rating);
  for (let i = 0; i < empty; i++) stars += '☆';
  return stars;
};

const GlobalSearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.uid ?? '';

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('people');
  const [loading, setLoading] = useState(false);

  // People
  const [peopleByName, setPeopleByName] = useState<UserData[]>([]);
  const [peopleByEmail, setPeopleByEmail] = useState<UserData[]>([]);

  // Posts
  const [posts, setPosts] = useState<Post[]>([]);

  // Businesses
  const [businesses, setBusinesses] = useState<Business[]>([]);

  // Events
  const [events, setEvents] = useState<Event[]>([]);

  // Listings
  const [listings, setListings] = useState<Listing[]>([]);

  /* ------------------------------------------------------------------ */
  /*  Debounce                                                          */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* ------------------------------------------------------------------ */
  /*  Search dispatcher                                                 */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!debouncedQuery) {
      setPeopleByName([]);
      setPeopleByEmail([]);
      setPosts([]);
      setBusinesses([]);
      setEvents([]);
      setListings([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const runSearch = async () => {
      try {
        const [byName, byEmail, postResults, bizResults, eventResults, listingResults] =
          await Promise.all([
            searchUsersByName(debouncedQuery, currentUserId),
            searchUsersByEmail(debouncedQuery, currentUserId),
            searchPostsByKeyword(debouncedQuery),
            searchBusinessesByKeyword(debouncedQuery),
            searchEventsByTitle(debouncedQuery),
            searchListingsByTitle(debouncedQuery),
          ]);

        if (cancelled) return;

        setPeopleByName(byName);
        setPeopleByEmail(byEmail);
        setPosts(postResults);
        setBusinesses(bizResults);
        setEvents(eventResults);
        setListings(listingResults);
      } catch (err) {
        if (cancelled) return;
        console.warn('[GlobalSearch] search error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, currentUserId]);

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                           */
  /* ------------------------------------------------------------------ */
  const allPeople = (() => {
    const map = new Map<string, PeopleResult>();
    peopleByName.forEach((u) => {
      if (!map.has(u.uid)) map.set(u.uid, { user: u, source: 'name' });
    });
    peopleByEmail.forEach((u) => {
      if (!map.has(u.uid)) map.set(u.uid, { user: u, source: 'email' });
    });
    return Array.from(map.values());
  })();

  const hasQuery = debouncedQuery.length > 0;
  const showEmptyPeople = hasQuery && allPeople.length === 0;
  const showEmptyPosts = hasQuery && posts.length === 0;
  const showEmptyBiz = hasQuery && businesses.length === 0;
  const showEmptyEvents = hasQuery && events.length === 0;
  const showEmptyListings = hasQuery && listings.length === 0;

  /* ------------------------------------------------------------------ */
  /*  Action callbacks                                                  */
  /* ------------------------------------------------------------------ */
  const handleAddNeighbor = useCallback((userName: string) => {
    Alert.alert(
      'Add Neighbor',
      `Send neighbor request to ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Request', style: 'default' },
      ]
    );
  }, []);

  const handleMessage = useCallback((user: UserData) => {
    navigation.navigate('Conversation', {
      userId: user.uid,
      userName: user.name,
      userAvatar: user.avatar,
    });
  }, [navigation]);

  /* ------------------------------------------------------------------ */
  /*  Render helpers                                                    */
  /* ------------------------------------------------------------------ */
  const renderPeopleTab = () => {
    if (!hasQuery) {
      return (
        <EmptyState3D
          icon="search-outline"
          title="Search across the community..."
          subtitle="Find neighbors, posts, businesses, events, and listings"
        />
      );
    }

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      );
    }

    if (showEmptyPeople) {
      return (
        <EmptyState3D
          icon="people-outline"
          title="No results found"
          subtitle="Try a different name or email"
        />
      );
    }

    return (
      <FlatList
        data={allPeople}
        keyExtractor={(item) => item.user.uid}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SpringCard
            onPress={() =>
              navigation.navigate('AuthorProfile', {
                userId: item.user.uid,
                userName: item.user.name,
              })
            }
            style={styles.resultCard}
          >
            <GlassCard style={{}} noTouch>
              <View style={styles.peopleRow}>
                <AvatarBadge
                  name={item.user.name}
                  avatar={item.user.avatar}
                  size={48}
                  role={item.user.role}
                  verified={item.user.verified}
                  showOnline={false}
                />
                <View style={styles.peopleInfo}>
                  <Text style={styles.peopleName}>{item.user.name}</Text>
                  <Text style={styles.peopleEmail}>{item.user.email}</Text>
                  {item.source === 'email' && (
                    <Text style={styles.sourceLabel}>Matched by email</Text>
                  )}
                </View>
              </View>
              <View style={styles.peopleActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleAddNeighbor(item.user.name)}
                >
                  <Ionicons name="person-add-outline" size={16} color={Colors.accent} />
                  <Text style={styles.actionText}>Add Neighbor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleMessage(item.user)}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={Colors.accent} />
                  <Text style={styles.actionText}>Message</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </SpringCard>
        )}
      />
    );
  };

  const renderPostsTab = () => {
    if (!hasQuery) {
      return (
        <EmptyState3D
          icon="search-outline"
          title="Search across the community..."
          subtitle="Find posts by keyword"
        />
      );
    }

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      );
    }

    if (showEmptyPosts) {
      return (
        <EmptyState3D
          icon="document-text-outline"
          title="No results found"
          subtitle="Try a different keyword"
        />
      );
    }

    return (
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SpringCard
            onPress={() =>
              navigation.navigate('PostDetail', { post: item })
            }
            style={styles.resultCard}
          >
            <GlassCard style={{}} noTouch>
              <View style={styles.postHeader}>
                <AvatarBadge
                  name={item.authorName}
                  avatar={item.authorAvatar}
                  size={32}
                  role={item.authorRole as any}
                  verified={item.verified}
                />
                <View style={styles.postMeta}>
                  <Text style={styles.postAuthor}>{item.authorName}</Text>
                  <Text style={styles.postTimestamp}>
                    {formatTimestamp(item.timestamp)}
                  </Text>
                </View>
              </View>
              <Text style={styles.postContent} numberOfLines={3}>
                {item.content}
              </Text>
              <View style={styles.postFooter}>
                {item.category ? (
                  <CategoryChip label={item.category} active={false} />
                ) : null}
                <View style={styles.postStats}>
                  <Ionicons name="heart-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.statText}>{item.likesCount}</Text>
                  <Ionicons name="chatbubble-outline" size={14} color={Colors.textMuted} style={{ marginLeft: 12 }} />
                  <Text style={styles.statText}>{item.commentsCount}</Text>
                </View>
              </View>
            </GlassCard>
          </SpringCard>
        )}
      />
    );
  };

  const renderBusinessesTab = () => {
    if (!hasQuery) {
      return (
        <EmptyState3D
          icon="search-outline"
          title="Search across the community..."
          subtitle="Find businesses by name or category"
        />
      );
    }

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      );
    }

    if (showEmptyBiz) {
      return (
        <EmptyState3D
          icon="business-outline"
          title="No results found"
          subtitle="Try a different business name or category"
        />
      );
    }

    return (
      <FlatList
        data={businesses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SpringCard
            onPress={() =>
              navigation.navigate('BusinessDetail', { business: item })
            }
            style={styles.resultCard}
          >
            <GlassCard style={{}} noTouch>
              <View style={styles.bizHeader}>
                <View style={styles.bizNameRow}>
                  <View
                    style={[
                      styles.bizStatusDot,
                      { backgroundColor: item.isOpen ? Colors.success : Colors.textMuted },
                    ]}
                  />
                  <Text style={styles.bizName}>{item.name}</Text>
                </View>
                <Text style={styles.bizCategory}>{item.category}</Text>
              </View>
              <View style={styles.bizRatingRow}>
                <Text style={styles.stars}>{renderStars(item.rating)}</Text>
                <Text style={styles.ratingValue}>{item.rating.toFixed(1)}</Text>
                <Text style={styles.reviewCount}>({item.reviewCount})</Text>
                {item.distance ? (
                  <View style={styles.distanceBadge}>
                    <Ionicons name="location-outline" size={12} color={Colors.accent} />
                    <Text style={styles.distanceText}>{item.distance}</Text>
                  </View>
                ) : null}
              </View>
              {item.description ? (
                <Text style={styles.bizDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </GlassCard>
          </SpringCard>
        )}
      />
    );
  };

  const renderEventsTab = () => {
    if (!hasQuery) {
      return (
        <EmptyState3D
          icon="search-outline"
          title="Search across the community..."
          subtitle="Find events by title"
        />
      );
    }

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      );
    }

    if (showEmptyEvents) {
      return (
        <EmptyState3D
          icon="calendar-outline"
          title="No results found"
          subtitle="Try a different event title"
        />
      );
    }

    return (
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SpringCard
            onPress={() =>
              navigation.navigate('EventDetail', { event: item })
            }
            style={styles.resultCard}
          >
            <GlassCard style={{}} noTouch>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <View style={styles.eventDetailRow}>
                <Ionicons name="calendar-outline" size={16} color={Colors.accent} />
                <Text style={styles.eventDetailText}>{item.date}</Text>
              </View>
              <View style={styles.eventDetailRow}>
                <Ionicons name="time-outline" size={16} color={Colors.accent} />
                <Text style={styles.eventDetailText}>{item.time}</Text>
              </View>
              <View style={styles.eventDetailRow}>
                <Ionicons name="location-outline" size={16} color={Colors.accent} />
                <Text style={styles.eventDetailText}>{item.location}</Text>
              </View>
              {item.attendeeCount > 0 && (
                <View style={styles.attendeeRow}>
                  <Ionicons name="people-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.attendeeText}>
                    {item.attendeeCount} attending
                  </Text>
                </View>
              )}
            </GlassCard>
          </SpringCard>
        )}
      />
    );
  };

  const renderListingsTab = () => {
    if (!hasQuery) {
      return (
        <EmptyState3D
          icon="search-outline"
          title="Search across the community..."
          subtitle="Find listings by title"
        />
      );
    }

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      );
    }

    if (showEmptyListings) {
      return (
        <EmptyState3D
          icon="pricetag-outline"
          title="No results found"
          subtitle="Try a different listing title"
        />
      );
    }

    return (
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SpringCard
            onPress={() =>
              navigation.navigate('ListingDetail', { listing: item })
            }
            style={styles.resultCard}
          >
            <GlassCard style={{}} noTouch>
              <View style={styles.listingHeader}>
                <Text style={styles.listingTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.listingPrice}>
                  PKR {item.price.toLocaleString()}
                </Text>
              </View>
              <View style={styles.listingMeta}>
                <View style={styles.listingMetaItem}>
                  <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.listingMetaText}>{item.location}</Text>
                </View>
                <View style={styles.listingMetaItem}>
                  <Ionicons name="pricetag-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.listingMetaText}>{item.condition}</Text>
                </View>
              </View>
              <Text style={styles.listingTimestamp}>
                {formatTimestamp(item.timestamp)}
              </Text>
            </GlassCard>
          </SpringCard>
        )}
      />
    );
  };

  /* ------------------------------------------------------------------ */
  /*  Render active tab content                                         */
  /* ------------------------------------------------------------------ */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'people':
        return renderPeopleTab();
      case 'posts':
        return renderPostsTab();
      case 'businesses':
        return renderBusinessesTab();
      case 'events':
        return renderEventsTab();
      case 'listings':
        return renderListingsTab();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search</Text>
          <View style={styles.backButton} />
        </View>

        {/* Search Input */}
        <View style={styles.inputWrapper}>
          <GlowInput
            icon="search"
            placeholder="Search across the community..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={styles.searchInputContainer}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={18}
                  color={isActive ? Colors.accent : Colors.textMuted}
                />
                <Text
                  style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Results */}
        <View style={styles.contentArea}>
          {renderTabContent()}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  inputWrapper: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  searchInputContainer: {
    marginBottom: 0,
  },

  /* Tabs */
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 4,
  },
  tabActive: {
    backgroundColor: 'rgba(82,183,136,0.15)',
    borderColor: Colors.accent,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  tabLabelActive: {
    color: Colors.accent,
  },

  /* Content */
  contentArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  resultCard: {
    marginBottom: 12,
  },

  /* Loading */
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  /* People */
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  peopleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  peopleName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  peopleEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  sourceLabel: {
    fontSize: 11,
    color: Colors.accent,
    fontFamily: 'Inter',
    marginTop: 2,
    fontStyle: 'italic',
  },
  peopleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(82,183,136,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.25)',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Inter',
  },

  /* Posts */
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  postMeta: {
    marginLeft: 10,
    flex: 1,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  postTimestamp: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginTop: 1,
  },
  postContent: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    lineHeight: 20,
    marginBottom: 10,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
    fontFamily: 'Inter',
  },

  /* Businesses */
  bizHeader: {
    marginBottom: 8,
  },
  bizNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bizStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bizName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  bizCategory: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    marginTop: 2,
    marginLeft: 16,
  },
  bizRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  stars: {
    fontSize: 14,
    color: Colors.warning,
    fontFamily: 'Inter',
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginLeft: 2,
  },
  reviewCount: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(82,183,136,0.1)',
  },
  distanceText: {
    fontSize: 11,
    color: Colors.accent,
    fontFamily: 'Inter',
  },
  bizDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    lineHeight: 18,
  },

  /* Events */
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 10,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  eventDetailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    flex: 1,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  attendeeText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },

  /* Listings */
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    flex: 1,
    marginRight: 12,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.accent,
    fontFamily: 'Inter',
  },
  listingMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },
  listingMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listingMetaText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  listingTimestamp: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
});

export default GlobalSearchScreen;
