import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import { db } from './firebase';
import type { UserData } from '../context/AuthContext';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: string;
  verified: boolean;
  street: string;
  content: string;
  media?: string[];
  category: string;
  likesCount: number;
  commentsCount: number;
  userLiked?: boolean;
  userReaction?: string;
  timestamp: number;
  location?: string;
  audience: 'public' | 'neighborhood' | 'private';
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: string;
  text: string;
  timestamp: number;
  likesCount: number;
  userLiked: boolean;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  type: 'text' | 'image' | 'voice' | 'location';
  content: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: string;
  forwardedFrom?: string;
  reactions?: Record<string, string>;
  createdAt: number;
}

export interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantAvatars: Record<string, string>;
  lastMessage?: string;
  lastTimestamp?: number;
  unreadCount: number;
  online: Record<string, boolean>;
  disappearingMode: boolean;
  pinned: boolean;
}

export interface ChatRequest {
  id: string;
  fromUserId: string;
  fromName: string;
  fromAvatar?: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: number;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string | null;
  attendees: { name: string; role: 'admin' | 'resident' | 'business' | 'superAdmin' }[];
  attendeeCount: number;
  rsvp: 'going' | 'interested' | null;
  createdBy?: string;
  description?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voted: boolean;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  isPinned: boolean;
  isAdmin: boolean;
  expiresAt: number;
  createdBy: string;
}

export interface Alert {
  id: string;
  type: string;
  title: string;
  description: string;
  location: string;
  timestamp: number;
  resolved: boolean;
  createdBy?: string;
}

export interface Business {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  distance: string;
  image: string | null;
  description: string;
  isOpen: boolean;
  phone?: string;
  address?: string;
}

export interface BusinessReview {
  id: string;
  businessId: string;
  authorName: string;
  rating: number;
  text: string;
  timestamp: number;
}

export interface Listing {
  id: string;
  title: string;
  price: number;
  image: string | null;
  category: string;
  location: string;
  timestamp: number;
  condition: string;
  sellerName?: string;
  sellerId?: string;
  description?: string;
  images?: string[];
}

export interface LostFoundItem {
  id: string;
  title: string;
  type: 'lost' | 'found';
  category: string;
  description: string;
  location: string;
  timestamp: number;
  image: string | null;
  reporterName?: string;
  reporterId?: string;
  resolved?: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'alert' | 'follow';
  title: string;
  body: string;
  timestamp: string;
  isUnread: boolean;
  date: string;
}

export interface AdminPending {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export interface AdminReport {
  id: string;
  author: string;
  reason: string;
  reportedBy: number;
  preview: string;
}

/* ------------------------------------------------------------------ */
/*  Generic CRUD helpers (AsyncStorage)                                 */
/* ------------------------------------------------------------------ */

async function getAll<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

async function setAll<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

async function getById<T extends { id: string }>(key: string, id: string): Promise<T | null> {
  const items = await getAll<T>(key);
  return items.find((i) => i.id === id) ?? null;
}

async function addItem<T extends { id: string }>(key: string, item: T): Promise<void> {
  const items = await getAll<T>(key);
  items.unshift(item);
  await setAll(key, items);
}

async function updateItem<T extends { id: string }>(key: string, id: string, updates: Record<string, any>): Promise<void> {
  const items = await getAll<T>(key);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return;
  items[idx] = { ...items[idx], ...updates };
  await setAll(key, items);
}

async function removeItem<T extends { id: string }>(key: string, id: string): Promise<void> {
  const items = await getAll<T>(key);
  await setAll(key, items.filter((i) => i.id !== id));
}

/* ------------------------------------------------------------------ */
/*  Firestore helpers                                                  */
/* ------------------------------------------------------------------ */

/** Remove keys whose value is `undefined` — Firestore rejects `undefined`. */
function clean<T>(obj: T): T {
  const out = { ...obj } as Record<string, any>;
  Object.keys(out).forEach((k) => { if (out[k] === undefined) delete out[k]; });
  return out as T;
}

async function fsSet<T extends { id: string }>(collectionName: string, item: T): Promise<void> {
  // Fire-and-forget so a slow Firestore never blocks the UI.
  // The AsyncStorage write at the caller completes instantly.
  setDoc(doc(db, collectionName, item.id), clean(item)).catch((e) => {
    if (e.code !== 'unavailable') console.warn(`[DataService] Firestore set ${collectionName} failed:`, e);
  });
}

async function fsUpdate(collectionName: string, id: string, updates: Record<string, any>): Promise<void> {
  updateDoc(doc(db, collectionName, id), clean(updates)).catch((e) => {
    if (e.code !== 'unavailable') console.warn(`[DataService] Firestore update ${collectionName} failed:`, e);
  });
}

async function fsDelete(collectionName: string, id: string): Promise<void> {
  deleteDoc(doc(db, collectionName, id)).catch((e) => {
    if (e.code !== 'unavailable') console.warn(`[DataService] Firestore delete ${collectionName} failed:`, e);
  });
}

/* ------------------------------------------------------------------ */
/*  Post helpers                                                       */
/* ------------------------------------------------------------------ */

export async function getPosts(): Promise<Post[]> {
  try {
    const snapshot = await getDocs(collection(db, 'posts'));
    if (!snapshot.empty) {
      const posts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
      posts.sort((a, b) => b.timestamp - a.timestamp);
      await setAll(STORAGE_KEYS.POSTS, posts).catch(() => {});
      return posts;
    }
  } catch {}
  return getAll<Post>(STORAGE_KEYS.POSTS);
}

export async function getPost(id: string): Promise<Post | null> {
  try {
    const snapshot = await getDoc(doc(db, 'posts', id));
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Post;
    }
  } catch {}
  return getById<Post>(STORAGE_KEYS.POSTS, id);
}

