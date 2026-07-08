import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import GlassCard from '../../components/glass/GlassCard';
import AvatarBadge from '../../components/shared/AvatarBadge';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import useNearbyUsers, { NearbySortMode, NearbyFilterMode } from '../../hooks/useNearbyUsers';
import useConnections from '../../hooks/useConnections';
import type { UserData } from '../../context/AuthContext';

const SORT_OPTIONS: { key: NearbySortMode; label: string }[] = [
  { key: 'nearest', label: 'Nearest' },
  { key: 'recent', label: 'Recent' },
  { key: 'active', label: 'Active' },
];

const FILTER_OPTIONS: { key: NearbyFilterMode; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'verifiedOnly', label: 'Verified' },
  { key: 'sameNeighborhood', label: 'My Hood' },
];

const NearbyNeighborsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const { user: currentUser } = useAuth();
  const { nearbyUsers, loading, error, sortBy, setSortBy, filterBy, setFilterBy, refresh } =
    useNearbyUsers();
  const {
    sendNeighborRequest,
    acceptNeighborRequest,
    declineNeighborRequest,
    followUser,
    getConnectionStatus,
  } = useConnections(currentUser?.uid ?? '');

  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const handleAddNeighbor = useCallback(
    async (targetUserId: string) => {
      try {
        await sendNeighborRequest(targetUserId);
      } catch {
        Alert.alert('Error', 'Could not send neighbor request.');
      }
    },
    [sendNeighborRequest]
  );

  const handleFollow = useCallback(
    async (targetUserId: string) => {
      try {
        await followUser(targetUserId);
      } catch {
        Alert.alert('Error', 'Could not follow user.');
      }
    },
    [followUser]
  );

  const handleAccept = useCallback(
    async (connectionId: string) => {
      try {
        await acceptNeighborRequest(connectionId);
      } catch {
        Alert.alert('Error', 'Could not accept request.');
      }
    },
    [acceptNeighborRequest]
  );

  const handleDecline = useCallback(
    async (connectionId: string) => {
      try {
        await declineNeighborRequest(connectionId);
      } catch {
        Alert.alert('Error', 'Could not decline request.');
      }
    },
    [declineNeighborRequest]
  );

  const handleViewProfile = useCallback(
    (targetUserId: string) => {
      const n = nav as any;
      if (targetUserId === currentUser?.uid) {
        n.navigate('MainTabs');
      } else {
        n.navigate('AuthorProfile', { userId: targetUserId });
      }
    },
    [nav, currentUser]
  );

  const handleMessage = useCallback(
    (targetUserId: string, targetName: string) => {
      const n = nav as any;
      n.navigate('Conversation', {
        chatId: `chat_${currentUser?.uid}_${targetUserId}`,
        name: targetName,
      });
    },
    [nav, currentUser]
  );

  const renderActionButtons = useCallback(
    (item: UserData & { distanceKm: number }) => {
      if (item.uid === currentUser?.uid) {
        return (
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => handleViewProfile(item.uid!)}
          >
            <Text style={styles.profileBtnText}>Your Profile</Text>
          </TouchableOpacity>
        );
      }

      const status = getConnectionStatus(item.uid!);

      if (status === 'accepted') {
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.messageBtn}
              onPress={() => handleMessage(item.uid!, item.name ?? 'Neighbor')}
            >
              <Ionicons name="chatbubble-outline" size={16} color={Colors.textPrimary} />
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>
          </View>
        );
      }

      if (status === 'pending') {
        return (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>Request Sent</Text>
          </View>
        );
      }

      if (status === 'loading') {
        return <ActivityIndicator size="small" color={Colors.accent} />;
      }

      // 'none' or 'blocked' — show Add Neighbor + Follow
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => handleAddNeighbor(item.uid!)}
          >
            <Ionicons name="person-add-outline" size={16} color={Colors.textPrimary} />
            <Text style={styles.addBtnText}>Add Neighbor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.followBtn}
            onPress={() => handleFollow(item.uid!)}
          >
            <Text style={styles.followBtnText}>Follow</Text>
          </TouchableOpacity>
        </View>
      );
    },
    [currentUser, getConnectionStatus, handleAddNeighbor, handleFollow, handleViewProfile, handleMessage]
  );

  const renderUserCard = useCallback(
    ({ item }: { item: UserData & { distanceKm: number } }) => (
      <GlassCard style={styles.userCard} noTouch>
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={() => handleViewProfile(item.uid!)}
          activeOpacity={0.7}
        >
          <AvatarBadge
            name={item.name ?? 'User'}
            avatar={item.avatar ?? ''}
            size={52}
            role={item.role ?? 'resident'}
            verified={item.verified ?? false}
          />
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.name ?? 'Unknown'}
              </Text>
              {item.verified && (
                <Ionicons name="checkmark-circle" size={16} color={Colors.accent} />
              )}
            </View>
            <Text style={styles.roleText}>
              {item.role === 'admin'
                ? 'Admin'
                : item.role === 'superAdmin'
                ? 'Super Admin'
                : item.role === 'business'
                ? 'Business'
                : 'Resident'}
            </Text>
            {item.neighborhoodName && (
              <Text style={styles.neighborhoodText} numberOfLines={1}>
                {item.neighborhoodName}
              </Text>
            )}
            <Text style={styles.distanceText}>
              {item.distanceKm < 1
                ? `${Math.round(item.distanceKm * 1000)} m away`
                : `${item.distanceKm.toFixed(1)} km away`}
            </Text>
          </View>
        </TouchableOpacity>

        {renderActionButtons(item)}
      </GlassCard>
    ),
    [handleViewProfile, renderActionButtons]
  );

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Nearby Neighbors</Text>
      <View style={styles.headerRight} />
    </View>
  );

  const renderSortFilterRow = () => (
    <View style={styles.sortFilterRow}>
      {/* Sort dropdown */}
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => {
          setShowSort(!showSort);
          setShowFilter(false);
        }}
      >
        <Text style={styles.dropdownLabel}>
          Sort: {SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? 'Nearest'}
        </Text>
        <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
      </TouchableOpacity>

      {/* Filter dropdown */}
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => {
          setShowFilter(!showFilter);
          setShowSort(false);
        }}
      >
        <Text style={styles.dropdownLabel}>
          Filter: {FILTER_OPTIONS.find((o) => o.key === filterBy)?.label ?? 'All'}
        </Text>
        <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const renderSortOptions = () => {
    if (!showSort) return null;
    return (
      <View style={styles.optionsRow}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.optionChip, sortBy === opt.key && styles.optionChipActive]}
            onPress={() => {
              setSortBy(opt.key);
              setShowSort(false);
            }}
          >
            <Text
              style={[styles.optionChipText, sortBy === opt.key && styles.optionChipTextActive]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderFilterOptions = () => {
    if (!showFilter) return null;
    return (
      <View style={styles.optionsRow}>
        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.optionChip, filterBy === opt.key && styles.optionChipActive]}
            onPress={() => {
              setFilterBy(opt.key);
              setShowFilter(false);
            }}
          >
            <Text
              style={[
                styles.optionChipText,
                filterBy === opt.key && styles.optionChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No neighbors nearby</Text>
      <Text style={styles.emptySubtitle}>
        Invite your neighbors to join PaasWala to see who's around!
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="location-outline" size={64} color={Colors.warning} />
      <Text style={styles.emptyTitle}>Location Needed</Text>
      <Text style={styles.emptySubtitle}>{error}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Finding neighbors near you...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderSortFilterRow()}
      {renderSortOptions()}
      {renderFilterOptions()}

      {error ? (
        renderError()
      ) : (
        <FlatList
          data={nearbyUsers}
          renderItem={renderUserCard}
          keyExtractor={(item) => item.uid ?? item.name ?? Math.random().toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          onRefresh={refresh}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  headerRight: {
    width: 32,
  },

  // Sort / Filter
  sortFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.glassBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  dropdownLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  optionChip: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  optionChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  optionChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  optionChipTextActive: {
    color: Colors.textPrimary,
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // Card
  userCard: {
    padding: 14,
    marginBottom: 12,
  },
  cardTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  roleText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  neighborhoodText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '400',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  distanceText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '400',
    fontFamily: 'Inter',
    marginTop: 2,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  followBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Inter',
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  messageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  profileBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.textMuted,
    alignSelf: 'flex-start',
  },
  profileBtnText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  pendingBadge: {
    backgroundColor: Colors.glassBg,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignSelf: 'flex-start',
  },
  pendingBadgeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Inter',
  },

  // Loading / Empty / Error
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter',
    lineHeight: 20,
  },
});

export default NearbyNeighborsScreen;
