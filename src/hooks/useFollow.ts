import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  listenFollowing,
  listenFollowers,
  createConnection,
  updateConnectionStatus,
  getConnectionBetweenUsers,
  incrementUserCount,
  deleteConnection,
  addToUserArray,
  removeFromUserArray,
} from '../services/dataService';
import type { Connection } from '../services/dataService';
import notificationService from '../services/notifications';

interface UseFollowReturn {
  following: Connection[];
  followers: Connection[];
  followingCount: number;
  followersCount: number;
  loading: boolean;
  follow: (targetUserId: string) => Promise<void>;
  unfollow: (targetUserId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;
}

export const useFollow = (profileUserId?: string): UseFollowReturn => {
  const { user: currentUser } = useAuth();
  const [following, setFollowing] = useState<Connection[]>([]);
  const [followers, setFollowers] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const followingSet = useRef<Set<string>>(new Set());

  // Listen to who the current user is following
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return () => {};
    }

    const unsubFollowing = listenFollowing(currentUser.uid, (conns) => {
      const accepted = conns.filter((c) => c.status === 'accepted');
      setFollowing(accepted);
      followingSet.current = new Set(accepted.map((c) => c.toUserId));
      setLoading(false);
    });

    return () => {
      unsubFollowing();
    };
  }, [currentUser?.uid]);

  // Listen to followers for the profile user (or current user)
  useEffect(() => {
    const targetId = profileUserId || currentUser?.uid;
    if (!targetId) {
      setLoading(false);
      return () => {};
    }

    const unsubFollowers = listenFollowers(targetId, (conns) => {
      const accepted = conns.filter((c) => c.status === 'accepted');
      setFollowers(accepted);
    });

    return () => {
      unsubFollowers();
    };
  }, [profileUserId, currentUser?.uid]);

  const follow = useCallback(
    async (targetUserId: string) => {
      if (!currentUser) return;
      // Optimistic update
      followingSet.current.add(targetUserId);

      const conn: Connection = {
        id: `conn_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
        fromUserId: currentUser.uid,
        toUserId: targetUserId,
        type: 'follow',
        status: 'accepted',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await createConnection(conn);

      // Maintain user-level relationship arrays and counts
      await Promise.all([
        addToUserArray(currentUser.uid, 'following', targetUserId),
        addToUserArray(targetUserId, 'followers', currentUser.uid),
        incrementUserCount(currentUser.uid, 'followingCount', 1),
        incrementUserCount(targetUserId, 'followersCount', 1),
      ]);

      // Push notification
      await notificationService.notifyUser(
        targetUserId,
        'follow',
        'New Follower',
        `${currentUser.name} started following you`,
        { fromUserId: currentUser.uid }
      );
    },
    [currentUser]
  );

  const unfollow = useCallback(
    async (targetUserId: string) => {
      if (!currentUser) return;
      followingSet.current.delete(targetUserId);

      const existing = await getConnectionBetweenUsers(currentUser.uid, targetUserId);
      if (existing && existing.type === 'follow') {
        await deleteConnection(existing.id);

        // Remove from user-level relationship arrays and counts
        await Promise.all([
          removeFromUserArray(currentUser.uid, 'following', targetUserId),
          removeFromUserArray(targetUserId, 'followers', currentUser.uid),
          incrementUserCount(currentUser.uid, 'followingCount', -1),
          incrementUserCount(targetUserId, 'followersCount', -1),
        ]);
      }
    },
    [currentUser]
  );

  const isFollowing = useCallback((userId: string): boolean => {
    return followingSet.current.has(userId);
  }, []);

  return {
    following,
    followers,
    followingCount: following.length,
    followersCount: followers.length,
    loading,
    follow,
    unfollow,
    isFollowing,
  };
};

export default useFollow;
