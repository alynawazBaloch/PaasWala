import React, { useState, useEffect, useCallback } from 'react';
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
import { getUserById, findExistingChat, createChat } from '../../services/dataService';
import type { UserData } from '../../context/AuthContext';

const FriendsListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user: currentUser } = useAuth();
  const { friends } = useFriends();
  const [users, setUsers] = useState<{ friendId: string; user: UserData }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (friends.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all(
      friends.map(async (conn) => {
        const otherId = conn.fromUserId === currentUser?.uid ? conn.toUserId : conn.fromUserId;
        const u = await getUserById(otherId);
        if (!u) return null;
        return { friendId: conn.id, user: u };
      })
    ).then((results) => {
      if (cancelled) return;
      setUsers(results.filter(Boolean) as { friendId: string; user: UserData }[]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [friends, currentUser?.uid]);

  const handleMessage = useCallback(async (targetUser: UserData) => {
    if (!currentUser) return;
    const existing = await findExistingChat(currentUser.uid, targetUser.uid);
    let chatId: string;
    if (existing) {
      chatId = existing.id;
    } else {
      const chat = await createChat(currentUser.uid, targetUser.uid, currentUser.name, targetUser.name);
      chatId = chat.id;
    }
    (navigation as any).navigate('Conversation', { chatId, name: targetUser.name });
  }, [currentUser, navigation]);

  const renderItem = ({ item }: { item: { friendId: string; user: UserData } }) => {
    const u = item.user;
    return (
      <View style={styles.itemRow}>
        <TouchableOpacity
          style={styles.itemLeft}
          onPress={() => (navigation as any).navigate('AuthorProfile', { userId: u.uid })}
        >
          <AvatarBadge
            name={u.name}
            avatar={u.avatar}
            size={48}
            role={u.role}
            verified={u.verified}
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{u.name}</Text>
            {u.neighborhoodName && (
              <Text style={styles.itemNeighborhood} numberOfLines={1}>
                {u.neighborhoodName}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.messageBtn} onPress={() => handleMessage(u)}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.textPrimary} />
          <Text style={styles.messageBtnText}>Message</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={styles.headerSpacer} />
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No friends yet</Text>
          <Text style={styles.emptySubtext}>Send a friend request to connect</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.friendId}
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textMuted, fontFamily: 'Inter' },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, fontFamily: 'Inter' },
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
  itemNeighborhood: { fontSize: 12, color: Colors.textSecondary, fontFamily: 'Inter', marginTop: 2 },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  messageBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, fontFamily: 'Inter' },
});

export default FriendsListScreen;
