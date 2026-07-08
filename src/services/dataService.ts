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
  orderBy,
  onSnapshot,
  increment,
  arrayUnion,
  arrayRemove,
  writeBatch,
  limit,
  startAfter,
} from 'firebase/firestore';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';

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
  neighborhoodId?: string;
  neighborhoodName?: string;
  images?: string[];
  compressedUris?: string[];
  reportCount?: number;
  hidden?: boolean;
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
  type: 'text' | 'image' | 'voice' | 'location' | 'post' | 'video';
  content: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: string;
  forwardedFrom?: string;
  reactions?: Record<string, string>;
  createdAt: number;
  // Media
  mediaUrl?: string;
  mediaWidth?: number;
  mediaHeight?: number;
  // Voice
  voiceDuration?: number;
  voiceWaveform?: number[];
  // Location
  locationLat?: number;
  locationLng?: number;
  locationName?: string;
  // Shared post
  sharedPostId?: string;
  sharedPostPreview?: string;
  // Deletion
  deletedFor?: string[];
  deletedAt?: number;
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
  disappearingMode: 'off' | '24h' | '7d';
  pinned: boolean;
  pinnedBy?: Record<string, boolean>;
  type: 'individual' | 'group';
  groupName?: string;
  groupPhoto?: string;
  groupAdmin?: string;
  typing: Record<string, number>;
  muted: Record<string, boolean>;
  isMuted: boolean;
}

export interface ChatRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
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
  latitude?: number;
  longitude?: number;
  image: string | null;
  coverPhoto?: string | null;
  attendees: { name: string; role: 'admin' | 'resident' | 'business' | 'superAdmin'; avatar?: string }[];
  attendeeCount: number;
  rsvp: 'going' | 'interested' | null;
  createdBy?: string;
  createdById?: string;
  description?: string;
  maxAttendees?: number;
  category?: 'social' | 'sports' | 'religious' | 'cleanup' | 'emergency' | 'other';
  neighborhoodId?: string;
  createdAt?: number;
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
  voters: Record<string, string>; // userId → optionId
  isPinned: boolean;
  pinnedAt?: number;
  isAdmin: boolean;
  expiresAt: number;
  createdBy: string;
  createdById: string;
  anonymous: boolean;
  createdAt: number;
}

export interface Alert {
  id: string;
  type: string;
  title: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  createdBy?: string;
  reportedByName?: string;
  neighborhoodId?: string;
}

export interface BusinessHours {
  day: string;
  open: string;
  close: string;
}

export interface Business {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  distance: string;
  image: string | null;
  photos?: string[];
  description: string;
  isOpen: boolean;
  phone?: string;
  website?: string;
  email?: string;
  location?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  hours?: BusinessHours[];
  ownerId?: string;
  ownerName?: string;
  verified?: boolean;
  viewCount?: number;
  totalReviews?: number;
  averageRating?: number;
  inquiryCount?: number;
  neighborhoodId?: string;
  createdAt?: number;
}

export interface BusinessReview {
  id: string;
  businessId: string;
  authorName: string;
  authorAvatar?: string;
  authorId?: string;
  rating: number;
  text: string;
  timestamp: number;
}

export interface Listing {
  id: string;
  title: string;
  price: number;
  image: string | null;
  images?: string[];
  category: string;
  location: string;
  latitude?: number;
  longitude?: number;
  timestamp: number;
  condition: string;
  sellerName?: string;
  sellerId?: string;
  sellerAvatar?: string;
  description?: string;
  status?: 'available' | 'reserved' | 'sold';
  viewCount?: number;
  savedBy?: string[];
}

export interface LostFoundItem {
  id: string;
  title: string;
  type: 'lost' | 'found';
  category: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  timestamp: number;
  image: string | null;
  reporterName?: string;
  reporterId?: string;
  reporterAvatar?: string;
  resolved?: boolean;
  resolvedAt?: number;
  expiresAt?: number;
  contactMethod?: 'dm' | 'phone';
  phone?: string;
  neighborhoodId?: string;
}

export interface PostReport {
  id: string;
  postId: string;
  reportedBy: string;
  reportedByName: string;
  reason: 'spam' | 'inappropriate' | 'dangerous' | 'fake' | 'other';
  description?: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  action?: 'removed' | 'restored';
}

export interface UserReport {
  id: string;
  reportedUserId: string;
  reportedUserName: string;
  reportedBy: string;
  reportedByName: string;
  reason: 'spam' | 'harassment' | 'fake' | 'dangerous' | 'other';
  description?: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  action?: 'warned' | 'suspended' | 'banned' | 'cleared';
}

export interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'alert' | 'follow' | 'friend_request' | 'friend_accepted' | 'message' | 'call';
  title: string;
  body: string;
  timestamp: string;
  isUnread: boolean;
  date: string;
  fromUserId?: string;
  targetId?: string;
  recipientId?: string;
}

export interface AdminPending {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userAvatar?: string;
  streetAddress: string;
  area: string;
  city: string;
  latitude: number;
  longitude: number;
  geohash: string;
  status: 'pending' | 'approved' | 'rejected';
  adminId?: string;
  adminNote?: string;
  createdAt: number;
  resolvedAt?: number;
}

export interface AdminReport {
  id: string;
  author: string;
  reason: string;
  reportedBy: number;
  preview: string;
}

/* ------------------------------------------------------------------ */
/*  Connection types (neighbor / follow)                                */
/* ------------------------------------------------------------------ */

export type ConnectionType = 'neighbor' | 'follow' | 'friend';
export type ConnectionStatus = 'pending' | 'accepted' | 'blocked';

export interface Connection {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: ConnectionType;
  status: ConnectionStatus;
  createdAt: number;
  updatedAt: number;
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

/** Update a single message (reactions, deletion, status, etc.) */
export async function updateMessage(
  chatId: string,
  messageId: string,
  updates: Partial<ChatMessage>
): Promise<void> {
  // Update local cache
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (raw) {
      const msgs: ChatMessage[] = JSON.parse(raw);
      const idx = msgs.findIndex((m) => m.id === messageId && m.chatId === chatId);
      if (idx !== -1) {
        msgs[idx] = { ...msgs[idx], ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(msgs));
      }
    }
  } catch {}

  // Update Firestore
  try {
    await setDoc(doc(db, 'chats', chatId, 'messages', messageId), updates, { merge: true });
  } catch (err: any) {
    if (err.code !== 'unavailable') console.error('[DS] updateMessage error:', err);
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
    disappearingMode: 'off',
    pinned: false,
    type: 'individual',
    typing: {},
    muted: {},
    isMuted: false,
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
      const users = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as unknown as UserData));
      await setAll(STORAGE_KEYS.USERS, users).catch(() => {});
      return users;
    }
  } catch {}
  const all = await getAll<{ id: string }>(STORAGE_KEYS.USERS);
  return all.map((u) => ({ uid: u.id, ...u } as unknown as UserData));
}

export async function getUserById(id: string): Promise<UserData | null> {
  try {
    const snapshot = await getDoc(doc(db, 'users', id));
    if (snapshot.exists()) {
      const user = { uid: snapshot.id, ...snapshot.data() } as unknown as UserData;
      return user;
    }
  } catch {}
  const cached = await getById<{ id: string }>(STORAGE_KEYS.USERS, id);
  return cached ? ({ uid: cached.id, ...cached } as unknown as UserData) : null;
}

