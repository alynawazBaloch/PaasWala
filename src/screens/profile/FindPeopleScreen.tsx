import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Colors from '../../utils/colors';
import AvatarBadge from '../../components/shared/AvatarBadge';
import { useAuth } from '../../context/AuthContext';
import { useFriends } from '../../hooks/useFriends';
import { useFollow } from '../../hooks/useFollow';
import {
  listenUsersByEmail,
  listenUsersByName,
  findExistingChat,
  createChat,
  createMessageRequest,
  friendshipExists,
} from '../../services/dataService';
import { calculateDistance } from '../../services/maps';
import { isValidEmail } from '../../utils/validators';
import type { UserData } from '../../context/AuthContext';

const MAX_NAME_RADIUS_KM = 15;

type SearchMode = 'email' | 'name' | 'none';

interface SearchResult extends UserData {
  distanceKm?: number;
}

const FindPeopleScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user: currentUser } = useAuth();
  const {
    sendFriendRequest,
    cancelFriendRequest,
    incomingRequests,
    sentRequests,
    getFriendStatus,
  } = useFriends();
  const { follow, unfollow, isFollowing } = useFollow();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>('none');
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const blockedUsers = useMemo(() => new Set(currentUser?.blockedUsers ?? []), [currentUser?.blockedUsers]);

  // Debounce search query
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const trimmed = query.trim();
      setDebounced(trimmed);
      if (!trimmed) {
        setSearchMode('none');
      } else if (isValidEmail(trimmed)) {
        setSearchMode('email');
      } else {
        setSearchMode('name');
      }
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  // Search by email (global, privacy-protected)
  useEffect(() => {
    if (searchMode !== 'email') {
      setResults([]);
      setLoading(false);
      return () => {};
    }
    if (!currentUser?.uid) return () => {};

    setLoading(true);
    const unsub = listenUsersByEmail(debounced.toLowerCase(), (users) => {
      const lower = debounced.toLowerCase();
      const filtered = users
        .filter((u) => u.uid !== currentUser.uid)
        .filter((u) => u.email?.toLowerCase() === lower)
        .filter((u) => !blockedUsers.has(u.uid));
      setResults(filtered as SearchResult[]);
      setLoading(false);
    });
    return unsub;
  }, [debounced, searchMode, currentUser?.uid, blockedUsers]);

  // Search by name (prefix match, restricted to 15 km)
  useEffect(() => {
    if (searchMode !== 'name') {
      setResults([]);
      setLoading(false);
      return () => {};
    }
    if (!currentUser?.uid || typeof currentUser.latitude !== 'number' || typeof currentUser.longitude !== 'number') {
      setResults([]);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    const unsub = listenUsersByName(debounced, (users) => {
      const filtered = users
        .filter((u) => u.uid !== currentUser.uid)
        .filter((u) => !blockedUsers.has(u.uid))
        .map((u) => {
          const dist =
            typeof u.latitude === 'number' && typeof u.longitude === 'number'
              ? calculateDistance(currentUser.latitude!, currentUser.longitude!, u.latitude, u.longitude)
              : Infinity;
          return { ...u, distanceKm: dist };
        })
        .filter((u) => (u.distanceKm ?? Infinity) <= MAX_NAME_RADIUS_KM)
        .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      setResults(filtered);
      setLoading(false);
    });
    return unsub;
  }, [debounced, searchMode, currentUser?.uid, currentUser?.latitude, currentUser?.longitude, blockedUsers]);

  const handleFollowToggle = useCallback(
    async (targetUserId: string) => {
      if (isFollowing(targetUserId)) {
        await unfollow(targetUserId);
      } else {
        await follow(targetUserId);
      }
    },
    [follow, unfollow, isFollowing]
  );

  const handleAddNeighbor = useCallback(
    async (targetUserId: string) => {
      try {
        const existingSent = sentRequests.find(
          (r) => r.toUserId === targetUserId && r.status === 'pending'
        );
        if (existingSent) {
          // Already pending — allow cancelling
          await cancelFriendRequest(existingSent.id, targetUserId);
          return;
        }
        await sendFriendRequest(targetUserId);
      } catch {
        Alert.alert('Error', 'Could not send neighbor request.');
      }
    },
    [sendFriendRequest, cancelFriendRequest, sentRequests, currentUser]
  );

  const handleMessage = useCallback(
    async (targetUser: SearchResult) => {
      if (!currentUser) return;
      const isFriends = await friendshipExists(currentUser.uid, targetUser.uid);
      if (isFriends) {
        const existing = await findExistingChat(currentUser.uid, targetUser.uid);
        const chat =
          existing ?? (await createChat(currentUser.uid, targetUser.uid, currentUser.name, targetUser.name));
        (navigation as any).navigate('Conversation', {
          chatId: chat.id,
          name: targetUser.name ?? 'User',
        });
        return;
      }
      try {
        await createMessageRequest(currentUser.uid, targetUser.uid, currentUser.name, currentUser.avatar);
        Alert.alert('Request Sent', 'They can accept your message request to start chatting.');
      } catch {
        Alert.alert('Error', 'Could not send message request.');
      }
    },
    [navigation, currentUser]
  );

  const formatDistance = (km?: number) => {
    if (km == null || !isFinite(km)) return '';
    if (km < 1) return `${Math.round(km * 1000)}m away`;
    return `${km.toFixed(1)}km away`;
  };

  const renderItem = ({ item }: { item: SearchResult }) => {
    const friendStatus = getFriendStatus(item.uid);
    const following = isFollowing(item.uid);
    const isConnected = friendStatus === 'friends';
    const isPending = friendStatus === 'request_sent';
    const isReceived = friendStatus === 'request_received';

    return (
      <View style={styles.itemRow}>
        <TouchableOpacity
          style={styles.itemLeft}
          onPress={() => (navigation as any).navigate('AuthorProfile', { userId: item.uid })}
        >
          <AvatarBadge
            name={item.name}
            avatar={item.avatar}
            size={48}
            role={item.role}
            verified={item.verified}
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            {item.neighborhoodName ? (
              <Text style={styles.itemMeta} numberOfLines={1}>
                {item.neighborhoodName}
                {item.distanceKm != null ? ` · ${formatDistance(item.distanceKm)}` : ''}
              </Text>
            ) : item.distanceKm != null ? (
              <Text style={styles.itemMeta} numberOfLines={1}>{formatDistance(item.distanceKm)}</Text>
            ) : null}
          </View>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          {isConnected ? (
            <>
              <View style={[styles.actionChip, styles.connectedChip]}>
                <Text style={styles.connectedChipText}>Already Connected</Text>
              </View>
              <TouchableOpacity
                style={styles.messageIconBtn}
                onPress={() => handleMessage(item)}
              >
                <Ionicons name="chatbubble-outline" size={18} color={Colors.accent} />
              </TouchableOpacity>
            </>
          ) : isPending ? (
            <>
              <View style={[styles.actionChip, styles.pendingChip]}>
                <Text style={styles.pendingChipText}>Request Sent</Text>
              </View>
              <TouchableOpacity
                style={styles.messageIconBtn}
                onPress={() => handleMessage(item)}
              >
                <Ionicons name="chatbubble-outline" size={18} color={Colors.accent} />
              </TouchableOpacity>
            </>
          ) : isReceived ? (
            <View style={[styles.actionChip, styles.pendingChip]}>
              <Text style={styles.pendingChipText}>Respond</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.followBtn, following && styles.followingBtn]}
                onPress={() => handleFollowToggle(item.uid)}
              >
                <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addNeighborBtn} onPress={() => handleAddNeighbor(item.uid)}>
                <Ionicons name="person-add" size={16} color={Colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageIconBtn} onPress={() => handleMessage(item)}>
                <Ionicons name="chatbubble-outline" size={18} color={Colors.accent} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Neighbors</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={searchMode === 'none' ? 'people-outline' : 'search-outline'}
            size={48}
            color={Colors.textMuted}
          />
          <Text style={styles.emptyText}>
            {searchMode === 'none'
              ? 'Search for neighbors by name or email'
              : 'No user found'}
          </Text>
          {searchMode === 'name' && (
            <Text style={styles.emptySubtext}>Name search is limited to 15 km around you.</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.uid}
          renderItem={renderItem}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.glassBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, color: Colors.textMuted, fontFamily: 'Inter', textAlign: 'center' },
  emptySubtext: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'Inter', textAlign: 'center' },
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
  actionRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  followBtn: {
    borderWidth: 1,
    borderColor: Colors.accent,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  followBtnText: { fontSize: 12, fontWeight: '600', color: Colors.accent, fontFamily: 'Inter' },
  followingBtn: { backgroundColor: Colors.accent },
  followingBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, fontFamily: 'Inter' },
  addNeighborBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  connectedChip: {
    borderColor: Colors.warning,
    backgroundColor: Colors.glassBg,
  },
  connectedChipText: { fontSize: 11, fontWeight: '600', color: Colors.warning, fontFamily: 'Inter' },
  pendingChip: {
    borderColor: Colors.textMuted,
    backgroundColor: 'transparent',
  },
  pendingChipText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, fontFamily: 'Inter' },
});

export default FindPeopleScreen;
