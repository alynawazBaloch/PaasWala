import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  listenUserConnections,
  createConnection,
  updateConnectionStatus,
  getConnectionBetweenUsers,
  getConnectionsForUser,
} from '../services/dataService';
import type { Connection, ConnectionType, ConnectionStatus } from '../services/dataService';

interface UseConnectionsReturn {
  connections: Connection[];
  loading: boolean;
  sendNeighborRequest: (targetUserId: string) => Promise<void>;
  acceptNeighborRequest: (connectionId: string) => Promise<void>;
  declineNeighborRequest: (connectionId: string) => Promise<void>;
  removeConnection: (connectionId: string) => Promise<void>;
  followUser: (targetUserId: string) => Promise<void>;
  unfollowUser: (targetUserId: string) => Promise<void>;
  getConnectionStatus: (targetUserId: string) => ConnectionStatus | 'none' | 'loading';
  getMutualConnections: (targetUserId: string) => string[];
}

export const useConnections = (userId: string): UseConnectionsReturn => {
  const { user: currentUser } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const statusCache = useRef<Map<string, ConnectionStatus | 'none'>>(new Map());

  useEffect(() => {
    const unsubscribe = listenUserConnections(userId, (conns) => {
      setConnections(conns);
      // Rebuild status cache
      statusCache.current.clear();
      conns.forEach((c) => {
        const otherId = c.fromUserId === userId ? c.toUserId : c.fromUserId;
        statusCache.current.set(otherId, c.status);
      });
      setLoading(false);
    });
    return unsubscribe;
  }, [userId]);

  const sendNeighborRequest = useCallback(
    async (targetUserId: string) => {
      if (!currentUser) return;
      const conn: Connection = {
        id: `conn_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
        fromUserId: currentUser.uid,
        toUserId: targetUserId,
        type: 'neighbor',
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      statusCache.current.set(targetUserId, 'pending');
      await createConnection(conn);
    },
    [currentUser]
  );

  const acceptNeighborRequest = useCallback(
    async (connectionId: string) => {
      await updateConnectionStatus(connectionId, 'accepted');
    },
    []
  );

  const declineNeighborRequest = useCallback(
    async (connectionId: string) => {
      await updateConnectionStatus(connectionId, 'blocked');
    },
    []
  );

  const removeConnection = useCallback(
    async (connectionId: string) => {
      await updateConnectionStatus(connectionId, 'blocked');
    },
    []
  );

  const followUser = useCallback(
    async (targetUserId: string) => {
      if (!currentUser) return;
      const conn: Connection = {
        id: `conn_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
        fromUserId: currentUser.uid,
        toUserId: targetUserId,
        type: 'follow',
        status: 'accepted',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      statusCache.current.set(targetUserId, 'accepted');
      await createConnection(conn);
    },
    [currentUser]
  );

  const unfollowUser = useCallback(
    async (targetUserId: string) => {
      if (!currentUser) return;
      const existing = await getConnectionBetweenUsers(currentUser.uid, targetUserId);
      if (existing) {
        statusCache.current.set(targetUserId, 'none');
        await updateConnectionStatus(existing.id, 'blocked');
      }
    },
    [currentUser]
  );

  const getConnectionStatusFn = useCallback(
    (targetUserId: string): ConnectionStatus | 'none' | 'loading' => {
      if (loading) return 'loading';
      return statusCache.current.get(targetUserId) ?? 'none';
    },
    [loading]
  );

  const getMutualConnections = useCallback(
    (targetUserId: string): string[] => {
      // Find connections that both the current user and target user share
      const currentUserIds = new Set(
        connections
          .filter((c) => c.status === 'accepted')
          .map((c) => (c.fromUserId === userId ? c.toUserId : c.fromUserId))
      );
      // For now, we need to find a simpler approach - this can be enhanced
      return Array.from(currentUserIds).slice(0, 3); // placeholder
    },
    [connections, userId]
  );

  return {
    connections,
    loading,
    sendNeighborRequest,
    acceptNeighborRequest,
    declineNeighborRequest,
    removeConnection,
    followUser,
    unfollowUser,
    getConnectionStatus: getConnectionStatusFn,
    getMutualConnections,
  };
};

export default useConnections;