export async function savePost(post: Post): Promise<void> {
  await fsSet('posts', post);
  await addItem(STORAGE_KEYS.POSTS, post);
}

export async function updatePost(id: string, updates: Partial<Post>): Promise<void> {
  await fsUpdate('posts', id, updates);
  await updateItem(STORAGE_KEYS.POSTS, id, updates);
}

export async function deletePost(id: string): Promise<void> {
  await fsDelete('posts', id);
  await removeItem(STORAGE_KEYS.POSTS, id);
}

export async function likePost(postId: string, userId: string): Promise<void> {
  const post = await getPost(postId);
  if (!post) return;
  const alreadyLiked = post.userLiked;
  await updatePost(postId, {
    likesCount: alreadyLiked ? post.likesCount - 1 : post.likesCount + 1,
    userLiked: !alreadyLiked,
    userReaction: alreadyLiked ? undefined : 'like',
  });
}

/* ------------------------------------------------------------------ */
/*  Comment helpers                                                    */
/* ------------------------------------------------------------------ */

export async function getComments(postId: string): Promise<Comment[]> {
  try {
    const q = query(collection(db, 'comments'), where('postId', '==', postId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const comments = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Comment));
      comments.sort((a, b) => b.timestamp - a.timestamp);
      return comments;
    }
  } catch {}
  const all = await getAll<Comment>(STORAGE_KEYS.COMMENTS);
  return all.filter((c) => c.postId === postId);
}

export async function addComment(comment: Comment): Promise<void> {
  await addItem(STORAGE_KEYS.COMMENTS, comment);
  await fsSet('comments', comment);
  // Bump commentsCount on the post
  const post = await getPost(comment.postId);
  if (post) {
    await updatePost(comment.postId, { commentsCount: post.commentsCount + 1 });
  }
}

/* ------------------------------------------------------------------ */
/*  Chat helpers                                                       */
/* ------------------------------------------------------------------ */

export async function getChats(): Promise<Chat[]> {
  try {
    const snapshot = await getDocs(collection(db, 'chats'));
    if (!snapshot.empty) {
      const chats = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Chat));
      chats.sort((a, b) => (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0));
      await setAll(STORAGE_KEYS.CHATS, chats).catch(() => {});
      return chats;
    }
  } catch {}
  return getAll<Chat>(STORAGE_KEYS.CHATS);
}

export async function saveChat(chat: Chat): Promise<void> {
  await fsSet('chats', chat);
  const existing = await getById<Chat>(STORAGE_KEYS.CHATS, chat.id);
  if (existing) {
    await updateItem(STORAGE_KEYS.CHATS, chat.id, chat);
  } else {
    await addItem(STORAGE_KEYS.CHATS, chat);
  }
}

export async function getMessages(chatId: string): Promise<ChatMessage[]> {
  try {
    const q = query(collection(db, 'messages'), where('chatId', '==', chatId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
      messages.sort((a, b) => a.createdAt - b.createdAt);
      return messages;
    }
  } catch {}
  const all = await getAll<ChatMessage>(STORAGE_KEYS.MESSAGES);
  return all.filter((m) => m.chatId === chatId).sort((a, b) => a.createdAt - b.createdAt);
}

export async function sendMessage(msg: ChatMessage): Promise<void> {
  await addItem(STORAGE_KEYS.MESSAGES, msg);
  await fsSet('messages', msg);
  // Update chat's lastMessage/lastTimestamp
  const chats = await getChats();
  const chat = chats.find((c) => c.id === msg.chatId);
  if (chat) {
    await updateItem(STORAGE_KEYS.CHATS, chat.id, {
      lastMessage: msg.content,
      lastTimestamp: msg.createdAt,
    });
    await fsUpdate('chats', chat.id, {
      lastMessage: msg.content,
      lastTimestamp: msg.createdAt,
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Chat Request helpers                                               */
/* ------------------------------------------------------------------ */

export async function getChatRequests(): Promise<ChatRequest[]> {
  try {
    const snapshot = await getDocs(collection(db, 'chat_requests'));
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatRequest));
    }
  } catch {}
  return getAll<ChatRequest>(STORAGE_KEYS.CHAT_REQUESTS);
}

export async function acceptChatRequest(request: ChatRequest, currentUserId: string, currentUserName: string): Promise<Chat> {
  const chatId = 'chat_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
  const chat: Chat = {
    id: chatId,
    participants: [currentUserId, request.fromUserId],
    participantNames: { [currentUserId]: currentUserName, [request.fromUserId]: request.fromName },
    participantAvatars: {},
    lastMessage: 'Chat started',
    lastTimestamp: Date.now(),
    unreadCount: 0,
    online: { [currentUserId]: true },
    disappearingMode: false,
    pinned: false,
  };
  await saveChat(chat);
  // Remove the request from both stores
  await removeItem(STORAGE_KEYS.CHAT_REQUESTS, request.id);
  await fsDelete('chat_requests', request.id);
  return chat;
}

export async function declineChatRequest(requestId: string): Promise<void> {
  await removeItem(STORAGE_KEYS.CHAT_REQUESTS, requestId);
  await fsDelete('chat_requests', requestId);
}

export async function addChatRequest(request: ChatRequest): Promise<void> {
  await addItem(STORAGE_KEYS.CHAT_REQUESTS, request);
  await fsSet('chat_requests', request);
}

/* ------------------------------------------------------------------ */
/*  Users helpers                                                      */
/* ------------------------------------------------------------------ */

export async function getUsers(): Promise<UserData[]> {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    if (!snapshot.empty) {
      const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UserData));
      await setAll(STORAGE_KEYS.USERS, users).catch(() => {});
      return users;
    }
  } catch {}
  return getAll<UserData>(STORAGE_KEYS.USERS);
}

