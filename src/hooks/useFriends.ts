import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  listenFriendRequests,
  listenFriendSentRequests,
  listenFriends,
  createConnection,
  updateConnectionStatus,
  getConnectionBetweenUsers,
  incrementUserCount,
  findExistingChat,
  createChat,
  deleteConnection,
  addToUserArray,
  removeFromUserArray,
  getUserById,
} from '../services/dataService';
import type { Connection } from '../services/dataService';
import notificationService from '../services/notifications';

interface UseFriendsReturn {
  friends: Connection[];
  incomingRequests: Connection[];
  sentRequests: Connection[];
  friendCount: number;
  loading: boolean;
  sendFriendRequest: (targetUserId: string) => Promise<void>;
  acceptFriendRequest: (connectionId: string, fromUserId: string) => Promise<void>;
  declineFriendRequest: (connectionId: string, fromUserId: string) => Promise<void>;
  cancelFriendRequest: (connectionId: string, toUserId: string) => Promise<void>;
  isFriend: (userId: string) => boolean;
  getFriendStatus: (userId: string) => 'none' | 'request_sent' | 'request_received' | 'friends';
}

export const useFriends = (profileUserId?: string): UseFriendsReturn => {
  const { user: currentUser } = useAuth();
  const [friends, setFriends] = useState<Connection[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Connection[]>([]);
  const [sentRequests, setSentRequests] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const friendSet = useRef<Set<string>>(new Set());

  // Listen to friends (both directions)
  useEffect(() => {
    const uid = profileUserId || currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return () => {};
    }

    const unsub = listenFriends(uid, (conns) => {
      setFriends(conns);
      friendSet.current = new Set(
        conns.map((c) => (c.fromUserId === uid ? c.toUserId : c.fromUserId))
      );
      setLoading(false);
    });

    return unsub;
  }, [profileUserId, currentUser?.uid]);

  // Listen to incoming friend requests (for current user)
  useEffect(() => {
    if (!currentUser?.uid) return () => {};

    const unsub = listenFriendRequests(currentUser.uid, (conns) => {
      setIncomingRequests(conns);
    });

    return unsub;
  }, [currentUser?.uid]);

  // Listen to sent friend requests
  useEffect(() => {
    if (!currentUser?.uid) return () => {};

    const unsub = listenFriendSentRequests(currentUser.uid, (conns) => {
      setSentRequests(conns);
    });

    return unsub;
  }, [currentUser?.uid]);

  const sendFriendRequest = useCallback(
    async (targetUserId: string) => {
      if (!currentUser) return;

      const conn: Connection = {
        id: `conn_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
        fromUserId: currentUser.uid,
        toUserId: targetUserId,
        type: 'friend',
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await createConnection(conn);

      // Maintain user-level request arrays
      await Promise.all([
        addToUserArray(currentUser.uid, 'sentRequests', targetUserId),
        addToUserArray(targetUserId, 'pendingRequests', currentUser.uid),
      ]);

      // Push notification
      await notificationService.notifyUser(
        targetUserId,
        'neighbor_request',
        'Neighbor Request',
        `${currentUser.name} sent you a neighbor request`,
        { fromUserId: currentUser.uid, targetId: conn.id }
      );
    },
    [currentUser]
  );

  const acceptFriendRequest = useCallback(
    async (connectionId: string, fromUserId: string) => {
      if (!currentUser) return;

      await updateConnectionStatus(connectionId, 'accepted');

      // Maintain user-level relationship arrays
      await Promise.all([
        removeFromUserArray(currentUser.uid, 'pendingRequests', fromUserId),
        removeFromUserArray(fromUserId, 'sentRequests', currentUser.uid),
        addToUserArray(currentUser.uid, 'friends', fromUserId),
        addToUserArray(fromUserId, 'friends', currentUser.uid),
        incrementUserCount(currentUser.uid, 'friendsCount', 1),
        incrementUserCount(fromUserId, 'friendsCount', 1),
      ]);

      // Push notification
      await notificationService.notifyUser(
        fromUserId,
        'neighbor_accepted',
        'Neighbor Request Accepted',
        `${currentUser.name} accepted your neighbor request`,
        { fromUserId: currentUser.uid }
      );

      // Auto-create chat using sorted-UID chat ID
      const existing = await findExistingChat(currentUser.uid, fromUserId);
      if (!existing) {
        const otherUser = await getUserById(fromUserId);
        const otherName = otherUser?.name ?? 'User';
        await createChat(currentUser.uid, fromUserId, currentUser.name, otherName);
      }
    },
    [currentUser]
  );

  const declineFriendRequest = useCallback(
    async (connectionId: string, fromUserId: string) => {
      if (!currentUser) return;
      await deleteConnection(connectionId);
      // Clean up user-level request arrays
      await Promise.all([
        removeFromUserArray(currentUser.uid, 'pendingRequests', fromUserId),
        removeFromUserArray(fromUserId, 'sentRequests', currentUser.uid),
      ]);
    },
    [currentUser]
  );

  const cancelFriendRequest = useCallback(
    async (connectionId: string, toUserId: string) => {
      if (!currentUser) return;
      await deleteConnection(connectionId);
      // Clean up user-level request arrays
      await Promise.all([
        removeFromUserArray(currentUser.uid, 'sentRequests', toUserId),
        removeFromUserArray(toUserId, 'pendingRequests', currentUser.uid),
      ]);
    },
    [currentUser]
  );

  const isFriend = useCallback(
    (userId: string): boolean => {
      return friendSet.current.has(userId);
    },
    []
  );

  const getFriendStatus = useCallback(
    (userId: string): 'none' | 'request_sent' | 'request_received' | 'friends' => {
      if (friendSet.current.has(userId)) return 'friends';
      if (sentRequests.some((r) => r.toUserId === userId && r.status === 'pending')) return 'request_sent';
      if (incomingRequests.some((r) => r.fromUserId === userId && r.status === 'pending')) return 'request_received';
      return 'none';
    },
    [friendSet, sentRequests, incomingRequests]
  );

  return {
    friends,
    incomingRequests,
    sentRequests,
    friendCount: friends.length,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    isFriend,
    getFriendStatus,
  };
};

export default useFriends;
