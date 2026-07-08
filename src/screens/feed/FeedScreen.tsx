import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/glass/GlassCard';
import BounceButton from '../../components/animated/BounceButton';
import AvatarBadge from '../../components/shared/AvatarBadge';
import TappableAuthor from '../../components/shared/TappableAuthor';
import CategoryChip from '../../components/shared/CategoryChip';
import { SkeletonCard } from '../../components/shared/SkeletonGlass';
import EmptyState3D from '../../components/shared/EmptyState3D';
import StaggerList from '../../components/animated/StaggerList';
import { useFeed, Post } from '../../hooks/useFeed';
import { useAuth } from '../../context/AuthContext';
import { listenStories, listenNotifications } from '../../services/dataService';
import type { Story, NotificationItem } from '../../services/dataService';
import Colors from '../../utils/colors';
import { ROLE_BADGES } from '../../utils/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORY_SIZE = 72;

const CATEGORY_FILTERS = [
  { label: 'All', key: 'all' },
  { label: 'Announcements', key: 'announcement' },
  { label: 'Questions', key: 'question' },
  { label: 'Recommendations', key: 'recommendation' },
  { label: 'Appreciation', key: 'appreciation' },
  { label: 'Urgent', key: 'urgent' },
];

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

const FeedScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, isVerified } = useAuth();
  const { posts, loading, refreshing, refresh, likePost, feedRadius, nearbyPostCount } = useFeed();
  const [activeCategory, setActiveCategory] = useState('all');
  const [scrolled, setScrolled] = useState(false);
  const [showNewPostsPill, setShowNewPostsPill] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // Real-time story listener
  useEffect(() => {
    return listenStories(setStories);
  }, []);

  // Real-time notification badge
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  useEffect(() => {
    if (!user?.uid) return;
    return listenNotifications(user.uid, (items) => {
      setUnreadNotifCount(items.filter((n) => n.isUnread).length);
    });
  }, [user?.uid]);

  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrolled(offsetY > 20);
    setShowNewPostsPill(offsetY > 200);
  }, []);

  const handleAddStory = useCallback(async () => {
    navigation?.navigate('StoryComposer');
  }, [navigation]);

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    setShowNewPostsPill(false);
  }, []);

  const renderStoryItem = (story: Story, index: number, isOwn: boolean) => {
    const seen = isOwn ? false : story.viewerIds?.includes(user?.uid || '');
    const ringColor = seen ? Colors.textMuted : Colors.accent;

    return (
      <TouchableOpacity
        key={story.id}
        activeOpacity={0.7}
        style={styles.storyItem}
        onPress={() => {
          if (isOwn) handleAddStory();
          else navigation?.navigate('StoryViewer', { stories, initialIndex: index });
        }}
      >
        <View style={[styles.storyRing, { borderColor: ringColor, borderWidth: seen ? 2 : 2.5 }]}>
          {isOwn ? (
            <View style={[styles.storyAvatar, styles.ownStoryAvatar]}>
              <Ionicons name="add" size={28} color={Colors.accent} />
            </View>
          ) : (
            <AvatarBadge
              name={story.authorName}
              avatar={story.authorAvatar}
              size={STORY_SIZE - 6}
              role={story.authorRole as any}
              verified={false}
            />
          )}
        </View>
        <Text style={styles.storyLabel} numberOfLines={1}>
          {isOwn ? 'Add Story' : story.authorName.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderStoryRow = () => {
    // Deduplicate stories by author — show newest per author
    const seenAuthors = new Set<string>();
    const uniqueStories: Story[] = [];
    for (const s of stories) {
      if (!seenAuthors.has(s.authorId)) {
        seenAuthors.add(s.authorId);
        uniqueStories.push(s);
      }
    }
    const hasOwnActiveStory = stories.some((s) => s.authorId === user?.uid);

    return (
      <View style={styles.storiesSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesContainer}>
          {/* Own story (always first) */}
          {renderStoryItem(
            { id: 'own_story', authorId: user?.uid || '', authorName: user?.name || 'You', authorAvatar: user?.avatar, authorRole: 'resident', type: 'photo', viewerIds: [], createdAt: Date.now(), expiresAt: Date.now() + 86400000 } as Story,
            -1,
            true
          )}
          {uniqueStories.filter((s) => s.authorId !== user?.uid).map((story, idx) => renderStoryItem(story, idx, false))}
        </ScrollView>
      </View>
    );
  };

  const renderFilterChips = () => (
    <View style={styles.filterSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {CATEGORY_FILTERS.map((filter) => (
          <CategoryChip
            key={filter.key}
            label={filter.label}
            active={activeCategory === filter.key}
            onPress={() => setActiveCategory(filter.key)}
            color={
              filter.key === 'urgent'
                ? Colors.error
                : filter.key === 'announcement'
                ? Colors.primary
                : Colors.accent
            }
          />
        ))}
      </ScrollView>
    </View>
  );

  const renderPostItem = ({ item, index }: { item: Post; index: number }) => {
    const roleKey = item.authorRole as keyof typeof ROLE_BADGES;
    const roleBadge = ROLE_BADGES[roleKey] || ROLE_BADGES.resident;

    return (
      <GlassCard
        style={styles.postCard}
        glowColor={item.category === 'urgent' ? Colors.error : Colors.glassBorder}
        onPress={() => navigation?.navigate('PostDetail', { post: item })}
      >
        {/* Author Row — tappable */}
        <TappableAuthor
          userId={item.authorId}
          name={item.authorName}
          avatar={item.authorAvatar}
          role={roleKey}
          verified={item.verified}
          size={40}
          showStreet
          street={item.street}
          showTimestamp
          timestamp={item.timestamp}
        />

        {/* Category Tag */}
        <View style={styles.postCategoryRow}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>
              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            </Text>
          </View>
        </View>

        {/* Content */}
        <Text style={styles.postContent} numberOfLines={4}>
          {item.content}
        </Text>

        {/* Media Thumbnails */}
        {item.media && item.media.length > 0 && (
          <View style={styles.mediaContainer}>
            {item.media.length === 1 ? (
              <Image source={{ uri: item.media[0] }} style={styles.mediaSingle} resizeMode="cover" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroller}>
                {item.media.map((m, i) => (
                  <Image key={i} source={{ uri: m }} style={styles.mediaThumb} resizeMode="cover" />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => likePost(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={item.userLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={item.userLiked ? Colors.error : Colors.textSecondary}
            />
            <Text
              style={[
                styles.actionCount,
                item.userLiked && { color: Colors.error },
              ]}
            >
              {item.likesCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation?.navigate('PostDetail', { post: item })}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.actionCount}>{item.commentsCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={() => Alert.alert('Share', 'Sharing posts coming soon.')}>
            <Ionicons name="share-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={() => Alert.alert('Bookmark', 'Bookmarking posts coming soon.')}>
            <Ionicons name="bookmark-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </GlassCard>
    );
  };

  const renderStaggeredPosts = () => {
    if (posts.length === 0 && !loading) {
      return (
        <EmptyState3D
          icon="newspaper-outline"
          title="No posts yet"
          subtitle="Be the first to share something with your neighborhood"
          actionTitle="Create Post"
          onAction={() => navigation?.navigate('PostComposer')}
        />
      );
    }

    return (
      <StaggerList
        items={posts.map((post) => ({
          id: post.id,
          content: renderPostItem({ item: post, index: posts.indexOf(post) }),
        }))}
        staggerMs={60}
        containerStyle={styles.staggerContainer}
      />
    );
  };

  const renderVerificationBanner = () => {
    if (isVerified) return null;
    return (
      <TouchableOpacity
        style={styles.verificationBanner}
        activeOpacity={0.8}
        onPress={() => navigation?.replace('AddressVerification')}
      >
        <View style={styles.verificationBannerIcon}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.warning} />
        </View>
        <View style={styles.verificationBannerText}>
          <Text style={styles.verificationBannerTitle}>Verify Your Address</Text>
          <Text style={styles.verificationBannerDesc}>
            Browse in read-only mode. Verify to post and comment.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.warning} />
      </TouchableOpacity>
    );
  };

  const renderSmartIndicator = () => {
    if (feedRadius === 'expanded') {
      return (
        <View style={styles.smartIndicator}>
          <Ionicons name="compass-outline" size={14} color={Colors.accent} />
          <Text style={styles.smartIndicatorText}>
            Showing posts from nearby neighborhoods ({nearbyPostCount} local, {posts.length} total)
          </Text>
        </View>
      );
    }
    if (feedRadius === 'neighborhood' && nearbyPostCount > 0) {
      return (
        <View style={[styles.smartIndicator, styles.smartIndicatorLocal]}>
          <Ionicons name="home-outline" size={14} color={Colors.primary} />
          <Text style={[styles.smartIndicatorText, { color: Colors.primary }]}>
            Your neighborhood is buzzing! {nearbyPostCount} posts
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderHeader = () => (
    <View>
      {renderVerificationBanner()}
      {renderSmartIndicator()}
      {renderStoryRow()}
      {renderFilterChips()}
    </View>
  );

  const renderNewPostsPill = () => {
    if (!showNewPostsPill) return null;
    return (
      <TouchableOpacity
        style={styles.newPostsPill}
        activeOpacity={0.8}
        onPress={scrollToTop}
      >
        <Ionicons name="arrow-up" size={16} color={Colors.textPrimary} />
        <Text style={styles.newPostsPillText}>New Posts</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="leaf" size={22} color={Colors.accent} />
            </View>
            <Text style={styles.logoText}>PaasWala</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7} onPress={() => navigation?.navigate('NearbyNeighbors')}>
            <Ionicons name="people-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7} onPress={() => navigation?.navigate('Notifications')}>
            <View style={styles.iconBadgeWrapper}>
              <Ionicons name="notifications-outline" size={24} color={Colors.textPrimary} />
              {unreadNotifCount > 0 && (
                <View style={[styles.badgeDot, styles.badgeCount]}>
                  <Text style={styles.badgeCountText}>{unreadNotifCount > 99 ? '99+' : unreadNotifCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7} onPress={() => navigation?.navigate('Messages')}>
            <View style={styles.iconBadgeWrapper}>
              <Ionicons name="chatbubbles-outline" size={24} color={Colors.textPrimary} />
              <View style={[styles.badgeDot, styles.badgeCount]}>
                <Text style={styles.badgeCountText}>3</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* New Posts Floating Pill */}
      {renderNewPostsPill()}

      {/* Loading State */}
      {loading && posts.length === 0 ? (
        <ScrollView
          style={styles.loadingContainer}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {renderStoryRow()}
          {renderFilterChips()}
          <View style={{ paddingHorizontal: 16 }}>
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} lines={3} style={{ marginBottom: 16 }} />
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={
            loading ? (
              <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                <SkeletonCard lines={2} />
              </View>
            ) : (
              <View style={{ height: 100 }} />
            )
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={Colors.accent}
              colors={[Colors.accent, Colors.primary]}
              progressBackgroundColor={Colors.secondaryBg}
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
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeWrapper: {
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.error,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  badgeCount: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    top: -6,
    right: -8,
  },
  badgeCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },

  // Verification banner
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 10,
  },
  verificationBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,215,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationBannerText: {
    flex: 1,
  },
  verificationBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.warning,
    fontFamily: 'Inter',
  },
  verificationBannerDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    marginTop: 2,
  },

  // Stories
  storiesSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  storiesContainer: {
    paddingHorizontal: 16,
    gap: 4,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 12,
    width: STORY_SIZE + 8,
  },
  storyRing: {
    width: STORY_SIZE + 4,
    height: STORY_SIZE + 4,
    borderRadius: (STORY_SIZE + 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatar: {
    width: STORY_SIZE - 2,
    height: STORY_SIZE - 2,
    borderRadius: (STORY_SIZE - 2) / 2,
    overflow: 'hidden',
  },
  ownStoryAvatar: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: 'Inter',
    maxWidth: STORY_SIZE + 8,
  },

  // Filters
  filterSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  filterContainer: {
    paddingHorizontal: 16,
  },

  // Posts
  listContent: {
    paddingBottom: 20,
  },
  staggerContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  postCard: {
    marginBottom: 14,
    padding: 14,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postAuthorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postAuthorInfo: {
    marginLeft: 10,
    flex: 1,
  },
  postAuthorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  postAuthorName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  postStreet: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 2,
    fontFamily: 'Inter',
  },
  postDot: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  postTimestamp: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  audienceBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  postCategoryRow: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 4,
  },
  categoryTag: {
    backgroundColor: Colors.glassBg,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  categoryTagText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  postContent: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginTop: 8,
    fontFamily: 'Inter',
  },
  mediaContainer: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  mediaSingle: {
    width: '100%',
    height: 200,
    borderRadius: 14,
  },
  mediaScroller: {
    flexDirection: 'row',
  },
  mediaThumb: {
    width: 140,
    height: 160,
    borderRadius: 12,
    marginRight: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  newPostsPill: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 24,
    zIndex: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  newPostsPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  smartIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(82,183,136,0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.2)',
    alignSelf: 'flex-start',
  },
  smartIndicatorLocal: {
    backgroundColor: 'rgba(45,106,79,0.08)',
    borderColor: 'rgba(45,106,79,0.2)',
  },
  smartIndicatorText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  loadingContainer: {
    flex: 1,
  },
});

export default FeedScreen;
