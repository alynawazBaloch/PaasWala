import React, { useState, useCallback, useRef } from 'react';
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
import CategoryChip from '../../components/shared/CategoryChip';
import { SkeletonCard } from '../../components/shared/SkeletonGlass';
import EmptyState3D from '../../components/shared/EmptyState3D';
import StaggerList from '../../components/animated/StaggerList';
import { useFeed, Post } from '../../hooks/useFeed';
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

const STORY_USERS = [
  { name: 'Your Story', isOwn: true },
  { name: 'Aisha K.', avatar: '' },
  { name: 'Imran A.', avatar: '' },
  { name: 'Fatima H.', avatar: '' },
  { name: 'Usman M.', avatar: '' },
  { name: 'Zara B.', avatar: '' },
  { name: 'Omar S.', avatar: '' },
  { name: 'Sana T.', avatar: '' },
];

const MOCK_STORIES = [
  { id: 's1', userName: 'Aisha K.', userAvatar: '', userRole: 'resident', timestamp: Date.now() - 1800000 },
  { id: 's2', userName: 'Imran A.', userAvatar: '', userRole: 'admin', timestamp: Date.now() - 3600000 },
  { id: 's3', userName: 'Fatima H.', userAvatar: '', userRole: 'resident', timestamp: Date.now() - 7200000 },
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
  const { posts, loading, refreshing, refresh, likePost } = useFeed();
  const [activeCategory, setActiveCategory] = useState('all');
  const [scrolled, setScrolled] = useState(false);
  const [showNewPostsPill, setShowNewPostsPill] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrolled(offsetY > 20);
    setShowNewPostsPill(offsetY > 200);
  }, []);

  const handleAddStory = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera roll access to add a story.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const newStory = {
          id: 'my_story_' + Date.now(),
          userName: 'Your Story',
          userAvatar: '',
          userRole: 'resident',
          mediaUrl: result.assets[0].uri,
          timestamp: Date.now(),
        };
        navigation?.navigate('StoryViewer', { stories: [newStory, ...MOCK_STORIES], initialIndex: 0 });
      }
    } catch (err) {
      console.error('[FeedScreen] Story picker error:', err);
    }
  }, [navigation]);

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    setShowNewPostsPill(false);
  }, []);

  const renderStoryItem = (story: typeof STORY_USERS[0], index: number) => {
    const seen = index > 2;
    const ringColor = seen ? Colors.textMuted : Colors.accent;
    const isOwnStory = story.isOwn;

    return (
      <TouchableOpacity
        key={index}
        activeOpacity={0.7}
        style={styles.storyItem}
        onPress={() => isOwnStory ? handleAddStory() : navigation?.navigate('StoryViewer', { stories: MOCK_STORIES, initialIndex: index - 1 })}
      >
        <View
          style={[
            styles.storyRing,
            {
              borderColor: ringColor,
              borderWidth: seen ? 2 : 2.5,
            },
          ]}
        >
          {isOwnStory ? (
            <View style={[styles.storyAvatar, styles.ownStoryAvatar]}>
              <Ionicons name="add" size={28} color={Colors.accent} />
            </View>
          ) : (
            <AvatarBadge
              name={story.name}
              avatar={story.avatar || undefined}
              size={STORY_SIZE - 6}
              role="resident"
              verified={false}
            />
          )}
        </View>
        <Text style={styles.storyLabel} numberOfLines={1}>
          {isOwnStory ? 'Add Story' : story.name.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderStoryRow = () => (
    <View style={styles.storiesSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContainer}
      >
        {STORY_USERS.map((story, index) => renderStoryItem(story, index))}
      </ScrollView>
    </View>
  );

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
        {/* Author Row */}
        <View style={styles.postAuthorRow}>
          <View style={styles.postAuthorLeft}>
            <AvatarBadge
              name={item.authorName}
              avatar={item.authorAvatar || undefined}
              size={40}
              role={roleKey}
              verified={item.verified}
            />
            <View style={styles.postAuthorInfo}>
              <View style={styles.postAuthorNameRow}>
                <Text style={styles.postAuthorName}>{item.authorName}</Text>
                {item.verified && (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={roleBadge.color}
                    style={{ marginLeft: 4 }}
                  />
                )}
                {roleKey !== 'resident' && (
                  <View style={[styles.rolePill, { backgroundColor: roleBadge.color + '30' }]}>
                    <Text style={[styles.rolePillText, { color: roleBadge.color }]}>
                      {roleBadge.label}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.postMetaRow}>
                <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                <Text style={styles.postStreet}>{item.street}</Text>
                <Text style={styles.postDot}> &middot; </Text>
                <Text style={styles.postTimestamp}>{formatRelativeTime(item.timestamp)}</Text>
              </View>
            </View>
          </View>
          {item.audience === 'neighborhood' && (
            <View style={styles.audienceBadge}>
              <Ionicons name="people" size={12} color={Colors.accent} />
            </View>
          )}
        </View>

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

  const renderHeader = () => (
    <View>
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
          <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7} onPress={() => navigation?.navigate('Notifications')}>
            <View style={styles.iconBadgeWrapper}>
              <Ionicons name="notifications-outline" size={24} color={Colors.textPrimary} />
              <View style={styles.badgeDot} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7} onPress={() => navigation?.getParent()?.navigate('Messages')}>
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
  loadingContainer: {
    flex: 1,
  },
});

export default FeedScreen;
