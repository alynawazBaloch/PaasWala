import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../utils/colors';
import GlassCard from '../../components/glass/GlassCard';
import AvatarBadge from '../../components/shared/AvatarBadge';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../hooks/useChat';
import {
  listenChatRequestsToUser,
  acceptMessageRequest,
  declineChatRequest,
  pinChat,
  muteChat,
  deleteChat,
} from '../../services/dataService';
import type { Chat, ChatRequest } from '../../services/dataService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MAX_PINNED = 3;

type TabType = 'chats' | 'requests';

interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  role: 'resident' | 'admin' | 'superAdmin' | 'business';
  verified: boolean;
  online: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isTyping?: boolean;
  raw: Chat;
}

const ChatListScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // Real-time chats via useChat() (no chatId = chat list mode)
  const { chats, loading } = useChat();

  // Real-time chat requests
  useEffect(() => {
    if (!user?.uid) return () => {};
    return listenChatRequestsToUser(user.uid, (reqs) => {
      setRequests(reqs.filter((r) => r.status === 'pending'));
    });
  }, [user?.uid]);

  const handleTabChange = useCallback(
    (tab: TabType) => {
      setActiveTab(tab);
      Animated.spring(slideAnim, {
        toValue: tab === 'chats' ? 0 : 1,
        useNativeDriver: true,
        stiffness: 200,
        damping: 25,
      }).start();
    },
    [slideAnim]
  );

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const timeSince = Date.now() - timestamp;
    if (timeSince < 60000) return 'Just now';
    if (timeSince < 3600000) return `${Math.floor(timeSince / 60000)}m ago`;
    if (timeSince < 86400000) return `${Math.floor(timeSince / 3600000)}h ago`;
    if (timeSince < 172800000) return 'Yesterday';
    return `${Math.floor(timeSince / 86400000)}d ago`;
  };

  const mapChatToChatUser = useCallback((chat: Chat): ChatUser => {
    const otherUserId = chat.participants.find((id) => id !== user?.uid) || chat.participants[0];
    const isPinned = chat.pinnedBy?.[user?.uid ?? ''] ?? chat.pinned ?? false;
    const isMuted = chat.muted?.[user?.uid ?? ''] ?? chat.isMuted ?? false;
    const otherTyping = chat.typing?.[otherUserId] ?? 0;
    const isTyping = otherTyping > 0 && Date.now() - otherTyping < 3000;

    return {
      id: chat.id,
      name:
        chat.type === 'group' && chat.groupName
          ? chat.groupName
          : chat.participantNames[otherUserId] || 'Unknown',
      avatar: chat.type === 'group' ? chat.groupPhoto : chat.participantAvatars[otherUserId],
      role: 'resident',
      verified: false,
      online: chat.online?.[otherUserId] || false,
      lastMessage: chat.lastMessage || '',
      lastMessageTime: formatTime(chat.lastTimestamp),
      unreadCount: chat.unreadCount ?? 0,
      isPinned,
      isMuted,
      isTyping,
      raw: chat,
    };
  }, [user?.uid]);

  const chatUsers = useMemo(() => chats.map(mapChatToChatUser), [chats, mapChatToChatUser]);
  const pinnedCount = useMemo(() => chatUsers.filter((c) => c.isPinned).length, [chatUsers]);

  const displayedChats = useMemo(() => {
    let list = [...chatUsers];
    list.sort((a, b) => {
      const aPinned = a.isPinned ? 1 : 0;
      const bPinned = b.isPinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return (b.raw.lastTimestamp ?? 0) - (a.raw.lastTimestamp ?? 0);
    });
    if (showUnreadOnly) {
      list = list.filter((c) => c.unreadCount > 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [chatUsers, showUnreadOnly, searchQuery]);

  const indicatorTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH / 2 - 40],
  });

  const handlePin = useCallback(
    async (chat: ChatUser) => {
      if (!user) return;
      const nextPinned = !chat.isPinned;
      if (nextPinned && pinnedCount >= MAX_PINNED) {
        Alert.alert('Pin Limit Reached', `You can pin up to ${MAX_PINNED} chats.`);
        return;
      }
      await pinChat(chat.id, user.uid, nextPinned);
    },
    [user, pinnedCount]
  );

  const handleMute = useCallback(
    async (chat: ChatUser) => {
      if (!user) return;
      await muteChat(chat.id, user.uid, !chat.isMuted);
    },
    [user]
  );

  const handleDelete = useCallback(
    async (chat: ChatUser) => {
      Alert.alert('Delete Chat?', 'This will remove the chat and its messages.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteChat(chat.id);
          },
        },
      ]);
    },
    []
  );

  const renderRightActions = (chat: ChatUser) => (
    <View style={styles.swipeActionsRight}>
      <TouchableOpacity
        style={[styles.swipeBtn, styles.swipePinBtn]}
        onPress={() => handlePin(chat)}
      >
        <Ionicons name={chat.isPinned ? 'close' : 'pin'} size={22} color={Colors.textPrimary} />
        <Text style={styles.swipeBtnText}>{chat.isPinned ? 'Unpin' : 'Pin'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLeftActions = (chat: ChatUser) => (
    <View style={styles.swipeActionsLeft}>
      <TouchableOpacity
        style={[styles.swipeBtn, styles.swipeMuteBtn]}
        onPress={() => handleMute(chat)}
      >
        <Ionicons
          name={chat.isMuted ? 'notifications-off-outline' : 'notifications-outline'}
          size={22}
          color={Colors.textPrimary}
        />
        <Text style={styles.swipeBtnText}>{chat.isMuted ? 'Unmute' : 'Mute'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeBtn, styles.swipeDeleteBtn]}
        onPress={() => handleDelete(chat)}
      >
        <Ionicons name="trash-outline" size={22} color={Colors.textPrimary} />
        <Text style={styles.swipeBtnText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const handleAcceptRequest = async (req: ChatRequest) => {
    if (!user) return;
    const chat = await acceptMessageRequest(req, user.uid, user.name || 'User', user.avatar);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    navigation.navigate('Conversation', { chatId: chat.id, name: req.fromName });
  };

  const handleDeclineRequest = async (requestId: string) => {
    await declineChatRequest(requestId);
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const renderTabBar = () => (
    <View style={styles.tabContainer}>
      <View style={styles.tabRow}>
        <TouchableOpacity style={styles.tab} onPress={() => handleTabChange('chats')} activeOpacity={0.7}>
          <Text style={[styles.tabText, activeTab === 'chats' && styles.tabTextActive]}>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => handleTabChange('requests')} activeOpacity={0.7}>
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>Requests</Text>
          <View style={styles.requestBadge}>
            <Text style={styles.requestBadgeText}>{requests.length}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <Animated.View style={[styles.tabIndicator, { transform: [{ translateX: indicatorTranslateX }] }]} />
    </View>
  );

  const renderActiveNow = () => {
    const onlineUsers = chatUsers.filter((c) => c.online).slice(0, 8);
    if (onlineUsers.length === 0) return null;

    return (
      <View style={styles.activeNowSection}>
        <View style={styles.activeNowHeader}>
          <Ionicons name="flash" size={16} color={Colors.accent} />
          <Text style={styles.activeNowTitle}>Active Now</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeNowScroll}>
          {onlineUsers.map((u) => (
            <TouchableOpacity
              key={u.id}
              style={styles.activeUserItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Conversation', { chatId: u.id, name: u.name })}
            >
              <View style={styles.activeAvatarWrap}>
                <View style={styles.activeAvatarCircle}>
                  <Text style={styles.activeAvatarText}>
                    {u.name.split(' ').map((n) => n[0]).join('')}
                  </Text>
                </View>
                <View style={styles.activeOnlineDot} />
              </View>
              <Text style={styles.activeUserName} numberOfLines={1}>{u.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderChatItem = (chat: ChatUser) => (
    <Swipeable
      key={chat.id}
      renderRightActions={() => renderRightActions(chat)}
      renderLeftActions={() => renderLeftActions(chat)}
      friction={2}
      leftThreshold={40}
      rightThreshold={40}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Conversation', { chatId: chat.id, name: chat.name })}
        style={styles.chatItem}
      >
        <GlassCard style={styles.chatCard} glowColor={chat.unreadCount > 0 ? Colors.accent : Colors.glassBorder}>
          <View style={styles.chatRow}>
            <View style={styles.chatAvatarSection}>
              <AvatarBadge
                name={chat.name}
                avatar={chat.avatar}
                size={52}
                role={chat.role}
                verified={chat.verified}
                showOnline
                online={chat.online}
              />
              {chat.isPinned && (
                <View style={styles.pinBadge}>
                  <Ionicons name="pin" size={10} color={Colors.accent} />
                </View>
              )}
            </View>
            <View style={styles.chatContent}>
              <View style={styles.chatNameRow}>
                <View style={styles.nameVerifiedRow}>
                  <Text style={styles.chatName} numberOfLines={1}>{chat.name}</Text>
                  {chat.verified && chat.role !== 'resident' && (
                    <Ionicons name="checkmark-circle" size={14} color={Colors.accent} style={styles.verifiedIcon} />
                  )}
                  {chat.isMuted && (
                    <Ionicons name="notifications-off" size={12} color={Colors.textMuted} style={styles.mutedIcon} />
                  )}
                </View>
                <Text style={styles.chatTime}>{chat.lastMessageTime}</Text>
              </View>
              <View style={styles.chatMessageRow}>
                <View style={styles.messagePreviewWrap}>
                  {chat.isTyping ? (
                    <Text style={styles.typingText}>Typing...</Text>
                  ) : (
                    <Text style={styles.chatMessage} numberOfLines={1}>{chat.lastMessage}</Text>
                  )}
                </View>
                {chat.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Swipeable>
  );

  const renderRequestsTab = () => (
    <View style={styles.requestsContainer}>
      {requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No requests yet</Text>
          <Text style={styles.emptySubtitle}>Pending message requests will appear here</Text>
        </View>
      ) : (
        requests.map((req) => (
          <GlassCard key={req.id} style={styles.requestCard}>
            <View style={styles.requestRow}>
              <AvatarBadge name={req.fromName} avatar={req.fromAvatar} size={48} role="resident" />
              <View style={styles.requestContent}>
                <Text style={styles.requestName}>{req.fromName}</Text>
                <Text style={styles.requestMeta}>Wants to message you</Text>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptRequest(req)}>
                  <Ionicons name="checkmark" size={20} color={Colors.background} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => handleDeclineRequest(req.id)}>
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('FindPeople')}>
            <Ionicons name="create-outline" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('StarredMessages')}>
            <Ionicons name="star-outline" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {renderTabBar()}

      <View style={styles.searchContainer}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, showUnreadOnly && styles.filterBtnActive]}
          onPress={() => setShowUnreadOnly((v) => !v)}
        >
          <Ionicons name={showUnreadOnly ? 'mail-open' : 'mail'} size={18} color={showUnreadOnly ? Colors.accent : Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {activeTab === 'chats' ? (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {renderActiveNow()}
          {displayedChats.length > 0 ? (
            displayedChats.map((chat) => renderChatItem(chat))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>Start chatting with your neighbors</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {renderRequestsTab()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Inter' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.glassBg, borderWidth: 1,
    borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center',
  },
  tabContainer: { paddingHorizontal: 20, marginBottom: 8 },
  tabRow: {
    flexDirection: 'row', backgroundColor: Colors.glassBg, borderRadius: 14, padding: 4, position: 'relative',
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted, fontFamily: 'Inter' },
  tabTextActive: { color: Colors.textPrimary },
  requestBadge: {
    backgroundColor: Colors.accent, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center',
    justifyContent: 'center', marginLeft: 6, paddingHorizontal: 4,
  },
  requestBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.background },
  tabIndicator: {
    position: 'absolute', bottom: 4, left: 4, width: '50%', height: '80%', borderRadius: 12,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  searchContainer: { paddingHorizontal: 20, marginBottom: 4, flexDirection: 'row', gap: 10 },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.glassBg,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.glassBorder, paddingHorizontal: 12, height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary, fontFamily: 'Inter' },
  filterBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.glassBg, borderWidth: 1,
    borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center',
  },
  filterBtnActive: { borderColor: Colors.accent },
  activeNowSection: { paddingVertical: 12 },
  activeNowHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 12, gap: 6 },
  activeNowTitle: { fontSize: 14, fontWeight: '600', color: Colors.accent, fontFamily: 'Inter' },
  activeNowScroll: { paddingHorizontal: 4, gap: 16 },
  activeUserItem: { alignItems: 'center', width: 60 },
  activeAvatarWrap: { position: 'relative', marginBottom: 4 },
  activeAvatarCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.glassBg, borderWidth: 2,
    borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center',
  },
  activeAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Inter' },
  activeOnlineDot: {
    position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.background,
  },
  activeUserName: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', fontFamily: 'Inter' },
  listContainer: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  chatItem: { marginBottom: 10 },
  chatCard: { borderRadius: 16, padding: 0 },
  chatRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  chatAvatarSection: { position: 'relative', marginRight: 12 },
  pinBadge: {
    position: 'absolute', top: -4, left: -4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  chatContent: { flex: 1 },
  chatNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  nameVerifiedRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  chatName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, fontFamily: 'Inter', flexShrink: 1 },
  verifiedIcon: { marginLeft: 4 },
  mutedIcon: { marginLeft: 4 },
  chatTime: { fontSize: 12, color: Colors.textMuted, fontFamily: 'Inter', marginLeft: 8 },
  chatMessageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  messagePreviewWrap: { flex: 1, marginRight: 8 },
  chatMessage: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Inter' },
  typingText: { fontSize: 14, color: Colors.accent, fontFamily: 'Inter', fontStyle: 'italic' },
  unreadBadge: {
    backgroundColor: Colors.accent, borderRadius: 12, minWidth: 24, height: 24,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  unreadBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.background, fontFamily: 'Inter' },
  swipeActionsRight: {
    width: 90, marginBottom: 10, marginLeft: -10, borderTopRightRadius: 16, borderBottomRightRadius: 16,
    overflow: 'hidden', justifyContent: 'center',
  },
  swipeActionsLeft: {
    width: 180, marginBottom: 10, marginRight: -10, borderTopLeftRadius: 16, borderBottomLeftRadius: 16,
    overflow: 'hidden', justifyContent: 'center', flexDirection: 'row',
  },
  swipeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  swipePinBtn: { backgroundColor: Colors.warning },
  swipeMuteBtn: { backgroundColor: Colors.primary },
  swipeDeleteBtn: { backgroundColor: Colors.error },
  swipeBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, fontFamily: 'Inter', marginTop: 4 },
  requestsContainer: { gap: 10 },
  requestCard: { borderRadius: 16, padding: 0 },
  requestRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  requestContent: { flex: 1, marginLeft: 12 },
  requestName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, fontFamily: 'Inter' },
  requestMeta: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'Inter', marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.glassBg, borderWidth: 1,
    borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center',
  },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, fontFamily: 'Inter' },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Inter', textAlign: 'center' },
});

export default ChatListScreen;
