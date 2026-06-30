import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../utils/colors';
import GlassCard from '../../components/glass/GlassCard';
import GlowInput from '../../components/glass/GlowInput';
import AvatarBadge from '../../components/shared/AvatarBadge';
import { useAuth } from '../../context/AuthContext';
import { getChats, getChatRequests, acceptChatRequest, declineChatRequest } from '../../services/dataService';
import type { Chat, ChatRequest } from '../../services/dataService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  isTyping?: boolean;
}

const ACTIVE_USERS = [
  { id: '1', name: 'Ayesha', avatar: '' },
  { id: '3', name: 'Zara', avatar: '' },
  { id: '5', name: 'Fatima', avatar: '' },
  { id: '7', name: 'Bilal', avatar: '' },
  { id: '8', name: 'Sana', avatar: '' },
];

const ChatListScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [loadedChats, loadedReqs] = await Promise.all([getChats(), getChatRequests()]);
    loadedChats.sort((a, b) => (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0));
    setChats(loadedChats);
    setRequests(loadedReqs.filter(r => r.status === 'pending'));
  };

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

  const mapChatToChatUser = (chat: Chat): ChatUser => {
    const otherUserId = chat.participants.find(id => id !== user?.uid) || chat.participants[0];
    const timeSince = chat.lastTimestamp ? Date.now() - chat.lastTimestamp : 0;
    let lastMessageTime = '';
    if (timeSince < 60000) lastMessageTime = 'Just now';
    else if (timeSince < 3600000) lastMessageTime = `${Math.floor(timeSince / 60000)}m ago`;
    else if (timeSince < 86400000) lastMessageTime = `${Math.floor(timeSince / 3600000)}h ago`;
    else if (timeSince < 172800000) lastMessageTime = 'Yesterday';
    else lastMessageTime = `${Math.floor(timeSince / 86400000)}d ago`;
    return {
      id: chat.id,
      name: chat.participantNames[otherUserId] || 'Unknown',
      avatar: chat.participantAvatars[otherUserId],
      role: 'resident',
      verified: false,
      online: chat.online[otherUserId] || false,
      lastMessage: chat.lastMessage || '',
      lastMessageTime,
      unreadCount: chat.unreadCount,
      isPinned: chat.pinned,
      isTyping: false,
    };
  };

  const chatUsers = chats.map(mapChatToChatUser);
  const pinnedChats = chatUsers.filter((c) => c.isPinned);
  const regularChats = chatUsers.filter((c) => !c.isPinned);
  const displayedChats = [...pinnedChats, ...regularChats].filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indicatorTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH / 2 - 40],
  });

  const handleChatLongPress = useCallback((chat: ChatUser) => {
    Alert.alert(chat.name, '', [
      { text: 'Mark as Read', onPress: () => Alert.alert('Mark Read', 'Marked as read.') },
      { text: 'Mute Notifications', onPress: () => Alert.alert('Muted', 'Notifications muted.') },
      { text: 'Delete Chat', onPress: () => {}, style: 'destructive' },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  const handleAcceptRequest = async (req: ChatRequest) => {
    if (!user) return;
    await acceptChatRequest(req, user.uid, user.name || 'User');
    setRequests(prev => prev.filter(r => r.id !== req.id));
    const loadedChats = await getChats();
    loadedChats.sort((a, b) => (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0));
    setChats(loadedChats);
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!user) return;
    await declineChatRequest(requestId);
    setRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const renderTabBar = () => (
    <View style={styles.tabContainer}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabChange('chats')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'chats' && styles.tabTextActive,
            ]}
          >
            Chats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabChange('requests')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'requests' && styles.tabTextActive,
            ]}
          >
            Requests
          </Text>
          <View style={styles.requestBadge}>
            <Text style={styles.requestBadgeText}>{requests.length}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <Animated.View
        style={[
          styles.tabIndicator,
          { transform: [{ translateX: indicatorTranslateX }] },
        ]}
      />
    </View>
  );

  const renderActiveNow = () => (
    <View style={styles.activeNowSection}>
      <View style={styles.activeNowHeader}>
        <Ionicons name="flash" size={16} color={Colors.accent} />
        <Text style={styles.activeNowTitle}>Active Now</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.activeNowScroll}
      >
        {ACTIVE_USERS.map((u) => (
          <TouchableOpacity key={u.id} style={styles.activeUserItem} activeOpacity={0.7}>
            <View style={styles.activeAvatarWrap}>
              <View style={styles.activeAvatarCircle}>
                <Text style={styles.activeAvatarText}>
                  {u.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </Text>
              </View>
              <View style={styles.activeOnlineDot} />
            </View>
            <Text style={styles.activeUserName} numberOfLines={1}>
              {u.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderChatItem = (chat: ChatUser, index: number) => (
    <TouchableOpacity
      key={chat.id}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('Conversation', { chatId: chat.id, name: chat.name })}
      onLongPress={() => handleChatLongPress(chat)}
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
                <Text style={styles.chatName} numberOfLines={1}>
                  {chat.name}
                </Text>
                {chat.verified && chat.role !== 'resident' && (
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={Colors.accent}
                    style={styles.verifiedIcon}
                  />
                )}
              </View>
              <Text style={styles.chatTime}>{chat.lastMessageTime}</Text>
            </View>
            <View style={styles.chatMessageRow}>
              <View style={styles.messagePreviewWrap}>
                {chat.isTyping ? (
                  <Text style={styles.typingText}>Typing...</Text>
                ) : (
                  <Text style={styles.chatMessage} numberOfLines={1}>
                    {chat.lastMessage}
                  </Text>
                )}
              </View>
              {chat.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  const renderRequestsTab = () => (
    <View style={styles.requestsContainer}>
      {requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No requests yet</Text>
          <Text style={styles.emptySubtitle}>Pending chat requests will appear here</Text>
        </View>
      ) : (
        requests.map(req => (
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
        <TouchableOpacity style={styles.headerBtn} onPress={() => Alert.alert('Options', 'Message settings coming soon.')}>
          <Ionicons name="ellipsis-vertical" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {renderTabBar()}

      <View style={styles.searchContainer}>
        <GlowInput
          icon="search"
          placeholder="Search conversations..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchInput}
        />
      </View>

      {activeTab === 'chats' ? (
        <ScrollView
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {renderActiveNow()}

          {displayedChats.length > 0 ? (
            displayedChats.map((chat, index) => renderChatItem(chat, index))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                Start chatting with your neighbors
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {renderRequestsTab()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    padding: 4,
    position: 'relative',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  tabTextActive: {
    color: Colors.textPrimary,
  },
  requestBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  requestBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.background,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: '50%',
    height: '80%',
    borderRadius: 12,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  searchInput: {
    marginBottom: 0,
  },

  // Active Now
  activeNowSection: {
    paddingVertical: 12,
  },
  activeNowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
    gap: 6,
  },
  activeNowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Inter',
  },
  activeNowScroll: {
    paddingHorizontal: 4,
    gap: 16,
  },
  activeUserItem: {
    alignItems: 'center',
    width: 60,
  },
  activeAvatarWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  activeAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.glassBg,
    borderWidth: 2,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  activeOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  activeUserName: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter',
  },

  // List
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  // Chat Item
  chatItem: {
    marginBottom: 10,
  },
  chatCard: {
    borderRadius: 16,
    padding: 0,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  chatAvatarSection: {
    position: 'relative',
    marginRight: 12,
  },
  pinBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatContent: {
    flex: 1,
  },
  chatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    flexShrink: 1,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  chatTime: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginLeft: 8,
  },
  chatMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messagePreviewWrap: {
    flex: 1,
    marginRight: 8,
  },
  chatMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  typingText: {
    fontSize: 14,
    color: Colors.accent,
    fontFamily: 'Inter',
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.background,
    fontFamily: 'Inter',
  },

  // Requests
  requestsContainer: {
    gap: 10,
  },
  requestCard: {
    borderRadius: 16,
    padding: 0,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  requestContent: {
    flex: 1,
    marginLeft: 12,
  },
  requestName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  requestMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    marginTop: 6,
  },
});

export default ChatListScreen;