export async function getUserById(id: string): Promise<UserData | null> {
  try {
    const snapshot = await getDoc(doc(db, 'users', id));
    if (snapshot.exists()) {
      const user = { id: snapshot.id, ...snapshot.data() } as UserData;
      return user;
    }
  } catch {}
  return getById<UserData>(STORAGE_KEYS.USERS, id) ?? null;
}

/* ------------------------------------------------------------------ */
/*  Event helpers                                                      */
/* ------------------------------------------------------------------ */

export async function getEvents(): Promise<Event[]> {
  try {
    const snapshot = await getDocs(collection(db, 'events'));
    if (!snapshot.empty) {
      const events = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
      await setAll(STORAGE_KEYS.EVENTS, events).catch(() => {});
      return events;
    }
  } catch {}
  return getAll<Event>(STORAGE_KEYS.EVENTS);
}

export async function saveEvent(event: Event): Promise<void> {
  await addItem(STORAGE_KEYS.EVENTS, event);
  await fsSet('events', event);
}

export async function updateEvent(id: string, updates: Partial<Event>): Promise<void> {
  await updateItem(STORAGE_KEYS.EVENTS, id, updates);
  await fsUpdate('events', id, updates);
}

/* ------------------------------------------------------------------ */
/*  Poll helpers                                                       */
/* ------------------------------------------------------------------ */

export async function getPolls(): Promise<Poll[]> {
  try {
    const snapshot = await getDocs(collection(db, 'polls'));
    if (!snapshot.empty) {
      const polls = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Poll));
      await setAll(STORAGE_KEYS.POLLS, polls).catch(() => {});
      return polls;
    }
  } catch {}
  return getAll<Poll>(STORAGE_KEYS.POLLS);
}

export async function savePoll(poll: Poll): Promise<void> {
  await addItem(STORAGE_KEYS.POLLS, poll);
  await fsSet('polls', poll);
}

export async function votePoll(pollId: string, optionId: string): Promise<void> {
  // Try Firestore first
  try {
    const snapshot = await getDoc(doc(db, 'polls', pollId));
    if (!snapshot.exists()) return;
    const poll = { id: snapshot.id, ...snapshot.data() } as Poll;
    const option = poll.options.find((o) => o.id === optionId);
    if (!option || option.voted) return;
    option.votes += 1;
    option.voted = true;
    poll.totalVotes += 1;
    await updateDoc(doc(db, 'polls', pollId), {
      options: poll.options,
      totalVotes: poll.totalVotes,
    });
    // Sync local cache
    await updateItem(STORAGE_KEYS.POLLS, pollId, {
      options: poll.options,
      totalVotes: poll.totalVotes,
    });
    return;
  } catch {}
  // AsyncStorage fallback
  const poll = await getById<Poll>(STORAGE_KEYS.POLLS, pollId);
  if (!poll) return;
  const option = poll.options.find((o) => o.id === optionId);
  if (!option || option.voted) return;
  option.votes += 1;
  option.voted = true;
  poll.totalVotes += 1;
  await updateItem(STORAGE_KEYS.POLLS, pollId, {
    options: poll.options,
    totalVotes: poll.totalVotes,
  });
}

/* ------------------------------------------------------------------ */
/*  Alert helpers                                                      */
/* ------------------------------------------------------------------ */

export async function getAlerts(): Promise<Alert[]> {
  try {
    const snapshot = await getDocs(collection(db, 'alerts'));
    if (!snapshot.empty) {
      const alerts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Alert));
      await setAll(STORAGE_KEYS.ALERTS, alerts).catch(() => {});
      return alerts;
    }
  } catch {}
  return getAll<Alert>(STORAGE_KEYS.ALERTS);
}

export async function saveAlert(alert: Alert): Promise<void> {
  await addItem(STORAGE_KEYS.ALERTS, alert);
  await fsSet('alerts', alert);
}

export async function resolveAlert(id: string): Promise<void> {
  await updateItem(STORAGE_KEYS.ALERTS, id, { resolved: true });
  await fsUpdate('alerts', id, { resolved: true });
}

/* ------------------------------------------------------------------ */
/*  Business helpers                                                   */
/* ------------------------------------------------------------------ */

export async function getBusinesses(): Promise<Business[]> {
  try {
    const snapshot = await getDocs(collection(db, 'businesses'));
    if (!snapshot.empty) {
      const businesses = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Business));
      await setAll(STORAGE_KEYS.BUSINESSES, businesses).catch(() => {});
      return businesses;
    }
  } catch {}
  return getAll<Business>(STORAGE_KEYS.BUSINESSES);
}

export async function getBusinessReviews(businessId: string): Promise<BusinessReview[]> {
  try {
    const q = query(collection(db, 'business_reviews'), where('businessId', '==', businessId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BusinessReview));
    }
  } catch {}
  const all = await getAll<BusinessReview>('@paaswala_business_reviews');
  return all.filter((r) => r.businessId === businessId);
}

export async function addBusinessReview(review: BusinessReview): Promise<void> {
  await addItem('@paaswala_business_reviews', review);
  await fsSet('business_reviews', review);
}

