import React, { useState, useRef, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../utils/colors';
import AvatarBadge from '../../components/shared/AvatarBadge';
import { getMessages as dsGetMessages, sendMessage as dsSendMessage } from '../../services/dataService';
import type { ChatMessage } from '../../services/dataService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  senderId: 'me' | 'other';
  timestamp: string;
  isRead?: boolean;
}


interface ConversationScreenProps {
  navigation: any;
}

const ConversationScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const chatName = route?.params?.name || 'Conversation';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isTyping) {
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
  }, [isTyping]);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    const chatId = route?.params?.chatId || 'seed_chat_1';
    const msgs = await dsGetMessages(chatId);
    setMessages(msgs);
  };

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;
    const newMsg: ChatMessage = {
      id: 'm_' + Date.now().toString(36),
      chatId: route?.params?.chatId || 'seed_chat_1',
      senderId: 'current_user',
      type: 'text',
      content: inputText.trim(),
      status: 'sending',
      createdAt: Date.now(),
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    await dsSendMessage(newMsg);
    setMessages(prev => prev.map(m => m.id === newMsg.id ? {...m, status: 'sent'} : m));
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [inputText]);

  const formatDateSeparator = (timestamp: string) => {
    const today = new Date();
    const msgTime = new Date();
    const msgHour = parseInt(timestamp.split(':')[0], 10);
    msgTime.setHours(msgHour, parseInt(timestamp.split(':')[1], 10));
    if (msgTime.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (msgTime.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return msgTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <Animated.View
            style={[styles.typingDot, { transform: [{ translateY: dot1Anim }] }]}
          />
          <Animated.View
            style={[styles.typingDot, { transform: [{ translateY: dot2Anim }] }]}
          />
          <Animated.View
            style={[styles.typingDot, { transform: [{ translateY: dot3Anim }] }]}
          />
        </View>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === 'me';
    return (
      <View
        style={[
          styles.messageWrapper,
          isMine ? styles.myMessageWrapper : styles.otherMessageWrapper,
        ]}
      >
        {isMine ? (
          <LinearGradient
            colors={[Colors.primary, Colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.messageBubble, styles.myMessage]}
          >
            <Text style={styles.messageText}>{item.text}</Text>
            <View style={styles.messageMeta}>
              <Text style={styles.messageTime}>{item.timestamp}</Text>
              {item.isRead ? (
                <Ionicons name="checkmark-done" size={14} color={Colors.neon} />
              ) : (
                <Ionicons name="checkmark" size={14} color={Colors.textSecondary} />
              )}
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.messageBubble, styles.otherMessage]}>
            <Text style={styles.otherMessageText}>{item.text}</Text>
            <Text style={styles.otherMessageTime}>{item.timestamp}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Pattern */}
      <View style={styles.bgPattern}>
        {Array.from({ length: 30 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.bgDot,
              {
                left: Math.random() * SCREEN_WIDTH,
                top: Math.random() * 800 + 100,
                opacity: 0.15 + Math.random() * 0.15,
              },
            ]}
          />
        ))}
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerUser} activeOpacity={0.7}>
          <AvatarBadge name={chatName} size={40} role="admin" verified showOnline online />
          <View style={styles.headerUserInfo}>
            <Text style={styles.headerName}>{chatName}</Text>
            <Text style={styles.headerStatus}>Online</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('CallScreen', { mode: 'voice' })} style={styles.headerBtn}>
            <Ionicons name="call" size={20} color={Colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('CallScreen', { mode: 'video' })} style={styles.headerBtn}>
            <Ionicons name="videocam" size={20} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

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
          ListHeaderComponent={renderTypingIndicator}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

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
                onChangeText={setInputText}
                placeholder="Message..."
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={500}
              />
            </View>
            <TouchableOpacity style={styles.inputIcon} onPress={() => Alert.alert('Attach', 'File attachment coming soon.')}>
              <Ionicons name="attach-outline" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
            {inputText.trim() ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSend}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendGradient}
                >
                  <Ionicons
                    name="send"
                    size={18}
                    color={Colors.textPrimary}
                    style={{ transform: [{ translateX: 1 }] }}
                  />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.micButton} activeOpacity={0.8} onPress={() => Alert.alert('Voice', 'Voice messages coming soon.')}>
                <LinearGradient
                  colors={[Colors.primary, Colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.micGradient}
                >
                  <Ionicons name="mic" size={18} color={Colors.textPrimary} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  bgPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  bgDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
    backgroundColor: Colors.glassBg,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerUserInfo: {
    marginLeft: 10,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  headerStatus: {
    fontSize: 12,
    color: Colors.success,
    fontFamily: 'Inter',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },

  // Messages
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageWrapper: {
    marginBottom: 10,
    maxWidth: '80%',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  myMessage: {
    borderBottomRightRadius: 4,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  otherMessage: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  otherMessageText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  otherMessageTime: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginTop: 4,
    alignSelf: 'flex-end',
  },

  // Typing Indicator
  typingContainer: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 5,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },

  // Input Bar
  inputBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    backgroundColor: Colors.secondaryBg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: Colors.glassBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: 16,
    maxHeight: 100,
  },
  input: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  micGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ConversationScreen;
