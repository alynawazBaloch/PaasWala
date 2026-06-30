import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPosts, listenPosts, likePost as dsLikePost } from '../services/dataService';
import type { Post } from '../services/dataService';

export type { Post };

interface UseFeedReturn {
  posts: Post[];
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  likePost: (postId: string, reaction?: string) => Promise<void>;
}

export const useFeed = (neighborhoodId?: string): UseFeedReturn => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // Real-time listener from Firestore
    const unsubscribe = listenPosts((updatedPosts) => {
      setPosts(updatedPosts);
      setLoading(false);
    });
    return unsubscribe;
  }, [neighborhoodId]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const allPosts = await getPosts();
      setPosts(allPosts);
    } catch (err) {
      console.error('Feed refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    // No pagination for now — all posts loaded at once
  };

  const likePost = async (postId: string, reaction = 'like') => {
    if (!user) return;
    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              userLiked: !p.userLiked,
              likesCount: p.userLiked ? p.likesCount - 1 : p.likesCount + 1,
              userReaction: p.userLiked ? undefined : reaction,
            }
          : p
      )
    );
    // Persist
    await dsLikePost(postId, user.uid);
  };

  return { posts, loading, refreshing, hasMore, refresh, loadMore, likePost };
};

export default useFeed;