/** Real-time listener: search users by email fragment (Firestore range query). */
export function listenUsersByEmail(
  emailFragment: string,
  callback: (users: UserData[]) => void
): () => void {
  if (!emailFragment.trim()) {
    callback([]);
    return () => {};
  }
  try {
    const lower = emailFragment.toLowerCase();
    const upper = lower.replace(/.$/, (c) => String.fromCharCode(c.charCodeAt(0) + 1));
    const q = query(
      collection(db, 'users'),
      where('email', '>=', lower),
      where('email', '<', upper),
      where('searchableByEmail', '==', true)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const users = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as unknown as UserData));
        callback(users);
      },
      () => {
        callback([]);
      }
    );
  } catch {
    callback([]);
    return () => {};
  }
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

export function listenEvents(callback: (events: Event[]) => void): () => void {
  const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
      callback(items);
    },
    (err) => {
      console.warn('[DataService] listenEvents error:', err);
    }
  );
}

export async function updateRsvp(
  eventId: string,
  userId: string,
  userName: string,
  status: 'going' | 'interested' | null,
  userAvatar?: string
): Promise<void> {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) return;

    const eventData = eventSnap.data() as Event;
    let attendees = eventData.attendees || [];
    const existingIdx = attendees.findIndex((a) => a.name === userName);

    if (status === null) {
      // Remove RSVP
      if (existingIdx >= 0) {
        attendees.splice(existingIdx, 1);
      }
      await updateDoc(eventRef, {
        attendees,
        attendeeCount: attendees.length,
        [`rsvps.${userId}`]: null,
      });
    } else {
      if (existingIdx >= 0) {
        attendees[existingIdx] = { name: userName, role: 'resident', avatar: userAvatar };
      } else {
        attendees.push({ name: userName, role: 'resident', avatar: userAvatar });
      }
      await updateDoc(eventRef, {
        attendees,
        attendeeCount: attendees.length,
        [`rsvps.${userId}`]: status,
      });
    }

    // Update AsyncStorage cache
    await updateItem(STORAGE_KEYS.EVENTS, eventId, { attendees, attendeeCount: attendees.length });
  } catch (err) {
    console.warn('[DataService] updateRsvp failed:', err);
  }
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

export function listenPolls(callback: (polls: Poll[]) => void): () => void {
  const q = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const polls = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Poll));
      callback(polls);
    },
    (err) => {
      console.warn('[DataService] listenPolls error:', err);
    }
  );
}

export async function updatePoll(id: string, updates: Partial<Poll>): Promise<void> {
  try {
    await updateDoc(doc(db, 'polls', id), updates as Record<string, any>);
  } catch (err) {
    console.warn('[DataService] updatePoll failed:', err);
  }
  await updateItem(STORAGE_KEYS.POLLS, id, updates).catch(() => {});
}

/* ------------------------------------------------------------------ */
/*  Report helpers                                                      */
/* ------------------------------------------------------------------ */

export async function reportPost(
  postId: string,
  reason: PostReport['reason'],
  reportedBy: string,
  reportedByName: string,
  description?: string
): Promise<void> {
  const report: PostReport = {
    id: `rpt_${Date.now()}`,
    postId,
    reportedBy,
    reportedByName,
    reason,
    description,
    timestamp: Date.now(),
    resolved: false,
  };
  await fsSet('post_reports', report);
  // Increment reportCount on post
  try {
    await updateDoc(doc(db, 'posts', postId), { reportCount: increment(1) });
    // Check if >= 3 → auto-hide
    const snap = await getDoc(doc(db, 'posts', postId));
    if (snap.exists()) {
      const post = snap.data() as Post;
      if ((post.reportCount || 0) >= 3) {
        await updateDoc(doc(db, 'posts', postId), { hidden: true });
        // FCM push to admin would go here
      }
    }
  } catch (err) {
    console.warn('[DataService] reportPost increment failed:', err);
  }
}

export function listenPostReports(callback: (reports: PostReport[]) => void): () => void {
  const q = query(collection(db, 'post_reports'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PostReport));
    callback(reports);
  }, (err) => console.warn('[DataService] listenPostReports error:', err));
}

export async function resolvePostReport(
  reportId: string,
  postId: string,
  action: 'removed' | 'restored'
): Promise<void> {
  try {
    await updateDoc(doc(db, 'post_reports', reportId), {
      resolved: true,
      resolvedAt: Date.now(),
      action,
    });
    if (action === 'removed') {
      await updateDoc(doc(db, 'posts', postId), { hidden: true });
    } else if (action === 'restored') {
      await updateDoc(doc(db, 'posts', postId), { hidden: false, reportCount: 0 });
    }
  } catch (err) {
    console.warn('[DataService] resolvePostReport failed:', err);
  }
}

export async function reportUser(
  reportedUserId: string,
  reportedUserName: string,
  reason: UserReport['reason'],
  reportedBy: string,
  reportedByName: string,
  description?: string
): Promise<void> {
  const report: UserReport = {
    id: `urpt_${Date.now()}`,
    reportedUserId,
    reportedUserName,
    reportedBy,
    reportedByName,
    reason,
    description,
    timestamp: Date.now(),
    resolved: false,
  };
  await fsSet('user_reports', report);
}

export function listenUserReports(callback: (reports: UserReport[]) => void): () => void {
  const q = query(collection(db, 'user_reports'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UserReport));
    callback(reports);
  }, (err) => console.warn('[DataService] listenUserReports error:', err));
}

export async function resolveUserReport(
  reportId: string,
  action: UserReport['action']
): Promise<void> {
  try {
    await updateDoc(doc(db, 'user_reports', reportId), {
      resolved: true,
      resolvedAt: Date.now(),
      action,
    });
  } catch (err) {
    console.warn('[DataService] resolveUserReport failed:', err);
  }
}

export async function blockUser(currentUserId: string, targetUserId: string): Promise<void> {
  try {
    // Add to current user's blockedUsers
    await updateDoc(doc(db, 'users', currentUserId), {
      blockedUsers: arrayUnion(targetUserId),
    });
    // Add to target user's blockedUsers
    await updateDoc(doc(db, 'users', targetUserId), {
      blockedUsers: arrayUnion(currentUserId),
    });
  } catch (err) {
    console.warn('[DataService] blockUser failed:', err);
  }
}

export async function unblockUser(currentUserId: string, targetUserId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', currentUserId), {
      blockedUsers: arrayRemove(targetUserId),
    });
    await updateDoc(doc(db, 'users', targetUserId), {
      blockedUsers: arrayRemove(currentUserId),
    });
  } catch (err) {
    console.warn('[DataService] unblockUser failed:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Search helpers                                                      */
/* ------------------------------------------------------------------ */

export async function searchUsersByEmail(
  emailFragment: string,
  currentUserId: string
): Promise<UserData[]> {
  try {
    const q = query(
      collection(db, 'users'),
      where('searchableByEmail', '==', true),
      orderBy('email'),
      startAfter(emailFragment.toLowerCase()),
      limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ ...d.data(), uid: d.id } as UserData))
      .filter((u) => u.uid !== currentUserId)
      .filter((u) => u.email?.toLowerCase().includes(emailFragment.toLowerCase()));
  } catch {
    return [];
  }
}

export async function searchUsersByName(
  nameFragment: string,
  currentUserId: string
): Promise<UserData[]> {
  try {
    const q = query(
      collection(db, 'users'),
      orderBy('name'),
      startAfter(nameFragment.toLowerCase()),
      limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ ...d.data(), uid: d.id } as UserData))
      .filter((u) => u.uid !== currentUserId)
      .filter((u) => u.name?.toLowerCase().includes(nameFragment.toLowerCase()));
  } catch {
    return [];
  }
}

