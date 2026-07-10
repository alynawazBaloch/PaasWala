import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getPosts,
  listenPosts,
  listenNeighborhoodPosts,
  listenPostsByAuthorIds,
  listenNearbyUsers,
  listenFollowingUserIds,
  likePost as dsLikePost,
} from '../services/dataService';
import type { Post } from '../services/dataService';

export type { Post };

export type FeedRadius = 'neighborhood' | 'expanded';

interface UseFeedReturn {
  posts: Post[];
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  likePost: (postId: string, reaction?: string) => Promise<void>;
  feedRadius: FeedRadius;
  nearbyPostCount: number;
}

const EXPAND_THRESHOLD = 20;
const CONTRACT_THRESHOLD = 25;

export const useFeed = (): UseFeedReturn => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore] = useState(true);
  const [feedRadius, setFeedRadius] = useState<FeedRadius>('neighborhood');
  const [nearbyPostCount, setNearbyPostCount] = useState(0);
  const { user } = useAuth();

  const unsubscribesRef = useRef<(() => void)[]>([]);
  const allPostsRef = useRef<Map<string, Post>>(new Map());

  const neighborhoodId = user?.neighborhoodId;

  // Cleanup all listeners
  const cleanupListeners = useCallback(() => {
    unsubscribesRef.current.forEach((fn) => fn());
    unsubscribesRef.current = [];
  }, []);

  // Merge posts from multiple sources, deduplicate, sort
  const mergePosts = useCallback((newPosts: Post[]) => {
    allPostsRef.current = new Map([...allPostsRef.current.entries()]);
    newPosts.forEach((p) => allPostsRef.current.set(p.id, p));

    const blockedUsers = user?.blockedUsers || [];
    const merged = Array.from(allPostsRef.current.values())
      .filter((p) => !blockedUsers.includes(p.authorId) && p.hidden !== true);

    merged.sort((a, b) => b.timestamp - a.timestamp);
    setPosts(merged);
    setLoading(false);
  }, [user]);

  // Start neighborhood-level listener
  const startNeighborhoodListener = useCallback(
    (nId: string) => {
      const unsub = listenNeighborhoodPosts(nId, (neighborhoodPosts) => {
        allPostsRef.current.clear();
        neighborhoodPosts.forEach((p) => allPostsRef.current.set(p.id, p));
        setNearbyPostCount(neighborhoodPosts.length);

        // Check if we need to expand
        if (neighborhoodPosts.length < EXPAND_THRESHOLD) {
          setFeedRadius('expanded');
        } else {
          setFeedRadius('neighborhood');
        }

        const blockedUsers = user?.blockedUsers || [];
        const sorted = Array.from(allPostsRef.current.values())
          .filter((p) => !blockedUsers.includes(p.authorId) && p.hidden !== true);
        sorted.sort((a, b) => b.timestamp - a.timestamp);
        setPosts(sorted);
        setLoading(false);
      });
      unsubscribesRef.current.push(unsub);
    },
    [user]
  );

  // Listen for nearby users and their posts (expanded feed)
  const startExpandedListeners = useCallback(
    (nId: string) => {
      const lat = user?.latitude;
      const lng = user?.longitude;

      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      // Listen for nearby users to discover their neighborhoodIds
      const nearbyUnsub = listenNearbyUsers(lat, lng, 15, user?.uid ?? '', (nearbyUsers) => {
        // Collect unique neighborhoodIds from nearby users
        const nearbyNeighborhoodIds = new Set<string>();
        nearbyUsers.forEach((u) => {
          if (u.neighborhoodId && u.neighborhoodId !== nId) {
            nearbyNeighborhoodIds.add(u.neighborhoodId);
          }
        });

        // Add listeners for each nearby neighborhood
        const neighborhoodIds = Array.from(nearbyNeighborhoodIds);
        neighborhoodIds.forEach((nearNId) => {
          // Check if we already have a listener for this neighborhood
          const unsub = listenNeighborhoodPosts(nearNId, (nearbyPosts) => {
            mergePosts(nearbyPosts);
          });
          unsubscribesRef.current.push(unsub);
        });
      });
      unsubscribesRef.current.push(nearbyUnsub);

      // Also listen for posts from followed/neighbor users
      // (this will be enhanced when connections are fully wired)
    },
    [user, mergePosts]
  );

  useEffect(() => {
    // Clean up previous listeners
    cleanupListeners();
    allPostsRef.current.clear();
    setLoading(true);

    if (!user) {
      // Not authenticated — use global feed
      const unsub = listenPosts((allPosts) => {
        setPosts(allPosts);
        setLoading(false);
      });
      unsubscribesRef.current.push(unsub);
      return;
    }

    if (!neighborhoodId) {
      // No neighborhood set — fall back to global feed
      const unsub = listenPosts((allPosts) => {
        setPosts(allPosts);
        setNearbyPostCount(allPosts.length);
        setLoading(false);
      });
      unsubscribesRef.current.push(unsub);
      return;
    }

    // Start with neighborhood-only feed
    startNeighborhoodListener(neighborhoodId);

    return () => {
      cleanupListeners();
    };
  }, [user, neighborhoodId, cleanupListeners, startNeighborhoodListener]);

  // When feedRadius becomes 'expanded', start expanded listeners
  useEffect(() => {
    if (feedRadius === 'expanded' && neighborhoodId) {
      startExpandedListeners(neighborhoodId);
    }

    return () => {
      // Cleanup expanded listeners but keep the neighborhood one
      // We handle this through the main cleanup
    };
  }, [feedRadius, neighborhoodId, startExpandedListeners]);

  // Listen to posts from users the current user follows
  useEffect(() => {
    if (!user?.uid) return () => {};

    const postUnsubs: (() => void)[] = [];
    const followingUnsub = listenFollowingUserIds(user.uid, (followingIds) => {
      postUnsubs.forEach((fn) => fn());
      postUnsubs.length = 0;
      if (followingIds.length === 0) return;
      const unsub = listenPostsByAuthorIds(followingIds, (followedPosts) => {
        mergePosts(followedPosts);
      });
      postUnsubs.push(unsub);
    });

    return () => {
      followingUnsub();
      postUnsubs.forEach((fn) => fn());
    };
  }, [user?.uid, mergePosts]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (neighborhoodId) {
        const allPosts = await listenNeighborhoodPosts(neighborhoodId, () => {});
        // listenNeighborhoodPosts returns an unsubscribe, so we don't await it
      }
      const allPosts = await getPosts();
      setPosts(allPosts);
    } catch (err) {
      console.error('[useFeed] Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [neighborhoodId]);

  const loadMore = useCallback(async () => {
    // No pagination implemented yet — all posts loaded at once
  }, []);

  const likePostFn = useCallback(
    async (postId: string, reaction = 'like') => {
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
      await dsLikePost(postId, user.uid, undefined, reaction as any);
    },
    [user]
  );

  return {
    posts,
    loading,
    refreshing,
    hasMore,
    refresh,
    loadMore,
    likePost: likePostFn,
    feedRadius,
    nearbyPostCount,
  };
};

export default useFeed;