/* ------------------------------------------------------------------ */
/*  Listing helpers                                                    */
/* ------------------------------------------------------------------ */

export async function getListings(): Promise<Listing[]> {
  try {
    const snapshot = await getDocs(collection(db, 'listings'));
    if (!snapshot.empty) {
      const listings = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Listing));
      await setAll(STORAGE_KEYS.LISTINGS, listings).catch(() => {});
      return listings;
    }
  } catch {}
  return getAll<Listing>(STORAGE_KEYS.LISTINGS);
}

export async function saveListing(listing: Listing): Promise<void> {
  await addItem(STORAGE_KEYS.LISTINGS, listing);
  await fsSet('listings', listing);
}

/* ------------------------------------------------------------------ */
/*  Lost & Found helpers                                               */
/* ------------------------------------------------------------------ */

export async function getLostFoundItems(): Promise<LostFoundItem[]> {
  try {
    const snapshot = await getDocs(collection(db, 'lost_found'));
    if (!snapshot.empty) {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LostFoundItem));
      await setAll(STORAGE_KEYS.LOST_FOUND, items).catch(() => {});
      return items;
    }
  } catch {}
  return getAll<LostFoundItem>(STORAGE_KEYS.LOST_FOUND);
}

export async function saveLostFoundItem(item: LostFoundItem): Promise<void> {
  await addItem(STORAGE_KEYS.LOST_FOUND, item);
  await fsSet('lost_found', item);
}

/* ------------------------------------------------------------------ */
/*  Notification helpers                                               */
/* ------------------------------------------------------------------ */

export async function getNotifications(): Promise<NotificationItem[]> {
  try {
    const snapshot = await getDocs(collection(db, 'notifications'));
    if (!snapshot.empty) {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationItem));
      await setAll(STORAGE_KEYS.NOTIFICATIONS, items).catch(() => {});
      return items;
    }
  } catch {}
  return getAll<NotificationItem>(STORAGE_KEYS.NOTIFICATIONS);
}

export async function saveNotification(notification: NotificationItem): Promise<void> {
  await addItem(STORAGE_KEYS.NOTIFICATIONS, notification);
  await fsSet('notifications', notification);
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateItem(STORAGE_KEYS.NOTIFICATIONS, id, { isUnread: false });
  await fsUpdate('notifications', id, { isUnread: false });
}

export async function clearAllNotifications(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
  // Clear Firestore
  try {
    const snapshot = await getDocs(collection(db, 'notifications'));
    const deletions = snapshot.docs.map((d) => deleteDoc(doc(db, 'notifications', d.id)));
    await Promise.all(deletions);
  } catch (e) {
    console.warn('[DataService] Firestore clearAllNotifications failed:', e);
  }
}

/* ------------------------------------------------------------------ */
/*  Admin helpers                                                      */
/* ------------------------------------------------------------------ */

export async function getAdminPending(): Promise<AdminPending[]> {
  try {
    const snapshot = await getDocs(collection(db, 'admin_pending'));
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AdminPending));
    }
  } catch {}
  return getAll<AdminPending>(STORAGE_KEYS.ADMIN_PENDING);
}

export async function approvePending(id: string): Promise<void> {
  await removeItem(STORAGE_KEYS.ADMIN_PENDING, id);
  await fsDelete('admin_pending', id);
}

export async function rejectPending(id: string): Promise<void> {
  await removeItem(STORAGE_KEYS.ADMIN_PENDING, id);
  await fsDelete('admin_pending', id);
}

export async function getAdminReports(): Promise<AdminReport[]> {
  try {
    const snapshot = await getDocs(collection(db, 'admin_reports'));
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AdminReport));
    }
  } catch {}
  return getAll<AdminReport>(STORAGE_KEYS.ADMIN_REPORTS);
}

export async function dismissReport(id: string): Promise<void> {
  await removeItem(STORAGE_KEYS.ADMIN_REPORTS, id);
  await fsDelete('admin_reports', id);
}

/* ------------------------------------------------------------------ */
/*  Listener helpers (Firestore real-time)                              */
/* ------------------------------------------------------------------ */

export function listenPosts(callback: (posts: Post[]) => void): () => void {
  try {
    return onSnapshot(
      collection(db, 'posts'),
      (snapshot) => {
        const posts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
        posts.sort((a, b) => b.timestamp - a.timestamp);
        callback(posts);
      },
      () => {
        getAll<Post>(STORAGE_KEYS.POSTS).then(callback).catch(() => {});
      }
    );
  } catch {
    getAll<Post>(STORAGE_KEYS.POSTS).then(callback).catch(() => {});
    return () => {};
  }
}

export function listenMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  try {
    const q = query(collection(db, 'messages'), where('chatId', '==', chatId));
    return onSnapshot(
      q,
      (snapshot) => {
        const messages = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as ChatMessage)
        );
        messages.sort((a, b) => a.createdAt - b.createdAt);
        callback(messages);
      },
      () => {
        getAll<ChatMessage>(STORAGE_KEYS.MESSAGES).then((all) => {
          callback(
            all.filter((m) => m.chatId === chatId).sort((a, b) => a.createdAt - b.createdAt)
          );
        }).catch(() => {});
      }
    );
  } catch {
    getAll<ChatMessage>(STORAGE_KEYS.MESSAGES).then((all) => {
      callback(
        all.filter((m) => m.chatId === chatId).sort((a, b) => a.createdAt - b.createdAt)
      );
    }).catch(() => {});
    return () => {};
  }
}