export async function searchPostsByKeyword(keyword: string): Promise<Post[]> {
  try {
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as Post))
      .filter(
        (p) =>
          p.content?.toLowerCase().includes(keyword.toLowerCase()) ||
          p.category?.toLowerCase().includes(keyword.toLowerCase())
      );
  } catch {
    return [];
  }
}

export async function searchBusinessesByKeyword(keyword: string): Promise<Business[]> {
  try {
    const q = query(collection(db, 'businesses'), orderBy('createdAt', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as Business))
      .filter(
        (b) =>
          b.name?.toLowerCase().includes(keyword.toLowerCase()) ||
          b.category?.toLowerCase().includes(keyword.toLowerCase())
      );
  } catch {
    return [];
  }
}

export async function searchEventsByTitle(keyword: string): Promise<Event[]> {
  try {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as Event))
      .filter((e) => e.title?.toLowerCase().includes(keyword.toLowerCase()));
  } catch {
    return [];
  }
}

export async function searchListingsByTitle(keyword: string): Promise<Listing[]> {
  try {
    const q = query(collection(db, 'listings'), orderBy('timestamp', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as Listing))
      .filter((l) => l.title?.toLowerCase().includes(keyword.toLowerCase()));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Reputation helpers                                                  */
/* ------------------------------------------------------------------ */

export const REPUTATION_POINTS: Record<string, number> = {
  create_post: 5,
  receive_like: 1,
  receive_helpful: 3,
  attend_event: 5,
  verify_address: 20,
  accept_friend: 3,
  post_saved: 2,
  business_review: 4,
};

export function getReputationTier(score: number): 'bronze' | 'silver' | 'gold' {
  if (score >= 500) return 'gold';
  if (score >= 100) return 'silver';
  return 'bronze';
}

export function getTierProgress(score: number): { current: number; next: number; progress: number } {
  if (score >= 500) return { current: 500, next: 500, progress: 1 };
  if (score >= 100) {
    const currentTier = score - 100;
    const nextTier = 400;
    return { current: 100, next: 500, progress: Math.min(1, currentTier / nextTier) };
  }
  const progress = score / 100;
  return { current: 0, next: 100, progress: Math.min(1, progress) };
}

export async function addReputationPoints(userId: string, reason: string): Promise<void> {
  const points = REPUTATION_POINTS[reason];
  if (!points) return;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      reputationScore: increment(points),
    });
  } catch (err) {
    console.warn('[DataService] addReputationPoints failed:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Admin / Neighborhood stats helpers                                  */
/* ------------------------------------------------------------------ */

export async function getNeighborhoodStats(neighborhoodId: string): Promise<{
  totalMembers: number;
  postsToday: number;
  activeAlerts: number;
}> {
  const stats = { totalMembers: 0, postsToday: 0, activeAlerts: 0 };
  try {
    const usersSnap = await getDocs(query(collection(db, 'users'), where('neighborhoodId', '==', neighborhoodId)));
    stats.totalMembers = usersSnap.size;
  } catch {}
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const postsSnap = await getDocs(query(collection(db, 'posts'), where('neighborhoodId', '==', neighborhoodId), where('timestamp', '>=', todayStart.getTime())));
    stats.postsToday = postsSnap.size;
  } catch {}
  try {
    const alertsSnap = await getDocs(query(collection(db, 'alerts'), where('neighborhoodId', '==', neighborhoodId), where('resolved', '==', false)));
    stats.activeAlerts = alertsSnap.size;
  } catch {}
  return stats;
}

export async function getPlatformStats(): Promise<{
  totalUsers: number;
  totalNeighborhoods: number;
  totalPosts: number;
}> {
  const stats = { totalUsers: 0, totalNeighborhoods: 0, totalPosts: 0 };
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    stats.totalUsers = usersSnap.size;
  } catch {}
  try {
    const nbSnap = await getDocs(collection(db, 'neighborhoods'));
    stats.totalNeighborhoods = nbSnap.size;
  } catch {}
  try {
    const postsSnap = await getDocs(collection(db, 'posts'));
    stats.totalPosts = postsSnap.size;
  } catch {}
  return stats;
}

export async function approveBusiness(businessId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'businesses', businessId), { verified: true });
  } catch (err) {
    console.warn('[DataService] approveBusiness failed:', err);
  }
}

export async function rejectBusiness(businessId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'businesses', businessId), { verified: false });
  } catch (err) {
    console.warn('[DataService] rejectBusiness failed:', err);
  }
}

export async function banUser(userId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), { role: 'banned', blockedUsers: ['*'] });
  } catch (err) {
    console.warn('[DataService] banUser failed:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Offline support helpers                                             */
/* ------------------------------------------------------------------ */

export function checkOnlineStatus(): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 3000);
    fetch('https://firestore.googleapis.com/v1/projects', { method: 'HEAD' })
      .then(() => { clearTimeout(timeout); resolve(true); })
      .catch(() => { clearTimeout(timeout); resolve(false); });
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

export async function resolveAlert(id: string, resolvedBy?: string): Promise<void> {
  const update: Record<string, any> = { resolved: true, resolvedAt: Date.now() };
  if (resolvedBy) update.resolvedBy = resolvedBy;
  await updateItem(STORAGE_KEYS.ALERTS, id, update);
  await fsUpdate('alerts', id, update);
}

export function listenAlerts(callback: (alerts: Alert[]) => void): () => void {
  const q = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const alerts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Alert));
      callback(alerts);
    },
    (err) => {
      console.warn('[DataService] listenAlerts error:', err);
    }
  );
}

export async function sendAlertToNeighborhood(
  neighborhoodId: string,
  title: string,
  body: string,
  excludeUid?: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    const q = query(collection(db, 'users'), where('neighborhoodId', '==', neighborhoodId));
    const snapshot = await getDocs(q);
    const allTokens: string[] = [];
    for (const userDoc of snapshot.docs) {
      const uid = userDoc.id;
      if (uid === excludeUid) continue;
      const tokensSnapshot = await getDocs(collection(db, 'users', uid, 'tokens'));
      tokensSnapshot.forEach((t) => {
        const token = t.data().token as string;
        if (token) allTokens.push(token);
      });
    }
    if (allTokens.length === 0) return;
    for (let i = 0; i < allTokens.length; i += 100) {
      const batch = allTokens.slice(i, i + 100);
      const messages = batch.map((token) => ({
        to: token,
        sound: 'default' as const,
        title,
        body,
        data: data ?? {},
      }));
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
    }
  } catch (err) {
    console.warn('[DataService] sendAlertToNeighborhood failed:', err);
  }
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

export function listenBusinesses(callback: (businesses: Business[]) => void): () => void {
  const q = query(collection(db, 'businesses'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Business));
      callback(items);
    },
    (err) => {
      console.warn('[DataService] listenBusinesses error:', err);
    }
  );
}

export async function saveBusiness(business: Business): Promise<void> {
  await fsSet('businesses', business);
}

export async function incrementBusinessView(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'businesses', id), { viewCount: increment(1) });
  } catch (err) {
    console.warn('[DataService] incrementBusinessView failed:', err);
  }
}

export async function incrementBusinessInquiry(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'businesses', id), { inquiryCount: increment(1) });
  } catch (err) {
    console.warn('[DataService] incrementBusinessInquiry failed:', err);
  }
}

