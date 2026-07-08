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
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import Colors from '../../utils/colors';
import AvatarBadge from '../../components/shared/AvatarBadge';
import { useAuth } from '../../context/AuthContext';
import { useFollow } from '../../hooks/useFollow';
import { getUserById } from '../../services/dataService';
import type { UserData } from '../../context/AuthContext';
import type { AppStackParamList } from '../../navigation/AppNavigator';

type RouteProps = RouteProp<AppStackParamList, 'FollowersList'>;

interface FollowerWithUser {
  connectionId: string;
  user: UserData;
}

const FollowersListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { userId } = route.params;
  const { user: currentUser } = useAuth();
  const isOwn = userId === currentUser?.uid;

  const { followers, follow, unfollow, isFollowing } = useFollow(isOwn ? undefined : userId);
  const [users, setUsers] = useState<FollowerWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (followers.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all(
      followers.map(async (conn) => {
        const u = await getUserById(conn.fromUserId);
        if (!u) return null;
        return { connectionId: conn.id, user: u };
      })
    ).then((results) => {
      if (cancelled) return;
      setUsers(results.filter(Boolean) as FollowerWithUser[]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [followers]);

  const handleFollowToggle = useCallback(async (targetUserId: string) => {
    if (isFollowing(targetUserId)) {
      await unfollow(targetUserId);
    } else {
      await follow(targetUserId);
    }
  }, [follow, unfollow, isFollowing]);

  const renderItem = ({ item }: { item: FollowerWithUser }) => {
    const isMe = item.user.uid === currentUser?.uid;
    return (
      <View style={styles.itemRow}>
        <TouchableOpacity
          style={styles.itemLeft}
          onPress={() => {
            if (isMe) {
              (navigation as any).navigate('MainTabs', { screen: 'Profile' });
            } else {
              (navigation as any).navigate('AuthorProfile', { userId: item.user.uid });
            }
          }}
        >
          <AvatarBadge
            name={item.user.name}
            avatar={item.user.avatar}
            size={44}
            role={item.user.role}
            verified={item.user.verified}
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{item.user.name}</Text>
            {item.user.neighborhoodName && (
              <Text style={styles.itemNeighborhood} numberOfLines={1}>
                {item.user.neighborhoodName}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        {!isMe && (
          <TouchableOpacity
            style={[
              styles.followBtn,
              isFollowing(item.user.uid) && styles.followBtnActive,
            ]}
            onPress={() => handleFollowToggle(item.user.uid)}
          >
            <Text
              style={[
                styles.followBtnText,
                isFollowing(item.user.uid) && styles.followBtnTextActive,
              ]}
            >
              {isFollowing(item.user.uid) ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Followers</Text>
        <View style={styles.headerSpacer} />
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No followers yet</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.connectionId}
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
  itemNeighborhood: { fontSize: 12, color: Colors.textSecondary, fontFamily: 'Inter', marginTop: 2 },
  followBtn: {
    borderWidth: 1,
    borderColor: Colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  followBtnActive: { backgroundColor: Colors.accent },
  followBtnText: { fontSize: 12, fontWeight: '600', color: Colors.accent, fontFamily: 'Inter' },
  followBtnTextActive: { color: Colors.textPrimary },
});

export default FollowersListScreen;