export function listenChats(callback: (chats: Chat[]) => void): () => void {
  try {
    return onSnapshot(
      collection(db, 'chats'),
      (snapshot) => {
        const chats = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Chat));
        chats.sort((a, b) => (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0));
        callback(chats);
      },
      () => {
        getAll<Chat>(STORAGE_KEYS.CHATS).then(callback).catch(() => {});
      }
    );
  } catch {
    getAll<Chat>(STORAGE_KEYS.CHATS).then(callback).catch(() => {});
    return () => {};
  }
}

/* ------------------------------------------------------------------ */
/*  Seed data — exact copies of current MOCK_ arrays                   */
/* ------------------------------------------------------------------ */

const SEED_POSTS: Post[] = [
  {
    id: 'seed_post_1',
    authorId: 'seed_user_1',
    authorName: 'Aisha Khan',
    authorAvatar: '',
    authorRole: 'resident',
    verified: true,
    street: 'Street 5',
    content: 'Assalam-o-Alaikum neighbors! Just wanted to share that the new bakery on Main Street has amazing fresh naan! Highly recommend.',
    media: [],
    category: 'recommendation',
    likesCount: 24,
    commentsCount: 8,
    userLiked: false,
    timestamp: Date.now() - 3600000,
    audience: 'public',
  },
  {
    id: 'seed_post_2',
    authorId: 'seed_user_2',
    authorName: 'Imran Ali',
    authorAvatar: '',
    authorRole: 'admin',
    verified: true,
    street: 'Street 12',
    content: '⚠️ Important Announcement: Water supply will be suspended tomorrow from 10 AM to 2 PM for maintenance. Please store water accordingly.',
    media: [],
    category: 'announcement',
    likesCount: 56,
    commentsCount: 15,
    userLiked: true,
    timestamp: Date.now() - 7200000,
    audience: 'neighborhood',
  },
  {
    id: 'seed_post_3',
    authorId: 'seed_user_3',
    authorName: 'Fatima Hassan',
    authorAvatar: '',
    authorRole: 'resident',
    verified: false,
    street: 'Street 8',
    content: 'Found a cute little kitten near the park! It looks lost. Does anyone recognize it?',
    media: [],
    category: 'question',
    likesCount: 42,
    commentsCount: 12,
    userLiked: false,
    timestamp: Date.now() - 14400000,
    audience: 'neighborhood',
  },
];

const SEED_COMMENTS: Comment[] = [
  {
    id: 'seed_comment_1',
    postId: 'seed_post_1',
    authorId: 'seed_user_4',
    authorName: 'Usman Mahmood',
    authorAvatar: '',
    authorRole: 'resident',
    text: 'MashaAllah, that is great news! I have been waiting for a good bakery nearby.',
    timestamp: Date.now() - 1800000,
    likesCount: 5,
    userLiked: false,
  },
  {
    id: 'seed_comment_2',
    postId: 'seed_post_1',
    authorId: 'seed_user_5',
    authorName: 'Zara Butt',
    authorAvatar: '',
    authorRole: 'resident',
    text: 'Do they make whole wheat naan as well?',
    timestamp: Date.now() - 900000,
    likesCount: 2,
    userLiked: true,
  },
  {
    id: 'seed_comment_3',
    postId: 'seed_post_1',
    authorId: 'seed_user_6',
    authorName: 'Ahmed Raza',
    authorAvatar: '',
    authorRole: 'resident',
    text: 'I went there yesterday! The cheese naan is incredible.',
    timestamp: Date.now() - 300000,
    likesCount: 3,
    userLiked: false,
  },
];

const SEED_CHATS: Chat[] = [
  {
    id: 'seed_chat_1',
    participants: ['seed_current_user', 'seed_user_1'],
    participantNames: { seed_current_user: 'You', seed_user_1: 'Aisha Khan' },
    participantAvatars: {},
    lastMessage: 'Yes, I will be there!',
    lastTimestamp: Date.now() - 600000,
    unreadCount: 2,
    online: { seed_user_1: true },
    disappearingMode: false,
    pinned: true,
  },
  {
    id: 'seed_chat_2',
    participants: ['seed_current_user', 'seed_user_2'],
    participantNames: { seed_current_user: 'You', seed_user_2: 'Imran Ali' },
    participantAvatars: {},
    lastMessage: 'Thank you for the update',
    lastTimestamp: Date.now() - 3600000,
    unreadCount: 0,
    online: { seed_user_2: false },
    disappearingMode: false,
    pinned: false,
  },
];

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: 'seed_msg_1',
    chatId: 'seed_chat_1',
    senderId: 'seed_user_1',
    type: 'text',
    content: 'Assalam-o-Alaikum!',
    status: 'read',
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'seed_msg_2',
    chatId: 'seed_chat_1',
    senderId: 'seed_current_user',
    type: 'text',
    content: 'Walaikum Assalam! How are you?',
    status: 'read',
    createdAt: Date.now() - 3500000,
  },
  {
    id: 'seed_msg_3',
    chatId: 'seed_chat_1',
    senderId: 'seed_user_1',
    type: 'text',
    content: 'I am great! Are you coming to the community event?',
    status: 'delivered',
    createdAt: Date.now() - 600000,
  },
];

const SEED_CHAT_REQUESTS: ChatRequest[] = [
  {
    id: 'seed_req_1',
    fromUserId: 'seed_user_7',
    fromName: 'Hassan Raza',
    fromAvatar: '',
    status: 'pending',
    timestamp: Date.now() - 86400000,
  },
  {
    id: 'seed_req_2',
    fromUserId: 'seed_user_8',
    fromName: 'Sana Malik',
    fromAvatar: '',
    status: 'pending',
    timestamp: Date.now() - 172800000,
  },
];