export async function saveReview(review: BusinessReview): Promise<void> {
  await fsSet('business_reviews', review);
  // Update business average rating
  try {
    const q = query(collection(db, 'business_reviews'), where('businessId', '==', review.businessId));
    const snapshot = await getDocs(q);
    const allReviews = snapshot.docs.map((d) => d.data() as BusinessReview);
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avg = allReviews.length > 0 ? Math.round((totalRating / allReviews.length) * 10) / 10 : 0;
    await updateDoc(doc(db, 'businesses', review.businessId), {
      averageRating: avg,
      totalReviews: allReviews.length,
      rating: avg,
      reviewCount: allReviews.length,
    });
  } catch (err) {
    console.warn('[DataService] saveReview update stats failed:', err);
  }
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

export function listenListings(callback: (listings: Listing[]) => void): () => void {
  const q = query(collection(db, 'listings'), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Listing));
      callback(items);
    },
    (err) => {
      console.warn('[DataService] listenListings error:', err);
    }
  );
}

export async function updateListingStatus(
  id: string,
  status: 'available' | 'reserved' | 'sold'
): Promise<void> {
  await updateItem(STORAGE_KEYS.LISTINGS, id, { status });
  await fsUpdate('listings', id, { status });
}

export async function incrementListingViews(id: string): Promise<void> {
  try {
    const ref = doc(db, 'listings', id);
    await updateDoc(ref, { viewCount: increment(1) });
  } catch (err) {
    console.warn('[DataService] incrementListingViews failed:', err);
  }
}

export async function toggleSaveListing(
  listingId: string,
  userId: string,
  currentlySaved: boolean
): Promise<void> {
  try {
    const ref = doc(db, 'listings', listingId);
    if (currentlySaved) {
      await updateDoc(ref, { savedBy: arrayRemove(userId) });
    } else {
      await updateDoc(ref, { savedBy: arrayUnion(userId) });
    }
  } catch (err) {
    console.warn('[DataService] toggleSaveListing failed:', err);
  }
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

export function listenLostFound(callback: (items: LostFoundItem[]) => void): () => void {
  const q = query(collection(db, 'lost_found'), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LostFoundItem));
      callback(items);
    },
    (err) => {
      console.warn('[DataService] listenLostFound error:', err);
    }
  );
}

export async function resolveLostFound(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'lost_found', id), { resolved: true, resolvedAt: Date.now() });
  } catch (err) {
    console.warn('[DataService] resolveLostFound failed:', err);
  }
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

export function listenNotifications(recipientId: string, callback: (notifications: NotificationItem[]) => void): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', recipientId),
    orderBy('timestamp', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationItem));
      callback(items);
    },
    (err) => {
      console.warn('[DataService] listenNotifications error:', err);
    }
  );
}

export async function deleteNotification(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (e) {
    console.warn('[DataService] deleteNotification failed:', e);
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
/*  Verification request helpers                                       */
/* ------------------------------------------------------------------ */

/** Create a new verification request in Firestore. */
export async function createVerificationRequest(
  request: VerificationRequest
): Promise<void> {
  try {
    await setDoc(doc(db, 'verification_requests', request.id), clean(request));
  } catch (err) {
    console.warn('[DataService] createVerificationRequest failed:', err);
  }
}

/** Get all pending verification requests. */
export async function getPendingVerifications(): Promise<VerificationRequest[]> {
  try {
    const q = query(
      collection(db, 'verification_requests'),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const requests = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as VerificationRequest)
      );
      requests.sort((a, b) => b.createdAt - a.createdAt);
      return requests;
    }
  } catch (err) {
    console.warn('[DataService] getPendingVerifications failed:', err);
  }
  return [];
}

/** Get a single verification request by ID. */
export async function getVerificationRequest(
  id: string
): Promise<VerificationRequest | null> {
  try {
    const snapshot = await getDoc(doc(db, 'verification_requests', id));
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as VerificationRequest;
    }
  } catch {}
  return null;
}

/** Approve a verification request. Updates Firestore and returns true on success. */
export async function approveVerification(
  requestId: string,
  adminId: string,
  adminNote?: string
): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'verification_requests', requestId), {
      status: 'approved',
      adminId,
      adminNote: adminNote || '',
      resolvedAt: Date.now(),
    });
    return true;
  } catch (err) {
    console.warn('[DataService] approveVerification failed:', err);
    return false;
  }
}

/** Reject a verification request. Updates Firestore and returns true on success. */
export async function rejectVerification(
  requestId: string,
  adminId: string,
  adminNote?: string
): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'verification_requests', requestId), {
      status: 'rejected',
      adminId,
      adminNote: adminNote || '',
      resolvedAt: Date.now(),
    });
    return true;
  } catch (err) {
    console.warn('[DataService] rejectVerification failed:', err);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Connection helpers (neighbor / follow)                               */
/* ------------------------------------------------------------------ */

export function listenUserConnections(
  userId: string,
  callback: (connections: Connection[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'connections'),
      where('fromUserId', '==', userId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const conns = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Connection));
        callback(conns);
      },
      (err) => {
        console.warn('[DataService] listenUserConnections error:', err);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('[DataService] listenUserConnections failed:', err);
    return () => {};
  }
}

export async function createConnection(conn: Connection): Promise<void> {
  await fsSet('connections', conn);
}

export async function updateConnectionStatus(
  id: string,
  status: ConnectionStatus
): Promise<void> {
  await fsUpdate('connections', id, { status, updatedAt: Date.now() });
}

export async function getConnectionBetweenUsers(
  fromUserId: string,
  toUserId: string
): Promise<Connection | null> {
  try {
    const q = query(
      collection(db, 'connections'),
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', toUserId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Connection;
    }
    // Check reverse direction
    const q2 = query(
      collection(db, 'connections'),
      where('fromUserId', '==', toUserId),
      where('toUserId', '==', fromUserId)
    );
    const snapshot2 = await getDocs(q2);
    if (!snapshot2.empty) {
      return { id: snapshot2.docs[0].id, ...snapshot2.docs[0].data() } as Connection;
    }
  } catch (err) {
    console.warn('[DataService] getConnectionBetweenUsers failed:', err);
  }
  return null;
}

export async function getConnectionsForUser(
  userId: string
): Promise<Connection[]> {
  try {
    const q = query(
      collection(db, 'connections'),
      where('fromUserId', '==', userId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Connection));
    }
  } catch (err) {
    console.warn('[DataService] getConnectionsForUser failed:', err);
  }
  return [];
}

/* ------------------------------------------------------------------ */
/*  Follow listeners & helpers                                         */
/* ------------------------------------------------------------------ */

/** Real-time listener: users this user is following (type === 'follow'). */
export function listenFollowing(
  userId: string,
  callback: (connections: Connection[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'connections'),
      where('fromUserId', '==', userId),
      where('type', '==', 'follow')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const conns = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Connection));
        callback(conns);
      },
      (err) => {
        console.warn('[DataService] listenFollowing error:', err);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('[DataService] listenFollowing failed:', err);
    return () => {};
  }
}

/** Real-time listener: this user's followers (type === 'follow'). */
export function listenFollowers(
  userId: string,
  callback: (connections: Connection[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'connections'),
      where('toUserId', '==', userId),
      where('type', '==', 'follow')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const conns = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Connection));
        callback(conns);
      },
      (err) => {
        console.warn('[DataService] listenFollowers error:', err);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('[DataService] listenFollowers failed:', err);
    return () => {};
  }
}

/* ------------------------------------------------------------------ */
/*  Friend listeners & helpers                                         */
/* ------------------------------------------------------------------ */

