import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  Easing,
  Dimensions,
  Alert,
  ActivityIndicator,
  Image,
  ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Audio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import Colors from '../../utils/colors';
import AvatarBadge from '../../components/shared/AvatarBadge';
import EmojiPicker from '../../components/shared/EmojiPicker';
import AudioPlayer from '../../components/shared/AudioPlayer';
import LocationCard from '../../components/shared/LocationCard';
import PostPreviewCard from '../../components/shared/PostPreviewCard';
import MessageActionsSheet from '../../components/shared/MessageActionsSheet';
import { useAuth } from '../../context/AuthContext';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useChat } from '../../hooks/useChat';
import {
  getUserById,
  markMessagesAsRead,
  updateMessage,
  toggleBookmarkMessage,
  getBookmarkedMessageIds,
  sendMessage as dsSendMessage,
  createChat,
  listenCallHistory,
  createCallLog,
} from '../../services/dataService';
import type { ChatMessage, Chat, CallLog } from '../../services/dataService';
import type { UserData } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ConversationScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const chatId = route?.params?.chatId || '';
  const chatName = route?.params?.name || 'Conversation';
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [otherUserData, setOtherUserData] = useState<UserData | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Long press action sheet
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // Forward state
  const [forwardVisible, setForwardVisible] = useState(false);
  const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null);
  const [selectedForwardChats, setSelectedForwardChats] = useState<Set<string>>(new Set());
  const [forwardChatList, setForwardChatList] = useState<Chat[]>([]);
  const [forwardSending, setForwardSending] = useState(false);

  // Call history
  const [callHistory, setCallHistory] = useState<CallLog[]>([]);

  const flatListRef = useRef<FlatList>(null);
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  const { messages, loading, sendMessage, startTyping, stopTyping, otherUserTyping, disappearingMode, setDisappearingMode } = useChat(chatId);

  // Recent call history for display
  const recentCalls = useMemo(() => callHistory.slice(0, 5), [callHistory]);

  // Load bookmarked message IDs
  useEffect(() => {
    getBookmarkedMessageIds().then((ids) => {
      setBookmarkedIds(new Set(ids));
    }).catch(() => {});
  }, []);

  // Load call history
  useEffect(() => {
    if (!chatId) return;
    return listenCallHistory(chatId, setCallHistory);
  }, [chatId]);

  // Load chat to get other participant's user ID
  useEffect(() => {
    if (!chatId || !currentUser) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'chats', chatId));
        if (snap.exists()) {
          const chatData = snap.data() as Chat;
          const otherId = chatData.participants.find((p) => p !== currentUser.uid);
          if (otherId) {
            setOtherUserId(otherId);
            const u = await getUserById(otherId);
            if (u) setOtherUserData(u);
          }
        }
      } catch {}
    })();
  }, [chatId, currentUser]);

  // Sync otherUserTyping from hook
  useEffect(() => {
    setIsOtherTyping(otherUserTyping);
  }, [otherUserTyping]);

  // Mark messages as read on focus
  useFocusEffect(
    useCallback(() => {
      if (chatId && currentUser) {
        markMessagesAsRead(chatId, currentUser.uid).catch(() => {});
      }
    }, [chatId, currentUser])
  );

  // Typing animation
  useEffect(() => {
    if (isOtherTyping) {
      const bounce = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: -6,
              duration: 300,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 300,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.delay(400),
          ])
        );
      };
      const anim1 = bounce(dot1Anim, 0);
      const anim2 = bounce(dot2Anim, 150);
      const anim3 = bounce(dot3Anim, 300);
      anim1.start();
      anim2.start();
      anim3.start();
      return () => {
        anim1.stop();
        anim2.stop();
        anim3.stop();
      };
    } else {
      dot1Anim.setValue(0);
      dot2Anim.setValue(0);
      dot3Anim.setValue(0);
    }
  }, [isOtherTyping]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;
    stopTyping();
    const text = replyingTo
      ? `↪ ${replyingTo.content.slice(0, 80)}${replyingTo.content.length > 80 ? '…' : ''}\n${inputText.trim()}`
      : inputText.trim();
    await sendMessage(text);
    setInputText('');
    setReplyingTo(null);
  }, [inputText, sendMessage, stopTyping, replyingTo]);

  // --- Image picker ---
  const handleImagePicker = useCallback(async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', `Allow access to ${useCamera ? 'camera' : 'gallery'} to send images.`);
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    // Compress
    const compressed = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    await sendMessage('📷 Photo', {
      type: 'image',
      mediaUrl: compressed.uri,
      mediaWidth: compressed.width,
      mediaHeight: compressed.height,
    });
  }, [sendMessage]);

  // --- Voice recording ---
  const handleStartRecording = useCallback(async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Microphone access required.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch {}
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      const duration = (await recordingRef.current.getStatusAsync()).durationMillis || 0;
      recordingRef.current = null;
      if (uri) {
        await sendMessage('🎤 Voice message', {
          type: 'voice',
          mediaUrl: uri,
          voiceDuration: duration,
        });
      }
    } catch {}
  }, [sendMessage]);

  // --- Location sharing ---
  const handleShareLocation = useCallback(async () => {
    try {
      const loc = await import('expo-location');
      const { status } = await loc.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Location access required.'); return; }
      const position = await loc.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;
      // Reverse geocode
      let locationName = 'Shared Location';
      try {
        const geocode = await loc.reverseGeocodeAsync({ latitude, longitude });
        if (geocode.length > 0) {
          const geo = geocode[0];
          locationName = [geo.name, geo.street, geo.city, geo.region]
            .filter(Boolean).join(', ');
        }
      } catch {}
      await sendMessage(locationName || '📍 Shared Location', {
        type: 'location',
        locationLat: latitude,
        locationLng: longitude,
        locationName,
      });
    } catch {}
  }, [sendMessage]);

  // --- Attach action sheet ---
  // --- Video picker ---
  const handleVideoPicker = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission needed', 'Allow access to gallery to send videos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await sendMessage('🎬 Video', {
      type: 'video',
      mediaUrl: asset.uri,
      mediaWidth: asset.width,
      mediaHeight: asset.height,
    });
  }, [sendMessage]);

  // --- Forward (multi-select modal) ---
  const handleForward = useCallback(async (msg: ChatMessage) => {
    try {
      const { getChats } = await import('../../services/dataService');
      const allChats = await getChats();
      const chatList = allChats.filter((c: Chat) => c.id !== chatId);
      if (chatList.length === 0) {
        Alert.alert('No other chats', 'Start a new conversation first.');
        return;
      }
      setForwardChatList(chatList);
      setForwardMsg(msg);
      setSelectedForwardChats(new Set());
      setForwardVisible(true);
    } catch {}
    setSelectedMessage(null);
  }, [chatId]);

  const toggleForwardChat = useCallback((chatId: string) => {
    setSelectedForwardChats((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  }, []);

  const executeForward = useCallback(async () => {
    if (!forwardMsg || selectedForwardChats.size === 0) return;
    setForwardSending(true);
    const targets = forwardChatList.filter((c) => selectedForwardChats.has(c.id));
    let sent = 0;
    await Promise.all(
      targets.map(async (targetChat) => {
        try {
          const fwdMsg: ChatMessage = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
            chatId: targetChat.id,
            senderId: currentUser?.uid || '',
            type: forwardMsg.type,
            content: forwardMsg.content,
            status: 'sending' as const,
            createdAt: Date.now(),
            forwardedFrom: forwardMsg.senderId,
            ...(forwardMsg.mediaUrl ? { mediaUrl: forwardMsg.mediaUrl } : {}),
            ...(forwardMsg.mediaWidth ? { mediaWidth: forwardMsg.mediaWidth } : {}),
            ...(forwardMsg.mediaHeight ? { mediaHeight: forwardMsg.mediaHeight } : {}),
          };
          await dsSendMessage(fwdMsg);
          sent++;
        } catch {}
      })
    );
    setForwardSending(false);
    setForwardVisible(false);
    setForwardMsg(null);
    Alert.alert('Forwarded', `Message forwarded to ${sent} chat${sent !== 1 ? 's' : ''}`);
  }, [forwardMsg, selectedForwardChats, forwardChatList, currentUser?.uid]);

  const handleAttachPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Camera', 'Gallery', 'Video', 'Share Location'],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) handleImagePicker(true);
          else if (idx === 2) handleImagePicker(false);
          else if (idx === 3) handleVideoPicker();
          else if (idx === 4) handleShareLocation();
        }
      );
    } else {
      Alert.alert('Attach', 'Choose an option', [
        { text: 'Camera', onPress: () => handleImagePicker(true) },
        { text: 'Gallery', onPress: () => handleImagePicker(false) },
        { text: 'Video', onPress: handleVideoPicker },
        { text: 'Share Location', onPress: handleShareLocation },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [handleImagePicker, handleShareLocation, handleVideoPicker]);

  // --- Message actions ---
  const handleMessageLongPress = useCallback((msg: ChatMessage) => {
    setSelectedMessage(msg);
  }, []);

  const handleReply = useCallback((msg: ChatMessage) => {
    setReplyingTo(msg);
    setSelectedMessage(null);
  }, []);

  const handleCopyText = useCallback(async (msg: ChatMessage) => {
    await Clipboard.setStringAsync(msg.content);
    Alert.alert('Copied', 'Message text copied to clipboard.');
    setSelectedMessage(null);
  }, []);

  const handleDeleteMessage = useCallback(async (msg: ChatMessage, forEveryone: boolean) => {
    if (forEveryone) {
      await updateMessage(msg.chatId, msg.id, { deletedAt: Date.now() });
    } else {
      const deletedFor = [...(msg.deletedFor || []), currentUser?.uid].filter(Boolean) as string[];
      await updateMessage(msg.chatId, msg.id, { deletedFor });
    }
    setSelectedMessage(null);
  }, [currentUser?.uid]);

  const handleBookmark = useCallback(async (msg: ChatMessage) => {
    const isBookmarked = await toggleBookmarkMessage(msg.id, msg.chatId);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isBookmarked) next.add(msg.id);
      else next.delete(msg.id);
      return next;
    });
    setSelectedMessage(null);
  }, []);

  const handleReact = useCallback(async (msg: ChatMessage, emoji: string) => {
    const currentReactions = msg.reactions || {};
    const myUid = currentUser?.uid || '';
    if (currentReactions[myUid] === emoji) {
      // Toggle off
      const { [myUid]: _, ...rest } = currentReactions;
      await updateMessage(msg.chatId, msg.id, { reactions: rest });
    } else {
      await updateMessage(msg.chatId, msg.id, {
        reactions: { ...currentReactions, [myUid]: emoji },
      });
    }
    setShowEmojiPicker(false);
    setSelectedMessage(null);
  }, [currentUser?.uid]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateSeparator = (ts: number) => {
    const today = new Date();
    const msgDate = new Date(ts);
    if (msgDate.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (msgDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return msgDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderCallHistory = () => {
    if (recentCalls.length === 0) return null;
    return (
      <View style={styles.callHistorySection}>
        {recentCalls.map((call) => {
          const isOutgoing = call.callerId === currentUser?.uid;
          const icon = call.status === 'missed' ? 'call-outline' : 'call';
          const color = call.status === 'missed' ? Colors.error : Colors.accent;
          const label = call.status === 'missed'
            ? `Missed ${isOutgoing ? 'call' : 'call'}`
            : `${isOutgoing ? 'Outgoing' : 'Incoming'} ${call.type} call`;
          const duration = call.duration > 0 ? ` (${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, '0')})` : '';
          return (
            <View key={call.id} style={styles.callHistoryRow}>
              <Ionicons name={icon} size={16} color={color} />
              <Text style={[styles.callHistoryText, { color }]}>{label}{duration}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isOtherTyping) return null;
    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1Anim }] }]} />
          <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2Anim }] }]} />
          <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3Anim }] }]} />
        </View>
      </View>
    );
  };

  const renderReactions = (reactions: Record<string, string> | undefined) => {
    if (!reactions || Object.keys(reactions).length === 0) return null;
    const counts = new Map<string, number>();
    Object.values(reactions).forEach((emoji) => {
      counts.set(emoji, (counts.get(emoji) || 0) + 1);
    });
    return (
      <View style={styles.reactionsRow}>
        {Array.from(counts.entries()).map(([emoji, count]) => (
          <View key={emoji} style={styles.reactionChip}>
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
          </View>
        ))}
      </View>
    );
  };

  const renderMessageContent = (item: ChatMessage) => {
    switch (item.type) {
      case 'image':
        return (
          <View>
            <Image
              source={{ uri: item.mediaUrl }}
              style={[
                styles.messageImage,
                item.mediaWidth && item.mediaHeight
                  ? { aspectRatio: item.mediaWidth / item.mediaHeight }
                  : { width: 200, height: 200 },
              ]}
              resizeMode="cover"
            />
            {item.content && item.content !== '[Image]' && (
              <Text style={styles.messageText}>{item.content}</Text>
            )}
          </View>
        );
      case 'voice':
        return (
          <AudioPlayer
            uri={item.mediaUrl || ''}
            duration={item.voiceDuration || 0}
            waveform={item.voiceWaveform}
          />
        );
      case 'location':
        return (
          item.locationLat != null && item.locationLng != null ? (
            <LocationCard
              latitude={item.locationLat}
              longitude={item.locationLng}
              locationName={item.locationName}
            />
          ) : (
            <Text style={styles.messageText}>{item.content}</Text>
          )
        );
      case 'video':
        return (
          <View>
            <Image
              source={{ uri: item.mediaUrl }}
              style={[
                styles.messageImage,
                { backgroundColor: Colors.glassBg },
                item.mediaWidth && item.mediaHeight
                  ? { aspectRatio: item.mediaWidth / item.mediaHeight, width: 220 }
                  : { width: 200, height: 160 },
              ]}
              resizeMode="cover"
            />
            <View style={styles.videoOverlay}>
              <Ionicons name="play" size={28} color={Colors.textPrimary} />
            </View>
            {item.content && item.content !== '[Video]' && item.content !== '🎬 Video' && (
              <Text style={styles.messageText}>{item.content}</Text>
            )}
          </View>
        );
      case 'post':
        return (
          <PostPreviewCard
            content={item.sharedPostPreview || item.content}
            onPress={() => {
              if (item.sharedPostId) {
                navigation.navigate('PostDetail', { postId: item.sharedPostId });
              }
            }}
          />
        );
      default:
        return <Text style={styles.messageText}>{item.content}</Text>;
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = item.senderId === currentUser?.uid;
    const isDeleted = item.deletedAt && item.deletedAt > 0;
    const isDeletedForMe = item.deletedFor?.includes(currentUser?.uid || '');
    const isVisible = !isDeleted && !isDeletedForMe;
    const msgReactions = item.reactions;

    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onLongPress={() => !isDeleted && !isDeletedForMe && handleMessageLongPress(item)}
        delayLongPress={300}
      >
        <View style={[styles.messageWrapper, isMine ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
          {(isDeleted || isDeletedForMe) ? (
            <View style={[styles.messageBubble, styles.deletedMessage]}>
              <Text style={styles.deletedMsgText}>Message deleted</Text>
            </View>
          ) : (
            <>
              {isMine ? (
                <LinearGradient
                  colors={[Colors.primary, Colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.messageBubble, styles.myMessage]}
                >
                  {renderMessageContent(item)}
                  <View style={styles.messageMeta}>
                    <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text>
                    {item.status === 'sending' && (
                      <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                    )}
                    {item.status === 'sent' && (
                      <Ionicons name="checkmark" size={14} color={Colors.textSecondary} />
                    )}
                    {item.status === 'delivered' && (
                      <Ionicons name="checkmark-done" size={14} color={Colors.textSecondary} />
                    )}
                    {item.status === 'read' && (
                      <Ionicons name="checkmark-done" size={14} color={Colors.neon} />
                    )}
                  </View>
                  {renderReactions(msgReactions)}
                </LinearGradient>
              ) : (
                <View style={[styles.messageBubble, styles.otherMessage]}>
                  {renderMessageContent(item)}
                  <Text style={styles.otherMessageTime}>{formatTime(item.createdAt)}</Text>
                  {renderReactions(msgReactions)}
                </View>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const showOnlineStatus = otherUserData?.showOnlineStatus ?? true;
  const isOnline = showOnlineStatus && (otherUserData?.onlineStatus ?? false);

  const selectedMsg = selectedMessage;
  const isSelectedMine = selectedMsg?.senderId === currentUser?.uid;
  const canDeleteEveryone = selectedMsg ? (Date.now() - (selectedMsg.createdAt || 0)) < 60000 : false;
  const isSelectedBookmarked = selectedMsg ? bookmarkedIds.has(selectedMsg.id) : false;

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Pattern */}
      <View style={styles.bgPattern}>
        {Array.from({ length: 30 }).map((_, i) => (
          <View
            key={i}
            style={[styles.bgDot, {
              left: Math.random() * SCREEN_WIDTH,
              top: Math.random() * 800 + 100,
              opacity: 0.15 + Math.random() * 0.15,
            }]}
          />
        ))}
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerUser}
          activeOpacity={0.7}
          onPress={() => {
            if (otherUserId) {
              navigation.navigate('AuthorProfile', { userId: otherUserId });
            }
          }}
        >
          <AvatarBadge name={chatName} avatar={otherUserData?.avatar} size={40} role="resident" verified={otherUserData?.verified ?? false} />
          <View style={styles.headerUserInfo}>
            <Text style={styles.headerName}>{chatName}</Text>
            <Text style={[styles.headerStatus, isOnline ? styles.online : styles.offline]}>
              {isOnline ? 'Online' : otherUserData?.lastSeen
                ? `Last seen ${new Date(otherUserData.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('CallScreen', { mode: 'voice', chatId, otherUserId, otherName: chatName, otherAvatar: otherUserData?.avatar })} style={styles.headerBtn}>
            <Ionicons name="call" size={20} color={Colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('CallScreen', { mode: 'video', chatId, otherUserId, otherName: chatName, otherAvatar: otherUserData?.avatar })} style={styles.headerBtn}>
            <Ionicons name="videocam" size={20} color={Colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            const modeLabel = (m: string) => m === '24h' ? '24 Hours' : m === '7d' ? '7 Days' : 'Off';
            Alert.alert('Conversation Settings', `Disappearing messages: ${modeLabel(disappearingMode)}`, [
              { text: 'Disappear Off', onPress: () => setDisappearingMode('off') },
              { text: 'Disappear in 24h', onPress: () => setDisappearingMode('24h') },
              { text: 'Disappear in 7d', onPress: () => setDisappearingMode('7d') },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }} style={styles.headerBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
      {disappearingMode !== 'off' && (
        <View style={styles.disappearingBanner}>
          <Ionicons name="timer-outline" size={14} color={Colors.accent} />
          <Text style={styles.disappearingBannerText}>
            Messages disappear after {disappearingMode === '24h' ? '24 hours' : '7 days'}
          </Text>
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          ListHeaderComponent={<View>{renderCallHistory()}{renderTypingIndicator()}</View>}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Reply Banner */}
        {replyingTo && (
          <View style={styles.replyBanner}>
            <View style={styles.replyBannerContent}>
              <View style={styles.replyIndicator} />
              <View style={styles.replyInfo}>
                <Text style={styles.replyLabel}>
                  Replying to {replyingTo.senderId === currentUser?.uid ? 'yourself' : chatName}
                </Text>
                <Text style={styles.replyPreview} numberOfLines={1}>
                  {replyingTo.content}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyCloseBtn}>
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.inputIcon} onPress={() => Alert.alert('Emoji', 'Emoji picker coming soon.')}>
              <Ionicons name="happy-outline" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={(val) => {
                  setInputText(val);
                  startTyping();
                }}
                onFocus={startTyping}
                onBlur={stopTyping}
                placeholder="Message..."
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={500}
              />
            </View>
            {!isRecording && (
              <TouchableOpacity style={styles.inputIcon} onPress={handleAttachPress}>
                <Ionicons name="attach-outline" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
            {inputText.trim() ? (
              <TouchableOpacity style={styles.sendButton} onPress={handleSend} activeOpacity={0.8}>
                <LinearGradient
                  colors={[Colors.primary, Colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendGradient}
                >
                  <Ionicons name="send" size={18} color={Colors.textPrimary} style={{ transform: [{ translateX: 1 }] }} />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.micButtonRecording]}
                activeOpacity={0.8}
                onPress={isRecording ? handleStopRecording : handleStartRecording}
                onLongPress={!isRecording ? handleStartRecording : undefined}
              >
                <LinearGradient
                  colors={isRecording ? [Colors.error, Colors.error] : [Colors.primary, Colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.micGradient}
                >
                  <Ionicons
                    name={isRecording ? 'stop' : 'mic'}
                    size={18}
                    color={Colors.textPrimary}
                  />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Message Actions Sheet */}
      <MessageActionsSheet
        visible={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        isMine={isSelectedMine}
        canDeleteEveryone={canDeleteEveryone}
        isBookmarked={isSelectedBookmarked}
        onReply={() => selectedMsg && handleReply(selectedMsg)}
        onCopy={() => selectedMsg && handleCopyText(selectedMsg)}
        onDelete={(forEveryone) => selectedMsg && handleDeleteMessage(selectedMsg, forEveryone)}
        onBookmark={() => selectedMsg && handleBookmark(selectedMsg)}
        onReact={() => setShowEmojiPicker(true)}
        onForward={() => selectedMsg && handleForward(selectedMsg)}
      />

      {/* Emoji Picker Modal */}
      {showEmojiPicker && selectedMsg && (
        <View style={styles.emojiPickerOverlay}>
          <TouchableOpacity style={styles.emojiPickerBackdrop} onPress={() => setShowEmojiPicker(false)} />
          <EmojiPicker
            onSelect={(emoji) => handleReact(selectedMsg, emoji)}
            currentReaction={selectedMsg.reactions?.[currentUser?.uid || '']}
          />
        </View>
      )}

      {/* Forward Modal — multi-select picker */}
      {forwardVisible && (
        <View style={styles.forwardOverlay}>
          <View style={styles.forwardModal}>
            <View style={styles.forwardHeader}>
              <Text style={styles.forwardTitle}>Forward to</Text>
              <TouchableOpacity onPress={() => { setForwardVisible(false); setForwardMsg(null); }} style={styles.forwardClose}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {forwardSending ? (
              <View style={styles.forwardSendingContainer}>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={styles.forwardSendingText}>Forwarding...</Text>
              </View>
            ) : forwardChatList.length === 0 ? (
              <View style={styles.forwardEmpty}>
                <Text style={styles.forwardEmptyText}>No other chats available</Text>
              </View>
            ) : (
              <FlatList
                data={forwardChatList}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.forwardList}
                renderItem={({ item }) => {
                  const isSelected = selectedForwardChats.has(item.id);
                  const otherId = item.participants.find((p: string) => p !== currentUser?.uid);
                  const name = item.participantNames[otherId || ''] || item.groupName || 'Unknown';
                  return (
                    <TouchableOpacity
                      style={[styles.forwardRow, isSelected && styles.forwardRowSelected]}
                      onPress={() => toggleForwardChat(item.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={item.type === 'group' ? 'people' : 'person-circle-outline'}
                        size={36}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.forwardChatName} numberOfLines={1}>{name}</Text>
                      <View style={[styles.forwardCheckbox, isSelected && styles.forwardCheckboxChecked]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color={Colors.background} />}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
            {!forwardSending && forwardChatList.length > 0 && (
              <TouchableOpacity
                style={[styles.forwardSendBtn, selectedForwardChats.size === 0 && styles.forwardSendBtnDisabled]}
                onPress={executeForward}
                disabled={selectedForwardChats.size === 0}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.forwardSendGradient}
                >
                  <Text style={styles.forwardSendText}>
                    Forward ({selectedForwardChats.size})
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  bgPattern: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  bgDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.accent },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.glassBorder, backgroundColor: Colors.glassBg,
  },
  disappearingBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 6, backgroundColor: Colors.primary + '30', borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  disappearingBannerText: { fontSize: 11, fontWeight: '500', color: Colors.accent, fontFamily: 'Inter' },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  headerUserInfo: { marginLeft: 10 },
  headerName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Inter' },
  headerStatus: { fontSize: 12, fontFamily: 'Inter' },
  online: { color: Colors.success },
  offline: { color: Colors.textMuted },
  headerActions: { flexDirection: 'row', gap: 4 },
  messageList: { flex: 1 },
  messageListContent: { paddingHorizontal: 16, paddingVertical: 12 },
  messageWrapper: { marginBottom: 10, maxWidth: '80%' },
  myMessageWrapper: { alignSelf: 'flex-end' },
  otherMessageWrapper: { alignSelf: 'flex-start' },
  messageBubble: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  myMessage: {
    borderBottomRightRadius: 4, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  otherMessage: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder, borderBottomLeftRadius: 4,
  },
  deletedMessage: {
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder, opacity: 0.6,
  },
  deletedMsgText: { fontSize: 13, color: Colors.textMuted, fontFamily: 'Inter', fontStyle: 'italic' },
  messageText: { fontSize: 15, color: Colors.textPrimary, fontFamily: 'Inter', lineHeight: 20 },
  otherMessageText: { fontSize: 15, color: Colors.textPrimary, fontFamily: 'Inter', lineHeight: 20 },
  messageMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 4 },
  messageTime: { fontSize: 11, color: Colors.textSecondary, fontFamily: 'Inter' },
  otherMessageTime: { fontSize: 11, color: Colors.textMuted, fontFamily: 'Inter', marginTop: 4, alignSelf: 'flex-end' },
  // Image / Video
  messageImage: { borderRadius: 12, marginBottom: 4, overflow: 'hidden' },
  videoOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12,
  },
  // Reactions
  reactionsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6,
  },
  reactionChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.glassBg,
    borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, gap: 2,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, fontFamily: 'Inter' },
  // Reply banner
  replyBanner: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.secondaryBg, borderTopWidth: 1, borderTopColor: Colors.glassBorder,
  },
  replyBannerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyIndicator: { width: 3, height: 28, borderRadius: 1.5, backgroundColor: Colors.accent },
  replyInfo: { flex: 1 },
  replyLabel: { fontSize: 11, fontWeight: '600', color: Colors.accent, fontFamily: 'Inter' },
  replyPreview: { fontSize: 12, color: Colors.textMuted, fontFamily: 'Inter', marginTop: 1 },
  replyCloseBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  // Call history
  callHistorySection: { alignItems: 'center', paddingVertical: 8, gap: 4 },
  callHistoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  callHistoryText: { fontSize: 12, fontWeight: '500', fontFamily: 'Inter' },
  // Typing
  typingContainer: { alignSelf: 'flex-start', marginBottom: 10 },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.glassBg, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.glassBorder, paddingHorizontal: 14, paddingVertical: 10, gap: 5,
  },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  // Input
  inputBar: {
    paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.glassBorder,
    backgroundColor: Colors.secondaryBg,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputIcon: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  inputContainer: {
    flex: 1, backgroundColor: Colors.glassBg, borderRadius: 20, borderWidth: 1, borderColor: Colors.glassBorder,
    paddingHorizontal: 16, maxHeight: 100,
  },
  input: { fontSize: 15, color: Colors.textPrimary, fontFamily: 'Inter', paddingVertical: 10, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  sendGradient: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  micButton: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  micButtonRecording: { opacity: 0.7 },
  micGradient: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  // Emoji picker
  emojiPickerOverlay: {
    position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center',
  },
  emojiPickerBackdrop: {
    position: 'absolute', top: -1000, left: -100, right: -100, bottom: -100,
  },
  // Forward multi-select modal
  forwardOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  forwardModal: {
    backgroundColor: Colors.secondaryBg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '70%', paddingBottom: 30, borderWidth: 1, borderColor: Colors.glassBorder,
    borderBottomWidth: 0,
  },
  forwardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder,
  },
  forwardTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Inter' },
  forwardClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  forwardSendingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 },
  forwardSendingText: { fontSize: 14, color: Colors.textMuted, fontFamily: 'Inter' },
  forwardEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  forwardEmptyText: { fontSize: 14, color: Colors.textMuted, fontFamily: 'Inter' },
  forwardList: { paddingHorizontal: 16, paddingVertical: 8, gap: 4 },
  forwardRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, gap: 12,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  forwardRowSelected: { borderColor: Colors.accent, backgroundColor: Colors.primary + '20' },
  forwardChatName: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.textPrimary, fontFamily: 'Inter' },
  forwardCheckbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  forwardCheckboxChecked: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  forwardSendBtn: {
    marginHorizontal: 20, marginTop: 12, borderRadius: 14, overflow: 'hidden', height: 48,
  },
  forwardSendBtnDisabled: { opacity: 0.4 },
  forwardSendGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  forwardSendText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Inter' },
});

export default ConversationScreen;