const SEED_EVENTS: Event[] = [
  {
    id: 'seed_event_1',
    title: 'Community Clean-Up Day',
    date: 'Sat, Jun 28',
    time: '9:00 AM - 12:00 PM',
    location: 'Community Park, Green Valley',
    image: null,
    attendees: [
      { name: 'Ahmad Khan', role: 'admin' },
      { name: 'Sarah Ahmed', role: 'resident' },
      { name: 'Usman Ali', role: 'resident' },
      { name: 'Fatima Zahra', role: 'resident' },
      { name: 'Bilal Hassan', role: 'resident' },
    ],
    attendeeCount: 24,
    rsvp: null,
  },
  {
    id: 'seed_event_2',
    title: 'Summer BBQ & Social Gathering',
    date: 'Sun, Jun 29',
    time: '6:00 PM - 10:00 PM',
    location: 'Block C Common Area',
    image: null,
    attendees: [
      { name: 'Omar Farooq', role: 'resident' },
      { name: 'Hira Batool', role: 'resident' },
      { name: 'Zain Abbas', role: 'resident' },
    ],
    attendeeCount: 18,
    rsvp: 'going',
  },
  {
    id: 'seed_event_3',
    title: 'Yoga in the Park',
    date: 'Mon, Jul 1',
    time: '6:30 AM - 7:30 AM',
    location: 'Community Park',
    image: null,
    attendees: [
      { name: 'Ayesha Malik', role: 'resident' },
      { name: 'Nadia Khan', role: 'resident' },
    ],
    attendeeCount: 12,
    rsvp: 'interested',
  },
  {
    id: 'seed_event_4',
    title: 'Kids Art Workshop',
    date: 'Wed, Jul 3',
    time: '3:00 PM - 5:00 PM',
    location: 'Community Center, Block A',
    image: null,
    attendees: [
      { name: 'Sana Tariq', role: 'resident' },
      { name: 'Rayan Ahmed', role: 'resident' },
    ],
    attendeeCount: 15,
    rsvp: null,
  },
];

const SEED_PAST_EVENTS: Event[] = [
  {
    id: 'seed_event_5',
    title: 'Neighborhood Iftar Dinner',
    date: 'Thu, Mar 20',
    time: '6:30 PM - 8:30 PM',
    location: 'Main Lawn',
    image: null,
    attendees: [
      { name: 'Ali Raza', role: 'admin' },
      { name: 'Zara Sheikh', role: 'resident' },
    ],
    attendeeCount: 45,
    rsvp: null,
  },
];

const SEED_POLLS: Poll[] = [
  {
    id: 'seed_poll_1',
    question: 'What type of community event should we organize next?',
    options: [
      { id: 'seed_opt_1a', text: 'Sports Tournament', votes: 34, voted: true },
      { id: 'seed_opt_1b', text: 'Food Festival', votes: 28, voted: false },
      { id: 'seed_opt_1c', text: 'Cultural Night', votes: 18, voted: false },
      { id: 'seed_opt_1d', text: 'Clean-Up Drive', votes: 12, voted: false },
    ],
    totalVotes: 92,
    isPinned: true,
    isAdmin: true,
    expiresAt: Date.now() + 86400000 * 2,
    createdBy: 'Admin • Neighborhood Committee',
  },
  {
    id: 'seed_poll_2',
    question: 'Should we install speed bumps on Main Street?',
    options: [
      { id: 'seed_opt_2a', text: 'Yes, strongly agree', votes: 45, voted: false },
      { id: 'seed_opt_2b', text: 'Yes, but with cycle lane', votes: 30, voted: true },
      { id: 'seed_opt_2c', text: 'No, too disruptive', votes: 15, voted: false },
    ],
    totalVotes: 90,
    isPinned: false,
    isAdmin: true,
    expiresAt: Date.now() + 86400000 * 5,
    createdBy: 'Admin • Traffic Committee',
  },
  {
    id: 'seed_poll_3',
    question: 'Preferred timing for community yoga sessions?',
    options: [
      { id: 'seed_opt_3a', text: 'Early morning (6-7 AM)', votes: 22, voted: false },
      { id: 'seed_opt_3b', text: 'Morning (9-10 AM)', votes: 18, voted: false },
      { id: 'seed_opt_3c', text: 'Evening (5-6 PM)', votes: 15, voted: false },
      { id: 'seed_opt_3d', text: 'Late evening (7-8 PM)', votes: 8, voted: false },
    ],
    totalVotes: 63,
    isPinned: false,
    isAdmin: false,
    expiresAt: Date.now() + 86400000,
    createdBy: 'Resident • Sarah Ahmed',
  },
  {
    id: 'seed_poll_4',
    question: 'Which new grocery store would you prefer?',
    options: [
      { id: 'seed_opt_4a', text: 'Local organic market', votes: 40, voted: false },
      { id: 'seed_opt_4b', text: 'International brand', votes: 25, voted: false },
      { id: 'seed_opt_4c', text: 'Online delivery hub', votes: 20, voted: false },
    ],
    totalVotes: 85,
    isPinned: false,
    isAdmin: false,
    expiresAt: Date.now() + 86400000 * 3,
    createdBy: 'Resident • Usman Ali',
  },
];