/** Real-time listener: incoming friend requests (status === 'pending'). */
export function listenFriendRequests(
  userId: string,
  callback: (connections: Connection[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'connections'),
      where('toUserId', '==', userId),
      where('type', '==', 'friend'),
      where('status', '==', 'pending')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const conns = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Connection));
        callback(conns);
      },
      (err) => {
        console.warn('[DataService] listenFriendRequests error:', err);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('[DataService] listenFriendRequests failed:', err);
    return () => {};
  }
}

/** Real-time listener: sent friend requests (from this user, type === 'friend'). */
export function listenFriendSentRequests(
  userId: string,
  callback: (connections: Connection[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'connections'),
      where('fromUserId', '==', userId),
      where('type', '==', 'friend')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const conns = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Connection));
        callback(conns);
      },
      (err) => {
        console.warn('[DataService] listenFriendSentRequests error:', err);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('[DataService] listenFriendSentRequests failed:', err);
    return () => {};
  }
}

/**
 * Real-time listener: accepted friend connections (both directions).
 * Merges results from two queries: where fromUserId==userId and where toUserId==userId.
 */
export function listenFriends(
  userId: string,
  callback: (connections: Connection[]) => void
): () => void {
  const unsubscribes: (() => void)[] = [];

  try {
    const q1 = query(
      collection(db, 'connections'),
      where('fromUserId', '==', userId),
      where('type', '==', 'friend'),
      where('status', '==', 'accepted')
    );

    const unsub1 = onSnapshot(
      q1,
      (snapshot) => {
        const fromConns = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Connection));
        // Re-run combined callback with current fromConns + latest toConns
        // We'll track toConns separately and call callback with merged array
        if (typeof unsub2 !== 'undefined') {
          callback(mergedFriends(userId, fromConns, _toCache));
        }
      },
      (err) => {
        console.warn('[DataService] listenFriends q1 error:', err);
        callback([]);
      }
    );
    unsubscribes.push(unsub1);

    const q2 = query(
      collection(db, 'connections'),
      where('toUserId', '==', userId),
      where('type', '==', 'friend'),
      where('status', '==', 'accepted')
    );

    let _toCache: Connection[] = [];

    const unsub2 = onSnapshot(
      q2,
      (snapshot) => {
        _toCache = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Connection));
        // Re-run combined with current fromConns (read from DOM or re-query)
        // We query q1 again to get latest fromConns
        getDocs(q1).then((s1) => {
          const fromConns = s1.docs.map((d) => ({ id: d.id, ...d.data() } as Connection));
          callback(mergedFriends(userId, fromConns, _toCache));
        }).catch(() => {});
      },
      (err) => {
        console.warn('[DataService] listenFriends q2 error:', err);
      }
    );
    unsubscribes.push(unsub2);
  } catch (err) {
    console.warn('[DataService] listenFriends failed:', err);
  }

  return () => {
    unsubscribes.forEach((fn) => fn());
  };
}

/** Merge two-direction friend lists into a single array of Connection objects. */
function mergedFriends(
  userId: string,
  fromConns: Connection[],
  toConns: Connection[]
): Connection[] {
  const map = new Map<string, Connection>();
  fromConns.forEach((c) => map.set(c.id, c));
  toConns.forEach((c) => map.set(c.id, c));
  return Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

/* ------------------------------------------------------------------ */
/*  User count helpers                                                 */
/* ------------------------------------------------------------------ */

/** Increment a numeric field on a user doc (followersCount, followingCount, etc.). */
export async function incrementUserCount(
  userId: string,
  field: string,
  delta: number
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      [field]: increment(delta),
    });
  } catch (err) {
    console.warn('[DataService] incrementUserCount failed:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Chat creation & update helpers                                     */
/* ------------------------------------------------------------------ */

/** Find an existing individual chat between two users. */
export async function findExistingChat(
  userId1: string,
  userId2: string
): Promise<Chat | null> {
  try {
    const snapshot = await getDocs(collection(db, 'chats'));
    const chats = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Chat));
    return chats.find(
      (c) =>
        c.type === 'individual' &&
        c.participants.includes(userId1) &&
        c.participants.includes(userId2)
    ) ?? null;
  } catch {
    return null;
  }
}

/** Create a new individual chat and return it. */
export async function createChat(
  userId1: string,
  userId2: string,
  name1: string,
  name2: string
): Promise<Chat> {
  const chatId = 'chat_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
  const now = Date.now();
  const chat: Chat = {
    id: chatId,
    participants: [userId1, userId2],
    participantNames: { [userId1]: name1, [userId2]: name2 },
    participantAvatars: {},
    lastMessage: '',
    lastTimestamp: now,
    unreadCount: 0,
    online: {},
    disappearingMode: 'off',
    pinned: false,
    type: 'individual',
    typing: {},
    muted: {},
    isMuted: false,
  };
  await saveChat(chat);
  return chat;
}

/** Generic chat update helper. */
export async function updateChat(
  chatId: string,
  updates: Partial<Chat>
): Promise<void> {
  await updateItem(STORAGE_KEYS.CHATS, chatId, updates);
  await fsUpdate('chats', chatId, updates);
}

/* ------------------------------------------------------------------ */
/*  Message status helpers                                             */
/* ------------------------------------------------------------------ */

/** Mark messages from a sender as 'delivered' when recipient receives them. */
export async function markMessagesAsDelivered(
  chatId: string,
  currentUserId: string,
  senderId: string
): Promise<void> {
  try {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      where('senderId', '==', senderId),
      where('status', '==', 'sent')
    );
    const snapshot = await getDocs(q);
    const batchUpdates = snapshot.docs.map((d) =>
      updateDoc(doc(db, 'messages', d.id), { status: 'delivered' })
    );
    await Promise.all(batchUpdates);
  } catch (err) {
    console.warn('[DataService] markMessagesAsDelivered failed:', err);
  }
}

/** Mark all 'delivered' messages in a chat as 'read' for the current user. */
export async function markMessagesAsRead(
  chatId: string,
  currentUserId: string
): Promise<void> {
  try {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      where('senderId', '!=', currentUserId),
      where('status', '==', 'delivered')
    );
    const snapshot = await getDocs(q);
    const batchUpdates = snapshot.docs.map((d) =>
      updateDoc(doc(db, 'messages', d.id), { status: 'read' })
    );
    await Promise.all(batchUpdates);
  } catch (err) {
    console.warn('[DataService] markMessagesAsRead failed:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Typing indicator helpers                                           */
/* ------------------------------------------------------------------ */

/** Set or clear typing status for a user in a chat. */
export async function setTypingStatus(
  chatId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  try {
    const path = `typing.${userId}`;
    if (isTyping) {
      await updateDoc(doc(db, 'chats', chatId), {
        [path]: Date.now(),
      });
    } else {
      await updateDoc(doc(db, 'chats', chatId), {
        [path]: 0,
      });
    }
  } catch (err) {
    console.warn('[DataService] setTypingStatus failed:', err);
  }
}

/** Listen for typing status changes on a chat. Returns unsubscribe function. */
export function listenTypingStatus(
  chatId: string,
  callback: (typing: Record<string, number>) => void
): () => void {
  try {
    return onSnapshot(
      doc(db, 'chats', chatId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          callback((data.typing as Record<string, number>) ?? {});
        } else {
          callback({});
        }
      },
      () => {
        callback({});
      }
    );
  } catch {
    callback({});
    return () => {};
  }
}

/* ------------------------------------------------------------------ */
/*  Bookmark message helpers                                           */
/* ------------------------------------------------------------------ */

/** Toggle a message as bookmarked/starred in AsyncStorage. */
export async function toggleBookmarkMessage(
  messageId: string,
  chatId: string
): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BOOKMARKED_MESSAGES);
    let bookmarks: string[] = raw ? JSON.parse(raw) : [];
    const idx = bookmarks.indexOf(messageId);
    if (idx !== -1) {
      bookmarks.splice(idx, 1);
      await AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKED_MESSAGES, JSON.stringify(bookmarks));
      return false; // unbookmarked
    } else {
      bookmarks.push(messageId);
      await AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKED_MESSAGES, JSON.stringify(bookmarks));
      return true; // bookmarked
    }
  } catch {
    return false;
  }
}

