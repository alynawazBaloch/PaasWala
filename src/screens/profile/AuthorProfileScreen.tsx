import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import GlassCard from '../../components/glass/GlassCard';
import AvatarBadge from '../../components/shared/AvatarBadge';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import {
  getUserById,
  findExistingChat,
  createChat,
  friendshipExists,
  createMessageRequest,
} from '../../services/dataService';
import type { UserData } from '../../context/AuthContext';
import { useFollow } from '../../hooks/useFollow';
import { useFriends } from '../../hooks/useFriends';
import type { AppStackParamList } from '../../navigation/AppNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 8;
const GRID_COLS = 3;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 32 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

type AuthorProfileRouteProp = RouteProp<AppStackParamList, 'AuthorProfile'>;

const AuthorProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<AuthorProfileRouteProp>();
  const { userId } = route.params;
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const isOwnProfile = userId === currentUser?.uid;

  const {
    follow: doFollow,
    unfollow: doUnfollow,
    isFollowing,
    followersCount,
    followingCount,
  } = useFollow(userId);

  const {
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    incomingRequests,
    isFriend,
    getFriendStatus,
  } = useFriends();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const user = await getUserById(userId);
      setProfileUser(user);
      setLoading(false);
    })();
  }, [userId]);

  const handleFollow = useCallback(async () => {
    try {
      if (isFollowing(userId)) {
        await doUnfollow(userId);
      } else {
        await doFollow(userId);
      }
    } catch {
      Alert.alert('Error', 'Could not update follow status.');
    }
  }, [doFollow, doUnfollow, userId, isFollowing]);

  const handleAddNeighbor = useCallback(async () => {
    try {
      await sendFriendRequest(userId);
    } catch {
      Alert.alert('Error', 'Could not send neighbor request.');
    }
  }, [sendFriendRequest, userId]);

  const handleAcceptNeighbor = useCallback(
    async (requestId: string, fromUserId: string) => {
      try {
        await acceptFriendRequest(requestId, fromUserId);
      } catch {
        Alert.alert('Error', 'Could not accept request.');
      }
    },
    [acceptFriendRequest]
  );

  const handleDeclineNeighbor = useCallback(
    async (requestId: string, fromUserId: string) => {
      try {
        if (currentUser) {
          await declineFriendRequest(requestId, fromUserId);
        }
      } catch {
        Alert.alert('Error', 'Could not decline request.');
      }
    },
    [currentUser, declineFriendRequest]
  );

  const handleMessage = useCallback(async () => {
    if (!currentUser || !profileUser) return;
    const isFriends = await friendshipExists(currentUser.uid, userId);
    if (isFriends) {
      const existing = await findExistingChat(currentUser.uid, userId);
      const chat = existing ?? (await createChat(currentUser.uid, userId, currentUser.name, profileUser.name));
      (navigation as any).navigate('Conversation', {
        chatId: chat.id,
        name: profileUser.name ?? 'User',
      });
      return;
    }
    // Not friends — send a message request
    try {
      await createMessageRequest(
        currentUser.uid,
        userId,
        currentUser.name,
        currentUser.avatar
      );
      Alert.alert('Request Sent', 'They will be notified once they accept your message request.');
    } catch {
      Alert.alert('Error', 'Could not send message request.');
    }
  }, [navigation, currentUser, userId, profileUser]);

  const neighborStatus = isOwnProfile ? 'none' : getFriendStatus(userId);

  const incomingRequest = incomingRequests.find(
    (r) => r.fromUserId === userId && r.status === 'pending'
  );

  const renderConnectionButtons = () => {
    if (isOwnProfile) {
      return (
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => (navigation as any).navigate('EditProfile')}
        >
          <Ionicons name="create-outline" size={18} color={Colors.accent} />
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.connectionRow}>
        {/* Neighbor / Friend section */}
        {neighborStatus === 'none' && (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleAddNeighbor}>
            <Ionicons name="person-add-outline" size={18} color={Colors.textPrimary} />
            <Text style={styles.primaryBtnText}>Add Neighbor</Text>
          </TouchableOpacity>
        )}
        {neighborStatus === 'request_sent' && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>Request Sent</Text>
          </View>
        )}
        {neighborStatus === 'request_received' && incomingRequest && (
          <View style={styles.pendingSection}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => handleAcceptNeighbor(incomingRequest.id, incomingRequest.fromUserId)}
            >
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => handleDeclineNeighbor(incomingRequest.id, incomingRequest.fromUserId)}
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
        {neighborStatus === 'friends' && (
          <View style={styles.neighborBadge}>
            <Ionicons name="people" size={16} color={Colors.accent} />
            <Text style={styles.neighborBadgeText}>Neighbors</Text>
          </View>
        )}

        {/* Follow button */}
        {!isOwnProfile && (
          <TouchableOpacity
            style={[styles.followBtn, isFollowing(userId) && styles.followBtnActive]}
            onPress={handleFollow}
          >
            <Text
              style={[
                styles.followBtnText,
                isFollowing(userId) && styles.followBtnTextActive,
              ]}
            >
              {isFollowing(userId) ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Message button — available to everyone (friends start chat, strangers send request) */}
        {!isOwnProfile && (
          <TouchableOpacity style={styles.messageBtn} onPress={handleMessage}>
            <Ionicons name="chatbubble-outline" size={18} color={Colors.textPrimary} />
            <Text style={styles.messageBtnText}>Message</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profileUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="person-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.errorText}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cover */}
        <LinearGradient
          colors={[Colors.primary, Colors.background]}
          style={[styles.coverGradient, { paddingTop: insets.top + 60 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Avatar overlay */}
        <View style={styles.avatarSection}>
          <AvatarBadge
            name={profileUser.name ?? 'User'}
            avatar={profileUser.avatar ?? ''}
            size={80}
            role={profileUser.role ?? 'resident'}
            verified={profileUser.verified ?? false}
          />
        </View>

        {/* User info */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{profileUser.name ?? 'Unknown User'}</Text>
            {profileUser.verified && (
              <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
            )}
            {isOwnProfile && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>

          <Text style={styles.roleText}>
            {profileUser.role === 'admin'
              ? 'Neighborhood Admin'
              : profileUser.role === 'superAdmin'
              ? 'Super Admin'
              : profileUser.role === 'business'
              ? 'Business Owner'
              : 'Resident'}
          </Text>

          {profileUser.streetName && (
            <Text style={styles.streetText}>{profileUser.streetName}</Text>
          )}
          {profileUser.neighborhoodName && (
            <Text style={styles.neighborhoodLabel}>{profileUser.neighborhoodName}</Text>
          )}

          {/* Reputation */}
          <View style={styles.reputationRow}>
            <Ionicons name="star" size={16} color={Colors.warning} />
            <Text style={styles.reputationText}>
              Level {Math.floor((profileUser.reputationScore ?? 0) / 50) + 1}
            </Text>
          </View>
        </View>

        {/* Connection buttons */}
        <View style={styles.connectionSection}>{renderConnectionButtons()}</View>

        {/* Stats row */}
        <GlassCard style={styles.statsCard} noTouch>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileUser.reputationScore ?? 0}</Text>
              <Text style={styles.statLabel}>Rep</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileUser.reputationScore ? 1 : 0}</Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
          </View>
        </GlassCard>

        {/* Posts grid placeholder */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Posts</Text>
        </View>

        {/* Empty grid placeholder for now — could be populated by querying posts by authorId */}
        <View style={styles.emptyGrid}>
          <Ionicons name="images-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyGridText}>No posts yet</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },

  // Cover
  coverGradient: {
    height: 160,
    paddingHorizontal: 16,
    paddingBottom: 20,
    justifyContent: 'flex-start',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Avatar
  avatarSection: {
    marginTop: -40,
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  // Info
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  youBadge: {
    backgroundColor: Colors.primary,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  youBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  roleText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  streetText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  neighborhoodLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  reputationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  reputationText: {
    fontSize: 13,
    color: Colors.warning,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  // Connection
  connectionSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  connectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 22,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  pendingSection: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  pendingBadge: {
    backgroundColor: Colors.glassBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  pendingBadgeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  acceptBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  declineBtn: {
    borderWidth: 1,
    borderColor: Colors.error,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  declineBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
    fontFamily: 'Inter',
  },
  neighborBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.glassBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  neighborBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Inter',
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.glassBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  friendBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
    fontFamily: 'Inter',
  },
  friendAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  friendAddBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  followBtn: {
    borderWidth: 1,
    borderColor: Colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  followBtnActive: {
    backgroundColor: Colors.accent,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Inter',
  },
  followBtnTextActive: {
    color: Colors.textPrimary,
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  messageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignSelf: 'flex-start',
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Inter',
  },

  // Stats
  statsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.glassBorder,
  },

  // Section
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },

  // Empty grid
  emptyGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 40,
  },
  emptyGridText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
});

export default AuthorProfileScreen;
