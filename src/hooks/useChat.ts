import { useState, useEffect, useCallback } from 'react';
import {
  getChats,
  getMessages as dsGetMessages,
  sendMessage as dsSendMessage,
  listenMessages,
  listenChats,
} from '../services/dataService';
import type { Chat, ChatMessage } from '../services/dataService';

export type { Chat, ChatMessage };

interface UseChatReturn {
  chats: Chat[];
  messages: ChatMessage[];
  loading: boolean;
  sendMessage: (text: string) => Promise<void>;
  loadMore: () => Promise<void>;
}

export const useChat = (chatId?: string): UseChatReturn => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chatId) {
      // Real-time message listener
      const unsubscribe = listenMessages(chatId, (updatedMessages) => {
        setMessages(updatedMessages);
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // Real-time chat list listener
      const unsubscribe = listenChats((updatedChats) => {
        setChats(updatedChats);
        setLoading(false);
      });
      return unsubscribe;
    }
  }, [chatId]);

  const sendMessage = async (text: string) => {
    if (!chatId) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      chatId,
      senderId: 'current_user',
      type: 'text',
      content: text,
      status: 'sending',
      createdAt: Date.now(),
    };
    // Optimistic
    setMessages((prev) => [...prev, newMsg]);
    // Persist
    await dsSendMessage(newMsg);
    // Mark as sent
    setMessages((prev) =>
      prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'sent' as const } : m))
    );
  };

  const loadMore = async () => {
    // Pagination placeholder
  };

  return { chats, messages, loading, sendMessage, loadMore };
};

export default useChat;