/** Get all bookmarked message IDs. */
export async function getBookmarkedMessageIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BOOKMARKED_MESSAGES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Group chat ops                                                     */
/* ------------------------------------------------------------------ */

/** Add members to a group chat. */
export async function addGroupMembers(
  chatId: string,
  newMemberIds: string[],
  participantNames: Record<string, string>,
  participantAvatars: Record<string, string>
): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const snapshot = await getDoc(chatRef);
    if (!snapshot.exists()) return;
    const data = snapshot.data();
    const existingParticipants: string[] = data.participants ?? [];
    const mergedParticipants = [...new Set([...existingParticipants, ...newMemberIds])];
    const mergedNames = { ...(data.participantNames ?? {}), ...participantNames };
    const mergedAvatars = { ...(data.participantAvatars ?? {}), ...participantAvatars };

    await updateDoc(chatRef, {
      participants: mergedParticipants,
      participantNames: mergedNames,
      participantAvatars: mergedAvatars,
    });

    // Update local cache
    await updateItem(STORAGE_KEYS.CHATS, chatId, {
      participants: mergedParticipants,
      participantNames: mergedNames,
      participantAvatars: mergedAvatars,
    });
  } catch (err) {
    console.warn('[DataService] addGroupMembers failed:', err);
  }
}

/** Remove a member from a group chat. */
export async function removeGroupMember(
  chatId: string,
  memberId: string
): Promise<void> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const snapshot = await getDoc(chatRef);
    if (!snapshot.exists()) return;
    const data = snapshot.data();
    const participants: string[] = data.participants ?? [];
    const filtered = participants.filter((p: string) => p !== memberId);

    await updateDoc(chatRef, {
      participants: filtered,
    });

    // Update local cache
    await updateItem(STORAGE_KEYS.CHATS, chatId, {
      participants: filtered,
    });
  } catch (err) {
    console.warn('[DataService] removeGroupMember failed:', err);
  }
}

/** Update group name and/or photo. */
export async function updateGroupInfo(
  chatId: string,
  updates: { groupName?: string; groupPhoto?: string }
): Promise<void> {
  await updateChat(chatId, updates);
}

/** Leave a group chat (remove self from participants). */
export async function leaveGroup(
  chatId: string,
  userId: string
): Promise<void> {
  await removeGroupMember(chatId, userId);
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
/*  Geo-based nearby users listener (geofire-common)                    */
/* ------------------------------------------------------------------ */

/**
 * Listen for users within a given radius using geohash bounds.
 * Returns an unsubscribe function. The callback receives users sorted
 * by distance (nearest first), each with a computed `distanceKm` field.
 */
export function listenNearbyUsers(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  excludeUid: string,
  callback: (users: (UserData & { distanceKm: number })[]) => void
): () => void {
  const unsubscribes: (() => void)[] = [];
  const seen = new Set<string>();

  try {
    const bounds = geohashQueryBounds([centerLat, centerLng], radiusKm);

    bounds.forEach(([start, end]) => {
      const q = query(
        collection(db, 'users'),
        where('geohash', '>=', start),
        where('geohash', '<=', end)
      );

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const all: (UserData & { distanceKm: number })[] = [];
          seen.clear();

          snapshot.docs.forEach((d) => {
            const uid = d.id;
            if (uid === excludeUid || seen.has(uid)) return;
            seen.add(uid);

            const data = d.data() as UserData;
            if (
              typeof data.latitude !== 'number' ||
              typeof data.longitude !== 'number'
            )
              return;

            const dist = distanceBetween(
              [data.latitude, data.longitude],
              [centerLat, centerLng]
            );
            // distanceBetween returns km already
            all.push({ ...(data as UserData), uid, distanceKm: dist });
          });

          all.sort((a, b) => a.distanceKm - b.distanceKm);
          callback(all);
        },
        (err) => {
          console.warn('[DataService] listenNearbyUsers bound error:', err);
        }
      );
      unsubscribes.push(unsub);
    });
  } catch (err) {
    console.warn('[DataService] listenNearbyUsers setup error:', err);
  }

  return () => {
    unsubscribes.forEach((fn) => fn());
  };
}

/* ------------------------------------------------------------------ */
/*  Neighborhood-filtered post listener                                 */
/* ------------------------------------------------------------------ */

export function listenNeighborhoodPosts(
  neighborhoodId: string,
  callback: (posts: Post[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'posts'),
      where('neighborhoodId', '==', neighborhoodId),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const posts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
        callback(posts);
      },
      (error) => {
        if (error.code === 'failed-precondition') {
          console.warn('[DataService] Missing composite index for listenNeighborhoodPosts');
        }
        getAll<Post>(STORAGE_KEYS.POSTS).then((all) => {
          const filtered = all.filter((p) => p.neighborhoodId === neighborhoodId);
          filtered.sort((a, b) => b.timestamp - a.timestamp);
          callback(filtered);
        }).catch(() => {});
      }
    );
  } catch {
    getAll<Post>(STORAGE_KEYS.POSTS).then((all) => {
      const filtered = all.filter((p) => p.neighborhoodId === neighborhoodId);
      filtered.sort((a, b) => b.timestamp - a.timestamp);
      callback(filtered);
    }).catch(() => {});
    return () => {};
  }
}

/* ------------------------------------------------------------------ */
/*  Posts-by-author-ids listener (for feed from neighbors/follows)      */
/* ------------------------------------------------------------------ */