const SEED_ALERTS: Alert[] = [
  {
    id: 'seed_alert_1',
    type: 'emergency',
    title: 'Fire Reported',
    description: 'A fire has been reported in Block C near the community center. Emergency services are on the way.',
    location: 'Block C, Green Valley',
    timestamp: Date.now() - 5 * 60000,
    resolved: false,
  },
  {
    id: 'seed_alert_2',
    type: 'security',
    title: 'Suspicious Activity',
    description: 'Suspicious vehicle spotted near the main gate. Security has been notified.',
    location: 'Main Gate Area',
    timestamp: Date.now() - 35 * 60000,
    resolved: false,
  },
  {
    id: 'seed_alert_3',
    type: 'weather',
    title: 'Heavy Rain Warning',
    description: 'Heavy rainfall expected tonight. Please secure outdoor belongings and avoid low-lying areas.',
    location: 'Entire Neighborhood',
    timestamp: Date.now() - 120 * 60000,
    resolved: false,
  },
  {
    id: 'seed_alert_4',
    type: 'utility',
    title: 'Power Outage',
    description: 'Scheduled power maintenance from 2 AM to 5 AM. Backup generators will be active for common areas.',
    location: 'Sectors A, B, C',
    timestamp: Date.now() - 180 * 60000,
    resolved: false,
  },
  {
    id: 'seed_alert_5',
    type: 'utility',
    title: 'Water Supply Issue',
    description: 'Water supply has been restored. Thank you for your patience.',
    location: 'Sector D',
    timestamp: Date.now() - 86400000 * 2,
    resolved: true,
  },
];

const SEED_BUSINESSES: Business[] = [
  {
    id: 'seed_biz_1',
    name: 'Green Valley Cafe',
    category: 'Restaurants',
    rating: 4.8,
    reviewCount: 52,
    distance: '0.3 km',
    image: null,
    description: 'Artisanal coffee and fresh pastries in a cozy setting.',
    isOpen: true,
  },
  {
    id: 'seed_biz_2',
    name: 'Fresh Mart Grocery',
    category: 'Retail',
    rating: 4.5,
    reviewCount: 38,
    distance: '0.5 km',
    image: null,
    description: 'Fresh produce, organic goods, and daily essentials.',
    isOpen: true,
  },
  {
    id: 'seed_biz_3',
    name: 'Dr. Ahmed Clinic',
    category: 'Healthcare',
    rating: 4.9,
    reviewCount: 74,
    distance: '0.7 km',
    image: null,
    description: 'General physician and family medicine practice.',
    isOpen: false,
  },
  {
    id: 'seed_biz_4',
    name: 'FitLife Gym',
    category: 'Fitness',
    rating: 4.6,
    reviewCount: 41,
    distance: '0.4 km',
    image: null,
    description: 'Modern gym with personal training and group classes.',
    isOpen: true,
  },
  {
    id: 'seed_biz_5',
    name: 'Al-Huda Academy',
    category: 'Education',
    rating: 4.7,
    reviewCount: 29,
    distance: '1.2 km',
    image: null,
    description: 'After-school programs, tutoring, and enrichment classes.',
    isOpen: true,
  },
];

const SEED_LISTINGS: Listing[] = [
  {
    id: 'seed_list_1',
    title: 'Vintage Wooden Desk',
    price: 25000,
    image: null,
    category: 'Furniture',
    location: 'Block A',
    timestamp: Date.now() - 60 * 60000,
    condition: 'Like New',
  },
  {
    id: 'seed_list_2',
    title: 'Mountain Bike - Excellent Condition',
    price: 45000,
    image: null,
    category: 'Sports',
    location: 'Block C',
    timestamp: Date.now() - 180 * 60000,
    condition: 'Good',
  },
  {
    id: 'seed_list_3',
    title: 'MacBook Pro 2023',
    price: 180000,
    image: null,
    category: 'Electronics',
    location: 'Block B',
    timestamp: Date.now() - 300 * 60000,
    condition: 'Excellent',
  },
  {
    id: 'seed_list_4',
    title: 'Designer Sofa Set',
    price: 85000,
    image: null,
    category: 'Furniture',
    location: 'Block D',
    timestamp: Date.now() - 600 * 60000,
    condition: 'Good',
  },
  {
    id: 'seed_list_5',
    title: 'Children Story Books Bundle',
    price: 3500,
    image: null,
    category: 'Books',
    location: 'Block A',
    timestamp: Date.now() - 86400000,
    condition: 'Used',
  },
];

const SEED_LOST_FOUND: LostFoundItem[] = [
  {
    id: 'seed_lf_1',
    title: 'Lost Brown Wallet',
    type: 'lost',
    category: 'Wallet',
    description: 'Brown leather wallet with ID cards and cash. Last seen near Block B park.',
    location: 'Block B Park',
    timestamp: Date.now() - 60 * 60000,
    image: null,
  },
  {
    id: 'seed_lf_2',
    title: 'Missing Golden Retriever',
    type: 'lost',
    category: 'Pet',
    description: 'Male golden retriever named Max, wearing red collar with tags.',
    location: 'Main Gate Area',
    timestamp: Date.now() - 180 * 60000,
    image: null,
  },
  {
    id: 'seed_lf_3',
    title: 'Lost Keys - Car & House',
    type: 'lost',
    category: 'Keys',
    description: 'Set of 3 keys on a blue keychain. Includes car key fob.',
    location: 'Community Center',
    timestamp: Date.now() - 300 * 60000,
    image: null,
  },
  {
    id: 'seed_lf_4',
    title: 'iPhone 15 Pro - Gold',
    type: 'lost',
    category: 'Electronics',
    description: 'Gold iPhone 15 Pro in a clear case. Last seen near Block D.',
    location: 'Block D Parking',
    timestamp: Date.now() - 600 * 60000,
    image: null,
  },
  {
    id: 'seed_lf_5',
    title: 'Found House Keys',
    type: 'found',
    category: 'Keys',
    description: 'Found a set of keys near the playground. Identify to claim.',
    location: 'Playground',
    timestamp: Date.now() - 120 * 60000,
    image: null,
  },
  {
    id: 'seed_lf_6',
    title: 'Found Blue Water Bottle',
    type: 'found',
    category: 'Accessory',
    description: 'Blue metal water bottle found at the community center after the meeting.',
    location: 'Community Center',
    timestamp: Date.now() - 240 * 60000,
    image: null,
  },
  {
    id: 'seed_lf_7',
    title: 'Found Prescription Glasses',
    type: 'found',
    category: 'Accessory',
    description: 'Black rimmed prescription glasses found on bench near Block A.',
    location: 'Block A Garden',
    timestamp: Date.now() - 480 * 60000,
    image: null,
  },
];

