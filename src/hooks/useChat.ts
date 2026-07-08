import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  getChats,
  getMessages as dsGetMessages,
  sendMessage as dsSendMessage,
  listenMessages,
  listenChats,
  markMessagesAsDelivered,
  markMessagesAsRead,
  setTypingStatus,
  listenTypingStatus,
  updateChat,
} from '../services/dataService';
import type { Chat, ChatMessage } from '../services/dataService';
import { useAuth } from '../context/AuthContext';

export type { Chat, ChatMessage };

interface SendMessageOptions {
  type?: ChatMessage['type'];
  mediaUrl?: string;
  mediaWidth?: number;
  mediaHeight?: number;
  voiceDuration?: number;
  voiceWaveform?: number[];
  locationLat?: number;
  locationLng?: number;
  locationName?: string;
  sharedPostId?: string;
  sharedPostPreview?: string;
  replyTo?: string;
  replyToPreview?: string;
}

interface UseChatReturn {
  chats: Chat[];
  messages: ChatMessage[];
  loading: boolean;
  sendMessage: (text: string, opts?: SendMessageOptions) => Promise<void>;
  loadMore: () => Promise<void>;
  startTyping: () => void;
  stopTyping: () => void;
  otherUserTyping: boolean;
  disappearingMode: 'off' | '24h' | '7d';
  setDisappearingMode: (mode: 'off' | '24h' | '7d') => Promise<void>;
}

export const useChat = (chatId?: string): UseChatReturn => {
  const { user: currentUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [disappearingMode, setDisappearingModeState] = useState<'off' | '24h' | '7d'>('off');
  const disappearingModeRef = useRef<'off' | '24h' | '7d'>('off');
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Real-time message or chat list listener
  useEffect(() => {
    if (chatId) {
      // Listen to chat doc for disappearing mode
      const unsubChat = onSnapshot(doc(db, 'chats', chatId), (snap) => {
        if (snap.exists()) {
          const mode = snap.data()?.disappearingMode || 'off';
          disappearingModeRef.current = mode;
          setDisappearingModeState(mode);
        }
      });

      // Real-time message listener
      const unsubscribeMessages = listenMessages(chatId, (updatedMessages) => {
        // Filter expired messages based on disappearing mode
        const currentMode = disappearingModeRef.current;
        let filtered = updatedMessages;
        if (currentMode !== 'off') {
          const maxAge = currentMode === '24h' ? 86400000 : 604800000;
          const cutoff = Date.now() - maxAge;
          filtered = updatedMessages.filter((m) => m.createdAt > cutoff);
        }
        setMessages(filtered);

        // Auto-mark delivered: messages from others with status 'sent' → 'delivered'
        const sentFromOthers = updatedMessages.filter(
          (m) => m.senderId !== currentUser?.uid && m.status === 'sent'
        );
        if (sentFromOthers.length > 0 && currentUser) {
          // Get unique senders
          const senderIds = [...new Set(sentFromOthers.map((m) => m.senderId))];
          senderIds.forEach((senderId) => {
            markMessagesAsDelivered(chatId, currentUser.uid, senderId).catch(() => {});
          });
        }

        setLoading(false);
      });

      // Real-time typing listener
      const unsubscribeTyping = listenTypingStatus(chatId, (typing) => {
        if (!currentUser) return;
        // Find the other user's typing status
        const otherUserId = Object.keys(typing).find((id) => id !== currentUser.uid);
        if (otherUserId) {
          const otherTs = typing[otherUserId] ?? 0;
          const isFresh = otherTs > 0 && (Date.now() - otherTs) < 4000;
          setOtherUserTyping(isFresh);
        } else {
          setOtherUserTyping(false);
        }
      });

      return () => {
        unsubscribeMessages();
        unsubscribeTyping();
        unsubChat();
      };
    } else {
      // Real-time chat list listener
      const unsubscribe = listenChats((updatedChats) => {
        setChats(updatedChats);
        setLoading(false);
      });
      return unsubscribe;
    }
  }, [chatId, currentUser]);

  const sendMessage = useCallback(async (text: string, opts?: SendMessageOptions) => {
    if (!chatId || !currentUser) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      chatId,
      senderId: currentUser.uid,
      type: opts?.type || 'text',
      content: text,
      status: 'sending',
      createdAt: Date.now(),
      ...(opts?.mediaUrl ? { mediaUrl: opts.mediaUrl } : {}),
      ...(opts?.mediaWidth ? { mediaWidth: opts.mediaWidth } : {}),
      ...(opts?.mediaHeight ? { mediaHeight: opts.mediaHeight } : {}),
      ...(opts?.voiceDuration ? { voiceDuration: opts.voiceDuration } : {}),
      ...(opts?.voiceWaveform ? { voiceWaveform: opts.voiceWaveform } : {}),
      ...(opts?.locationLat != null ? { locationLat: opts.locationLat } : {}),
      ...(opts?.locationLng != null ? { locationLng: opts.locationLng } : {}),
      ...(opts?.locationName ? { locationName: opts.locationName } : {}),
      ...(opts?.sharedPostId ? { sharedPostId: opts.sharedPostId } : {}),
      ...(opts?.sharedPostPreview ? { sharedPostPreview: opts.sharedPostPreview } : {}),
      ...(opts?.replyTo ? { replyTo: opts.replyTo } : {}),
      ...(opts?.replyToPreview ? { replyToPreview: opts.replyToPreview } : {}),
    };
    // Optimistic
    setMessages((prev) => [...prev, newMsg]);
    // Persist
    await dsSendMessage(newMsg);
    // Mark as sent
    setMessages((prev) =>
      prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'sent' as const } : m))
    );
  }, [chatId, currentUser]);

  const startTyping = useCallback(() => {
    if (!chatId || !currentUser) return;
    // Clear existing timer
    if (typingTimer.current) clearTimeout(typingTimer.current);
    // Write typing status
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setTypingStatus(chatId, currentUser.uid, true).catch(() => {});
    }
    // Auto-stop after 3s of inactivity
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      if (chatId && currentUser) {
        setTypingStatus(chatId, currentUser.uid, false).catch(() => {});
      }
    }, 3000);
  }, [chatId, currentUser]);

  const stopTyping = useCallback(() => {
    if (!chatId || !currentUser) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    isTypingRef.current = false;
    setTypingStatus(chatId, currentUser.uid, false).catch(() => {});
  }, [chatId, currentUser]);

  const setDisappearingMode = useCallback(async (mode: 'off' | '24h' | '7d') => {
    if (!chatId) return;
    await updateChat(chatId, { disappearingMode: mode });
    setDisappearingModeState(mode);
    disappearingModeRef.current = mode;
  }, [chatId]);

  const loadMore = async () => {
    // Pagination placeholder
  };

  // Cleanup typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  return {
    chats,
    messages,
    loading,
    sendMessage,
    loadMore,
    startTyping,
    stopTyping,
    otherUserTyping,
    disappearingMode,
    setDisappearingMode,
  };
};

export default useChat;