export function listenPostsByAuthorIds(
  authorIds: string[],
  callback: (posts: Post[]) => void
): () => void {
  const unsubscribes: (() => void)[] = [];

  // Firestore 'in' queries max 10 values per call
  const chunkSize = 10;
  const chunks: string[][] = [];
  for (let i = 0; i < authorIds.length; i += chunkSize) {
    chunks.push(authorIds.slice(i, i + chunkSize));
  }

  chunks.forEach((chunk) => {
    try {
      const q = query(
        collection(db, 'posts'),
        where('authorId', 'in', chunk)
      );
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const posts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
          callback(posts);
        },
        () => {}
      );
      unsubscribes.push(unsub);
    } catch {
      // skip chunk
    }
  });

  return () => {
    unsubscribes.forEach((fn) => fn());
  };
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
    disappearingMode: 'off',
    pinned: true,
    type: 'individual',
    groupName: undefined,
    groupPhoto: undefined,
    groupAdmin: undefined,
    typing: {},
    muted: {},
    isMuted: false,
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
    disappearingMode: 'off',
    pinned: false,
    type: 'individual',
    groupName: undefined,
    groupPhoto: undefined,
    groupAdmin: undefined,
    typing: {},
    muted: {},
    isMuted: false,
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
    toUserId: 'seed_current_user',
    fromName: 'Hassan Raza',
    fromAvatar: '',
    status: 'pending',
    timestamp: Date.now() - 86400000,
  },
  {
    id: 'seed_req_2',
    fromUserId: 'seed_user_8',
    toUserId: 'seed_current_user',
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
    createdById: 'admin_1',
    anonymous: false,
    voters: { 'user_a': 'seed_opt_1a', 'user_b': 'seed_opt_1a' },
    createdAt: Date.now() - 86400000 * 3,
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
    createdById: 'admin_2',
    anonymous: false,
    voters: { 'user_c': 'seed_opt_2b', 'user_d': 'seed_opt_2a' },
    createdAt: Date.now() - 86400000 * 2,
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
    createdById: 'resident_1',
    anonymous: false,
    voters: { 'user_e': 'seed_opt_3a' },
    createdAt: Date.now() - 86400000 * 5,
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
    createdById: 'resident_2',
    anonymous: true,
    voters: { 'user_f': 'seed_opt_4a' },
    createdAt: Date.now() - 86400000 * 6,
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

/* ------------------------------------------------------------------ */
/*  User relationship arrays                                           */
/* ------------------------------------------------------------------ */

export type UserRelationArray =
  | 'following'
  | 'followers'
  | 'friends'
  | 'pendingRequests'
  | 'sentRequests'
  | 'blockedUsers';

export async function addToUserArray(
  userId: string,
  field: UserRelationArray,
  value: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), { [field]: arrayUnion(value) });
  } catch (err) {
    console.warn(`[DataService] addToUserArray ${field} failed:`, err);
  }
}

export async function removeFromUserArray(
  userId: string,
  field: UserRelationArray,
  value: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), { [field]: arrayRemove(value) });
  } catch (err) {
    console.warn(`[DataService] removeFromUserArray ${field} failed:`, err);
  }
}

export async function deleteConnection(id: string): Promise<void> {
  await fsDelete('connections', id);
}

/* ------------------------------------------------------------------ */
/*  Message requests                                                   */
/* ------------------------------------------------------------------ */

export async function createMessageRequest(
  fromUserId: string,
  toUserId: string,
  fromName: string,
  fromAvatar?: string
): Promise<ChatRequest> {
  const sortedIds = [fromUserId, toUserId].sort();
  const id = `msgreq_${sortedIds.join('_')}`;
  const request: ChatRequest = {
    id,
    fromUserId,
    toUserId,
    fromName,
    fromAvatar,
    status: 'pending',
    timestamp: Date.now(),
  };
  await fsSet('chat_requests', request);
  return request;
}

export async function acceptMessageRequest(
  request: ChatRequest,
  currentUserId: string,
  currentUserName: string,
  currentUserAvatar?: string
): Promise<Chat> {
  const otherUserId = request.fromUserId;
  const sortedIds = [currentUserId, otherUserId].sort();
  const chatId = sortedIds.join('_');

  const existing = await findExistingChat(currentUserId, otherUserId);
  if (existing) {
    await fsDelete('chat_requests', request.id);
    return existing;
  }

  const otherUser = await getUserById(otherUserId);
  const names: Record<string, string> = {
    [currentUserId]: currentUserName,
    [otherUserId]: otherUser?.name ?? request.fromName,
  };
  const avatars: Record<string, string> = {};
  if (currentUserAvatar) avatars[currentUserId] = currentUserAvatar;
  if (otherUser?.avatar) avatars[otherUserId] = otherUser.avatar;
  else if (request.fromAvatar) avatars[otherUserId] = request.fromAvatar;

  const chat: Chat = {
    id: chatId,
    participants: sortedIds,
    participantNames: names,
    participantAvatars: avatars,
    lastMessage: '',
    lastTimestamp: Date.now(),
    unreadCount: 0,
    online: {},
    disappearingMode: 'off',
    pinned: false,
    type: 'individual',
    typing: {},
    muted: {},
    isMuted: false,
  };
  await saveChat(chat);
  await fsDelete('chat_requests', request.id);
  return chat;
}

export function listenChatRequestsToUser(
  userId: string,
  callback: (requests: ChatRequest[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'chat_requests'),
      where('toUserId', '==', userId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const requests = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as ChatRequest)
        );
        callback(requests);
      },
      () => callback([])
    );
  } catch {
    callback([]);
    return () => {};
  }
}

export function listenChatRequestsFromUser(
  userId: string,
  callback: (requests: ChatRequest[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'chat_requests'),
      where('fromUserId', '==', userId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const requests = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as ChatRequest)
        );
        callback(requests);
      },
      () => callback([])
    );
  } catch {
    callback([]);
    return () => {};
  }
}

/* ------------------------------------------------------------------ */
/*  Group chat creation                                                */
/* ------------------------------------------------------------------ */

export async function createGroupChat(
  adminId: string,
  adminName: string,
  memberIds: string[],
  memberNames: Record<string, string>,
  memberAvatars: Record<string, string>,
  groupName: string,
  groupPhoto?: string
): Promise<Chat> {
  const allIds = Array.from(new Set([adminId, ...memberIds]));
  const participantNames = { ...memberNames, [adminId]: adminName };
  const chatId =
    'group_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  const chat: Chat = {
    id: chatId,
    participants: allIds,
    participantNames,
    participantAvatars: memberAvatars,
    lastMessage: 'Group created',
    lastTimestamp: Date.now(),
    unreadCount: 0,
    online: {},
    disappearingMode: 'off',
    pinned: false,
    type: 'group',
    groupName,
    groupPhoto,
    groupAdmin: adminId,
    typing: {},
    muted: {},
    isMuted: false,
  };
  await saveChat(chat);
  return chat;
}

/* ------------------------------------------------------------------ */
/*  Chat list ops                                                      */
/* ------------------------------------------------------------------ */

export async function pinChat(
  chatId: string,
  userId: string,
  pinned: boolean
): Promise<void> {
  await updateChat(chatId, { [`pinnedBy.${userId}`]: pinned });
}

export async function muteChat(
  chatId: string,
  userId: string,
  muted: boolean
): Promise<void> {
  await updateChat(chatId, { [`muted.${userId}`]: muted });
}

