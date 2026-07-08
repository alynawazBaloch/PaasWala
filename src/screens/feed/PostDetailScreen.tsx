import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
  Animated as RNAnimated,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/glass/GlassCard';
import AvatarBadge from '../../components/shared/AvatarBadge';
import TappableAuthor from '../../components/shared/TappableAuthor';
import Colors from '../../utils/colors';
import { ROLE_BADGES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { getComments, getPost, addComment as dsAddComment } from '../../services/dataService';
import type { Post as FeedPost } from '../../services/dataService';
import type { Comment as DSComment } from '../../services/dataService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// -- removed local Comment interface and MOCK_COMMENTS --

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

const PostDetailScreen: React.FC<{ navigation?: any; route?: any }> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const postId = route?.params?.postId;
  const [commentText, setCommentText] = useState('');
  const { user } = useAuth();
  const [comments, setComments] = useState<DSComment[]>([]);
  const [post, setPost] = useState<FeedPost | null>(null);
  const [postLoading, setPostLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const sendButtonScale = useRef(new RNAnimated.Value(1)).current;

  // Load the real post
  useEffect(() => {
    const load = async () => {
      const id = route?.params?.postId || '';
      if (!id) {
        setPostLoading(false);
        return;
      }
      const found = await getPost(id);
      if (found) {
        setPost(found);
        setLikeCount(found.likesCount ?? 0);
      }
      setPostLoading(false);
    };
    load();
  }, [route?.params?.postId]);

  // Load real comments
  useEffect(() => {
    const loadComments = async () => {
      const id = route?.params?.postId || '';
      if (!id) return;
      const loaded = await getComments(id);
      setComments(loaded);
    };
    loadComments();
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleLike = useCallback(() => {
    setIsLiked((prev) => !prev);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
  }, [isLiked]);

  const handleSendComment = useCallback(() => {
    if (!commentText.trim() || !post) return;

    const newComment: DSComment = {
      id: 'c_' + Date.now().toString(36),
      postId: post.id,
      authorId: user?.uid ?? 'unknown',
      authorName: user?.name ?? 'You',
      authorAvatar: user?.avatar ?? '',
      authorRole: user?.role ?? 'resident',
      text: commentText.trim(),
      timestamp: Date.now(),
      likesCount: 0,
      userLiked: false,
    };

    dsAddComment(newComment);
    setComments((prev) => [newComment, ...prev]);
    setCommentText('');
    Keyboard.dismiss();

    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  }, [commentText, user, post]);

  const handleCommentLike = useCallback((commentId: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              userLiked: !c.userLiked,
              likesCount: c.userLiked ? c.likesCount - 1 : c.likesCount + 1,
            }
          : c
      )
    );
  }, []);

  const animateSendButton = () => {
    RNAnimated.sequence([
      RNAnimated.timing(sendButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      RNAnimated.timing(sendButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderCommentItem = (comment: DSComment) => {
    const commentRoleKey = comment.authorRole as keyof typeof ROLE_BADGES;
    const commentBadge = ROLE_BADGES[commentRoleKey] || ROLE_BADGES.resident;

    return (
      <GlassCard key={comment.id} style={styles.commentCard} noTouch>
        <TouchableOpacity
          style={styles.commentHeader}
          onPress={() => {
            if (comment.authorId === user?.uid) {
              navigation?.navigate('MainTabs', { screen: 'Profile' });
            } else {
              navigation?.navigate('AuthorProfile', { userId: comment.authorId });
            }
          }}
          activeOpacity={0.7}
        >
          <AvatarBadge
            name={comment.authorName}
            avatar={comment.authorAvatar || undefined}
            size={34}
            role={commentRoleKey}
            verified={comment.authorRole !== 'resident'}
          />
          <View style={styles.commentInfo}>
            <View style={styles.commentAuthorRow}>
              <Text style={styles.commentAuthorName}>{comment.authorName}</Text>
              {comment.authorRole !== 'resident' && (
                <View
                  style={[
                    styles.commentRoleBadge,
                    { backgroundColor: commentBadge.color + '30' },
                  ]}
                >
                  <Text style={[styles.commentRoleText, { color: commentBadge.color }]}>
                    {commentBadge.label}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.commentTime}>
              {formatRelativeTime(comment.timestamp)}
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.commentText}>{comment.text}</Text>

        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.commentActionBtn}
            onPress={() => handleCommentLike(comment.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={comment.userLiked ? 'heart' : 'heart-outline'}
              size={16}
              color={comment.userLiked ? Colors.error : Colors.textMuted}
            />
            {comment.likesCount > 0 && (
              <Text
                style={[
                  styles.commentActionText,
                  comment.userLiked && { color: Colors.error },
                ]}
              >
                {comment.likesCount}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.commentActionBtn} activeOpacity={0.7} onPress={() => Alert.alert('Reply', 'Replying to comments coming soon.')}>
            <Ionicons name="chatbubble-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.commentActionText}>Reply</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    );
  };

  if (postLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTabText}>Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const roleKey = post.authorRole as keyof typeof ROLE_BADGES;
  const roleBadge = ROLE_BADGES[roleKey] || ROLE_BADGES.resident;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity style={styles.moreButton} activeOpacity={0.7} onPress={() => Alert.alert('More', 'More options coming soon.')}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: keyboardHeight > 0 ? 120 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Post Detail Card */}
          <GlassCard style={styles.postCard} noTouch>
            {/* Author Row — tappable */}
            <TappableAuthor
              userId={post.authorId}
              name={post.authorName}
              avatar={post.authorAvatar}
              role={roleKey}
              verified={post.verified}
              size={44}
              showStreet
              street={post.street}
              showTimestamp
              timestamp={post.timestamp}
            />

            {/* Category */}
            <View style={styles.categoryRow}>
              <View style={styles.categoryTag}>
                <Ionicons
                  name={
                    post.category === 'announcement'
                      ? 'megaphone'
                      : post.category === 'question'
                      ? 'help-circle'
                      : post.category === 'recommendation'
                      ? 'star'
                      : post.category === 'urgent'
                      ? 'warning'
                      : 'document-text'
                  }
                  size={14}
                  color={Colors.accent}
                />
                <Text style={styles.categoryTagText}>
                  {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
                </Text>
              </View>
            </View>

            {/* Content */}
            <Text style={styles.postContent}>{post.content}</Text>

            {/* Media Section */}
            {post.media && post.media.length > 0 && (
              <View style={styles.mediaSection}>
                {post.media.length === 1 ? (
                  <Image source={{ uri: post.media[0] }} style={styles.mediaSingle} resizeMode="contain" />
                ) : (
                  <View style={styles.mediaGrid}>
                    {post.media.slice(0, 4).map((m, idx) => (
                      <Image key={idx} source={{ uri: m }} style={styles.mediaGridItem} resizeMode="cover" />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="heart" size={14} color={Colors.error} />
                <Text style={styles.statText}>{likeCount} likes</Text>
              </View>
              <Text style={styles.statText}>{comments.length} comments</Text>
            </View>

            {/* Action Row */}
            <View style={styles.postActions}>
              <TouchableOpacity
                style={styles.postActionBtn}
                onPress={handleLike}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isLiked ? Colors.error : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.postActionText,
                    isLiked && { color: Colors.error },
                  ]}
                >
                  Like
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.postActionBtn}
                onPress={() => inputRef.current?.focus()}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubble-outline" size={22} color={Colors.textSecondary} />
                <Text style={styles.postActionText}>Comment</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.postActionBtn} activeOpacity={0.7} onPress={() => Alert.alert('Share', 'Sharing posts coming soon.')}>
                <Ionicons name="share-outline" size={22} color={Colors.textSecondary} />
                <Text style={styles.postActionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>Comments</Text>
              <Text style={styles.commentsCount}>{comments.length}</Text>
            </View>

            {comments.length === 0 ? (
              <View style={styles.noComments}>
                <Ionicons name="chatbubbles-outline" size={36} color={Colors.textMuted} />
                <Text style={styles.noCommentsText}>No comments yet</Text>
                <Text style={styles.noCommentsSubtext}>
                  Be the first to share your thoughts
                </Text>
              </View>
            ) : (
              comments.map(renderCommentItem)
            )}
          </View>
        </ScrollView>

        {/* Comment Input Bar */}
        <View
          style={[
            styles.commentInputBar,
            { paddingBottom: keyboardHeight > 0 ? keyboardHeight - insets.bottom + 8 : insets.bottom + 8 },
            keyboardHeight > 0 && styles.commentInputBarActive,
          ]}
        >
          <View style={styles.commentInputRow}>
            <AvatarBadge
              name="You"
              avatar=""
              size={34}
              role="resident"
              verified={false}
            />
            <View style={styles.commentInputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor={Colors.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
            </View>
            <RNAnimated.View style={{ transform: [{ scale: sendButtonScale }] }}>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !commentText.trim() && styles.sendButtonDisabled,
                ]}
                onPress={() => {
                  handleSendComment();
                  animateSendButton();
                }}
                disabled={!commentText.trim()}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={commentText.trim() ? Colors.textPrimary : Colors.textMuted}
                />
              </TouchableOpacity>
            </RNAnimated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Post Card
  postCard: {
    padding: 16,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAuthorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  postAuthorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  postAuthorName: {
    fontSize: 16,
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
  categoryRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 6,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.glassBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  categoryTagText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  postContent: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 24,
    marginTop: 10,
    fontFamily: 'Inter',
  },

  // Media
  mediaSection: {
    marginTop: 14,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mediaSingle: {
    width: '100%',
    height: 300,
    borderRadius: 16,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  mediaGridItem: {
    width: (SCREEN_WIDTH - 68) / 2,
    height: 140,
    borderRadius: 12,
    backgroundColor: Colors.glassBg,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },

  // Post Actions
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  postActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  postActionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Inter',
  },

  // Comments
  commentsSection: {
    marginTop: 20,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  commentsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    backgroundColor: Colors.glassBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
    fontFamily: 'Inter',
  },
  noComments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  noCommentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  noCommentsSubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  commentCard: {
    padding: 12,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInfo: {
    marginLeft: 10,
    flex: 1,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  commentAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  commentRoleBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 6,
  },
  commentRoleText: {
    fontSize: 9,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  commentTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
    fontFamily: 'Inter',
  },
  commentText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginTop: 8,
    fontFamily: 'Inter',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  commentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },

  // Comment Input
  // Loading / Error
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTabText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },

  commentInputBar: {
    backgroundColor: Colors.secondaryBg,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  commentInputBarActive: {
    borderTopColor: Colors.accent + '40',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  commentInputContainer: {
    flex: 1,
    backgroundColor: Colors.glassBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: 14,
    paddingVertical: 2,
    minHeight: 40,
    maxHeight: 100,
    justifyContent: 'center',
  },
  commentInput: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    paddingVertical: 8,
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
});

export default PostDetailScreen;