const SEED_NOTIFICATIONS: NotificationItem[] = [
  { id: 'seed_notif_1', type: 'like', title: 'Ayesha Khan liked your post', body: '"Community cleanup drive this Saturday!"', timestamp: '2m ago', isUnread: true, date: 'Today' },
  { id: 'seed_notif_2', type: 'comment', title: 'Imran Ali commented on your post', body: 'I would love to join! Count me in.', timestamp: '15m ago', isUnread: true, date: 'Today' },
  { id: 'seed_notif_3', type: 'alert', title: 'Emergency Alert: Power Outage', body: 'Scheduled maintenance in Sector B from 2-4 PM.', timestamp: '1h ago', isUnread: true, date: 'Today' },
  { id: 'seed_notif_4', type: 'follow', title: 'Zara Hassan started following you', body: '', timestamp: '2h ago', isUnread: false, date: 'Today' },
  { id: 'seed_notif_5', type: 'like', title: 'Usman Malik liked your post', body: '"Looking for a reliable plumber in the neighborhood"', timestamp: '5h ago', isUnread: false, date: 'Yesterday' },
  { id: 'seed_notif_6', type: 'comment', title: 'Fatima Noor replied to your comment', body: 'I can recommend someone. Let me DM you the details.', timestamp: '8h ago', isUnread: false, date: 'Yesterday' },
  { id: 'seed_notif_7', type: 'alert', title: 'Community Meeting Reminder', body: 'Monthly community meeting at 7 PM in the hall.', timestamp: '12h ago', isUnread: false, date: 'Yesterday' },
  { id: 'seed_notif_8', type: 'like', title: 'Omar Farooq liked your post', body: '"Yoga session in the park every Sunday morning"', timestamp: '2d ago', isUnread: false, date: 'This Week' },
];

const SEED_ADMIN_PENDING: AdminPending[] = [
  { id: 'seed_pend_1', name: 'Usman Khan', address: 'Block C, House 42', phone: '+92 300 1234567' },
  { id: 'seed_pend_2', name: 'Zainab Ali', address: 'Block A, Flat 7B', phone: '+92 321 9876543' },
  { id: 'seed_pend_3', name: 'Tariq Mehmood', address: 'Block D, House 15', phone: '+92 333 4567890' },
];

const SEED_ADMIN_REPORTS: AdminReport[] = [
  { id: 'seed_rpt_1', author: 'Sara Khan', reason: 'Inappropriate content', reportedBy: 3, preview: 'This is a suspicious post...' },
  { id: 'seed_rpt_2', author: 'Anonymous User', reason: 'Spam / Misleading', reportedBy: 5, preview: 'Click here to claim free...' },
];

/* ------------------------------------------------------------------ */
/*  seedIfEmpty — runs once on first launch                           */
/* ------------------------------------------------------------------ */

export async function seedIfEmpty(): Promise<void> {
  try {
    const alreadySeeded = await AsyncStorage.getItem(STORAGE_KEYS.SEED_DONE);
    if (alreadySeeded === 'true') return;

    // Only seed if storage is empty (fresh install)
    const existingPosts = await getPosts();
    if (existingPosts.length > 0) return;

    await Promise.all([
      setAll(STORAGE_KEYS.POSTS, SEED_POSTS),
      setAll(STORAGE_KEYS.COMMENTS, SEED_COMMENTS),
      setAll(STORAGE_KEYS.CHATS, SEED_CHATS),
      setAll(STORAGE_KEYS.MESSAGES, SEED_MESSAGES),
      setAll(STORAGE_KEYS.CHAT_REQUESTS, SEED_CHAT_REQUESTS),
      setAll(STORAGE_KEYS.EVENTS, [...SEED_EVENTS, ...SEED_PAST_EVENTS]),
      setAll(STORAGE_KEYS.POLLS, SEED_POLLS),
      setAll(STORAGE_KEYS.ALERTS, SEED_ALERTS),
      setAll(STORAGE_KEYS.BUSINESSES, SEED_BUSINESSES),
      setAll(STORAGE_KEYS.LISTINGS, SEED_LISTINGS),
      setAll(STORAGE_KEYS.LOST_FOUND, SEED_LOST_FOUND),
      setAll(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS),
      setAll(STORAGE_KEYS.ADMIN_PENDING, SEED_ADMIN_PENDING),
      setAll(STORAGE_KEYS.ADMIN_REPORTS, SEED_ADMIN_REPORTS),
    ]);

    await AsyncStorage.setItem(STORAGE_KEYS.SEED_DONE, 'true');
    console.log('[DataService] Seed data installed successfully');
  } catch (err) {
    console.error('[DataService] Seed failed:', err);
  }
}