export async function deleteChat(chatId: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    const messagesSnap = await getDocs(
      query(collection(db, 'messages'), where('chatId', '==', chatId))
    );
    messagesSnap.docs.forEach((d) => batch.delete(doc(db, 'messages', d.id)));
    batch.delete(doc(db, 'chats', chatId));
    await batch.commit();
  } catch (err) {
    console.warn('[DataService] deleteChat failed:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Forward message                                                    */
/* ------------------------------------------------------------------ */

export async function forwardMessage(
  message: ChatMessage,
  targetChatIds: string[],
  senderId: string
): Promise<void> {
  const now = Date.now();
  for (const chatId of targetChatIds) {
    const forwarded: ChatMessage = {
      ...message,
      id:
        'msg_' +
        Date.now().toString(36) +
        Math.random().toString(36).substr(2, 5),
      chatId,
      senderId,
      status: 'sent',
      forwardedFrom: message.chatId,
      createdAt: now,
    };
    delete (forwarded as any).reactions;
    delete (forwarded as any).replyTo;
    await sendMessage(forwarded);
  }
}

/* ------------------------------------------------------------------ */
/*  Name prefix search                                                 */
/* ------------------------------------------------------------------ */

export function listenUsersByName(
  nameFragment: string,
  callback: (users: UserData[]) => void
): () => void {
  if (!nameFragment.trim()) {
    callback([]);
    return () => {};
  }
  try {
    const lower = nameFragment.toLowerCase().trim();
    const upper = lower.replace(/.$/, (c) =>
      String.fromCharCode(c.charCodeAt(0) + 1)
    );
    const q = query(
      collection(db, 'users'),
      where('nameLowercase', '>=', lower),
      where('nameLowercase', '<', upper),
      limit(100)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const users = snapshot.docs.map(
          (d) => ({ uid: d.id, ...d.data() } as unknown as UserData)
        );
        callback(users);
      },
      () => callback([])
    );
  } catch {
    callback([]);
    return () => {};
  }
}

/* ------------------------------------------------------------------ */
/*  Connection status helpers                                          */
/* ------------------------------------------------------------------ */

export async function friendshipExists(
  userId1: string,
  userId2: string
): Promise<boolean> {
  const conn = await getConnectionBetweenUsers(userId1, userId2);
  return !!conn && conn.type === 'friend' && conn.status === 'accepted';
}

export async function blockExists(
  userId1: string,
  userId2: string
): Promise<boolean> {
  const conn = await getConnectionBetweenUsers(userId1, userId2);
  return !!conn && conn.status === 'blocked';
}

/* ------------------------------------------------------------------ */
/*  Follow helpers for feed                                            */
/* ------------------------------------------------------------------ */

export function listenFollowingUserIds(
  userId: string,
  callback: (userIds: string[]) => void
): () => void {
  return listenFollowing(userId, (conns) =>
    callback(conns.filter((c) => c.status === 'accepted').map((c) => c.toUserId))
  );
}

/* ------------------------------------------------------------------ */
/*  Disappearing messages cleanup                                      */
/* ------------------------------------------------------------------ */

export async function cleanupDisappearingMessages(
  chatId: string,
  mode: Chat['disappearingMode']
): Promise<void> {
  if (mode === 'off') return;
  const ttlMs = mode === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - ttlMs;
  try {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      where('createdAt', '<', cutoff)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(doc(db, 'messages', d.id)));
    await batch.commit();
  } catch (err) {
    console.warn('[DataService] cleanupDisappearingMessages failed:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Call types + helpers (WebRTC signaling via Firestore)               */
/* ------------------------------------------------------------------ */

export interface CallLog {
  id: string;
  chatId: string;
  callerId: string;
  calleeId: string;
  type: 'voice' | 'video';
  status: 'missed' | 'outgoing' | 'incoming' | 'connected';
  duration: number; // seconds, 0 for missed
  timestamp: number;
}

export interface CallOffer {
  id: string;
  chatId: string;
  callerId: string;
  calleeId: string;
  type: 'voice' | 'video';
  sdp: string;
  status: 'ringing' | 'answered' | 'ended';
  createdAt: number;
}

/** Create a call log entry in Firestore. */
export async function createCallLog(
  chatId: string,
  callerId: string,
  calleeId: string,
  type: 'voice' | 'video',
  status: CallLog['status'],
  duration: number
): Promise<void> {
  const id = `call_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;
  await fsSet('call_logs', { id, chatId, callerId, calleeId, type, status, duration, timestamp: Date.now() });
}

/** Real-time listener for call history in a chat. */
export function listenCallHistory(
  chatId: string,
  callback: (logs: CallLog[]) => void
): () => void {
  const q = query(collection(db, 'call_logs'), where('chatId', '==', chatId), orderBy('timestamp', 'desc'), limit(20));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => d.data() as CallLog)), () => {});
}

/** Create a WebRTC call offer in Firestore (caller -> callee). */
export async function createCallOffer(
  chatId: string,
  callerId: string,
  calleeId: string,
  type: 'voice' | 'video',
  sdp: string
): Promise<string> {
  const id = `offer_${Date.now()}`;
  const offer: CallOffer = { id, chatId, callerId, calleeId, type, sdp, status: 'ringing', createdAt: Date.now() };
  await fsSet('call_offers', offer);
  return id;
}

/** Listen for a call offer targeted at the current user. */
export function listenCallOffer(
  calleeId: string,
  callback: (offer: CallOffer | null) => void
): () => void {
  const q = query(
    collection(db, 'call_offers'),
    where('calleeId', '==', calleeId),
    where('status', '==', 'ringing'),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  return onSnapshot(q, (snap) => {
    if (snap.docs.length > 0) callback(snap.docs[0].data() as CallOffer);
    else callback(null);
  }, () => {});
}

/** Answer a call offer (callee responds with their SDP). */
export async function answerCallOffer(offerId: string, sdp: string): Promise<void> {
  await updateDoc(doc(db, 'call_offers', offerId), { status: 'answered', answerSdp: sdp } as any);
}

/** End a call (update offer status). */
export async function endCallOffer(offerId: string): Promise<void> {
  await updateDoc(doc(db, 'call_offers', offerId), { status: 'ended' } as any).catch(() => {});
}

/* ------------------------------------------------------------------ */
/*  Story types + helpers                                               */
/* ------------------------------------------------------------------ */

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: string;
  type: 'photo' | 'video' | 'text';
  /** For photo/video stories -- Firebase Storage URL */
  mediaUrl?: string;
  /** For text stories */
  text?: string;
  backgroundColor?: string;
  fontName?: string;
  viewerIds: string[];
  createdAt: number;
  expiresAt: number; // createdAt + 24h
}

export interface StoryView {
  id: string;
  storyId: string;
  viewerId: string;
  viewerName: string;
  viewerAvatar?: string;
  viewedAt: number;
}

/** Create a new story in Firestore. */
export async function createStory(story: Omit<Story, 'id' | 'viewerIds'>): Promise<string> {
  const id = `story_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;
  const doc: Story = { ...story, id, viewerIds: [] };
  await fsSet('stories', doc);
  return id;
}

/** Real-time listener for active stories (not expired). */
export function listenStories(callback: (stories: Story[]) => void): () => void {
  const cutoff = Date.now();
  const q = query(collection(db, 'stories'), where('expiresAt', '>', cutoff), orderBy('expiresAt', 'asc'));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => d.data() as Story)), () => {});
}

/** Listen for a single story document (for views tracking). */
export function listenStory(storyId: string, callback: (story: Story | null) => void): () => void {
  return onSnapshot(doc(db, 'stories', storyId), (snap) => {
    if (snap.exists()) callback(snap.data() as Story);
    else callback(null);
  }, () => {});
}

/** Mark a story as viewed by a user (idempotent). */
export async function viewStory(storyId: string, userId: string, userName: string, userAvatar?: string): Promise<void> {
  const storyRef = doc(db, 'stories', storyId);
  await updateDoc(storyRef, { viewerIds: arrayUnion(userId) } as any).catch(() => {});
  // Also save a view record
  const viewId = `${storyId}_${userId}`;
  const view: StoryView = { id: viewId, storyId, viewerId: userId, viewerName: userName, viewerAvatar: userAvatar, viewedAt: Date.now() };
  await fsSet('story_views', view).catch(() => {});
}

/** Listen for viewers of a specific story. */
export function listenStoryViews(storyId: string, callback: (views: StoryView[]) => void): () => void {
  const q = query(collection(db, 'story_views'), where('storyId', '==', storyId));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => d.data() as StoryView)), () => {});
}

/** Get stories by a specific author (for "my story" / profile). */
export function listenUserStories(authorId: string, callback: (stories: Story[]) => void): () => void {
  const cutoff = Date.now();
  const q = query(
    collection(db, 'stories'),
    where('authorId', '==', authorId),
    where('expiresAt', '>', cutoff),
    orderBy('expiresAt', 'asc')
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => d.data() as Story)), () => {});
}
