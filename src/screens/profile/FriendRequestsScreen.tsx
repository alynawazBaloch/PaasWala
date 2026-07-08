import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Colors from '../../utils/colors';
import AvatarBadge from '../../components/shared/AvatarBadge';
import { useAuth } from '../../context/AuthContext';
import { useFriends } from '../../hooks/useFriends';
import { getUserById } from '../../services/dataService';
import { calculateDistance } from '../../services/maps';
import type { UserData } from '../../context/AuthContext';

type TabType = 'received' | 'sent';

const FriendRequestsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user: currentUser } = useAuth();
  const {
    incomingRequests,
    sentRequests,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    isFriend,
  } = useFriends();

  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [userCache, setUserCache] = useState<Record<string, UserData>>({});

  const loadUser = useCallback(
    async (userId: string) => {
      if (userCache[userId]) return userCache[userId];
      const u = await getUserById(userId);
      if (u) {
        setUserCache((prev) => ({ ...prev, [userId]: u }));
        return u;
      }
      return null;
    },
    [userCache]
  );

  // Load user data for all displayed requests
  React.useEffect(() => {
    const ids =
      activeTab === 'received'
        ? incomingRequests.map((r) => r.fromUserId)
        : sentRequests.map((r) => r.toUserId);

    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return;

    uniqueIds.forEach((id) => loadUser(id));
  }, [activeTab, incomingRequests, sentRequests, loadUser]);

  const handleAccept = useCallback(
    async (connId: string, fromUserId: string) => {
      await acceptFriendRequest(connId, fromUserId);
    },
    [acceptFriendRequest]
  );

  const handleDecline = useCallback(
    async (connId: string, fromUserId: string) => {
      await declineFriendRequest(connId, fromUserId);
    },
    [declineFriendRequest]
  );

  const handleCancel = useCallback(
    async (connId: string, toUserId: string) => {
      await cancelFriendRequest(connId, toUserId);
    },
    [cancelFriendRequest]
  );

  const formatDistance = (km?: number) => {
    if (km == null || !isFinite(km)) return '';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const getDistanceKm = (u?: UserData | null) => {
    if (
      !u ||
      typeof u.latitude !== 'number' ||
      typeof u.longitude !== 'number' ||
      typeof currentUser?.latitude !== 'number' ||
      typeof currentUser?.longitude !== 'number'
    ) {
      return undefined;
    }
    return calculateDistance(currentUser.latitude, currentUser.longitude, u.latitude, u.longitude);
  };

  const getMutualCount = (u?: UserData | null) => {
    // Mutual friend count not available without separate queries
    return 0;
  };

  const renderReceivedItem = ({ item }: { item: typeof incomingRequests[0] }) => {
    const u = userCache[item.fromUserId];
    const distKm = getDistanceKm(u);
    const mutuals = getMutualCount(u);
    const distanceText = distKm != null ? `${formatDistance(distKm)} · ` : '';
    const mutualText = mutuals === 1 ? '1 mutual neighbor' : `${mutuals} mutual neighbors`;

    return (
      <View style={styles.itemRow}>
        <TouchableOpacity
          style={styles.itemLeft}
          onPress={() => (navigation as any).navigate('AuthorProfile', { userId: item.fromUserId })}
        >
          {u ? (
            <AvatarBadge
              name={u.name}
              avatar={u.avatar}
              size={48}
              role={u.role}
              verified={u.verified}
            />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{u?.name ?? 'Loading...'}</Text>
            <Text style={styles.itemMeta}>
              {distanceText}{mutualText}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => handleAccept(item.id, item.fromUserId)}
          >
            <Text style={styles.acceptBtnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={() => handleDecline(item.id, item.fromUserId)}
          >
            <Text style={styles.declineBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSentItem = ({ item }: { item: typeof sentRequests[0] }) => {
    const u = userCache[item.toUserId];
    const isPending = item.status === 'pending';
    return (
      <View style={styles.itemRow}>
        <TouchableOpacity
          style={styles.itemLeft}
          onPress={() => (navigation as any).navigate('AuthorProfile', { userId: item.toUserId })}
        >
          {u ? (
            <AvatarBadge
              name={u.name}
              avatar={u.avatar}
              size={48}
              role={u.role}
              verified={u.verified}
            />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{u?.name ?? 'Loading...'}</Text>
            <Text style={styles.itemStatus}>
              {isPending ? 'Request Sent' : 'Declined'}
            </Text>
          </View>
        </TouchableOpacity>
        {isPending && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancel(item.id, item.toUserId)}
          >
            <Text style={styles.cancelBtnText}>Cancel Request</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const listEmpty = activeTab === 'received'
    ? incomingRequests.length === 0
    : sentRequests.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Neighbor Requests</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.tabActive]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
            Received ({incomingRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.tabActive]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
            Sent ({sentRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {listEmpty ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={activeTab === 'received' ? 'person-add-outline' : 'send-outline'}
            size={48}
            color={Colors.textMuted}
          />
          <Text style={styles.emptyText}>
            {activeTab === 'received' ? 'No incoming requests' : 'No sent requests'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'received' ? incomingRequests : sentRequests}
          keyExtractor={(item) => item.id}
          renderItem={activeTab === 'received' ? renderReceivedItem : renderSentItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.glassBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Inter' },
  headerSpacer: { width: 40 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
  },
  tabActive: { borderColor: Colors.accent },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted, fontFamily: 'Inter' },
  tabTextActive: { color: Colors.accent },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textMuted, fontFamily: 'Inter' },
  listContent: { padding: 16 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, fontFamily: 'Inter' },
  itemMeta: { fontSize: 12, color: Colors.textMuted, fontFamily: 'Inter', marginTop: 2 },
  itemStatus: { fontSize: 12, color: Colors.textSecondary, fontFamily: 'Inter', marginTop: 2 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.glassBg },
  actionRow: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  acceptBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Inter' },
  declineBtn: {
    borderWidth: 1,
    borderColor: Colors.error,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  declineBtnText: { fontSize: 13, fontWeight: '600', color: Colors.error, fontFamily: 'Inter' },
  cancelBtn: {
    borderWidth: 1,
    borderColor: Colors.textMuted,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, fontFamily: 'Inter' },
});

export default FriendRequestsScreen;
