import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { auth, db, storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const CACHED_USER_KEY = '@paaswala_cached_user';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  coverPhoto?: string;
  role: 'resident' | 'admin' | 'superAdmin' | 'business';
  verified: boolean;
  neighborhoodId?: string;
  neighborhoodName?: string;
  reputationScore: number;
  streetName?: string;
  onlineStatus: boolean;
  showOnlineStatus: boolean;
  createdAt: number;
  lastSeen: number;
  likesPrivacyDefault: 'public' | 'neighborhood' | 'private';
  // Location fields
  latitude?: number;
  longitude?: number;
  geohash?: string;
  address?: string;
  area?: string;
  city?: string;
  lastLocationUpdate?: number;
  // Follow / Friend fields
  searchableByEmail: boolean;
  followersCount: number;
  followingCount: number;
  friendsCount: number;
  // Search / privacy
  nameLowercase?: string;
  blockedUsers?: string[];
  // Notification preferences
  notificationPreferences: {
    newPosts: boolean;
    messages: boolean;
    events: boolean;
    alerts: boolean;
  };
  // Privacy & Reputation
  whoCanMessage: 'everyone' | 'friends' | 'nobody';
  postVisibility: 'neighborhood' | 'friends';
  showLocationOnMap: boolean;
  reputationTier: 'bronze' | 'silver' | 'gold';
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<boolean>;
  register: (data: Partial<UserData> & { password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<UserData>) => Promise<void>;
  setUser: (user: UserData | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  isVerified: false,
  login: async () => {},
  loginWithGoogle: async () => false,
  register: async () => {},
  logout: async () => {},
  updateUser: async () => {},
  setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

/** Build a UserData shape from a Firebase Auth user + Firestore doc. */
function buildUserData(fireUser: FirebaseUser, profile?: Record<string, any>): UserData {
  const now = Date.now();
  return {
    uid: fireUser.uid,
    name: profile?.name || fireUser.displayName || fireUser.email?.split('@')[0] || 'Neighbor',
    email: fireUser.email || profile?.email || '',
    phone: profile?.phone || fireUser.phoneNumber || undefined,
    avatar: profile?.avatar || fireUser.photoURL || '',
    coverPhoto: profile?.coverPhoto || '',
    role: profile?.role || 'resident',
    verified: profile?.verified ?? false,
    neighborhoodId: profile?.neighborhoodId || '',
    neighborhoodName: profile?.neighborhoodName || '',
    reputationScore: profile?.reputationScore || 0,
    streetName: profile?.streetName || '',
    onlineStatus: profile?.onlineStatus ?? true,
    showOnlineStatus: profile?.showOnlineStatus ?? true,
    createdAt: profile?.createdAt || now,
    lastSeen: now,
    likesPrivacyDefault: profile?.likesPrivacyDefault || 'neighborhood',
    // Location fields
    latitude: profile?.latitude || undefined,
    longitude: profile?.longitude || undefined,
    geohash: profile?.geohash || undefined,
    address: profile?.address || '',
    area: profile?.area || '',
    city: profile?.city || '',
    lastLocationUpdate: profile?.lastLocationUpdate || undefined,
    // Follow / Friend fields
    searchableByEmail: profile?.searchableByEmail ?? true,
    followersCount: profile?.followersCount ?? 0,
    followingCount: profile?.followingCount ?? 0,
    friendsCount: profile?.friendsCount ?? 0,
    // Search / privacy
    nameLowercase: profile?.nameLowercase || (profile?.name || fireUser.displayName || '').toLowerCase(),
    blockedUsers: profile?.blockedUsers || [],
    // Notification preferences
    notificationPreferences: profile?.notificationPreferences ?? {
      newPosts: true,
      messages: true,
      events: false,
      alerts: true,
    },
    whoCanMessage: profile?.whoCanMessage || 'everyone',
    postVisibility: profile?.postVisibility || 'neighborhood',
    showLocationOnMap: profile?.showLocationOnMap ?? true,
    reputationTier: profile?.reputationTier || 'bronze',
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  /** Persist user to AsyncStorage so session survives app restart. */
  const persistUser = async (u: UserData | null) => {
    try {
      if (u) {
        await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(u));
      } else {
        await AsyncStorage.removeItem(CACHED_USER_KEY);
      }
    } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    let unsubProfile: (() => void) | null = null;

    // 1. Immediately restore cached user (instant render, no flash of login)
    AsyncStorage.getItem(CACHED_USER_KEY).then((cached) => {
      if (cancelled) return;
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as UserData;
          setUser(parsed);
          setLoading(false);
        } catch {}
      }
    }).catch(() => {});

    // 2. Listen for real auth state changes in background
    const unsubscribe = onAuthStateChanged(auth, async (fireUser) => {
      if (cancelled) return;

      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (fireUser) {
        try {
          const profileRef = doc(db, 'users', fireUser.uid);
          
          // Setup real-time listener on user profile
          unsubProfile = onSnapshot(profileRef, (snapshot) => {
            if (cancelled) return;
            let profile: Record<string, any> | undefined;
            if (snapshot.exists()) {
              profile = snapshot.data();
            }
            const userData = buildUserData(fireUser, profile);
            setUser(userData);
            persistUser(userData);
            setLoading(false);
          }, (err) => {
            console.error('[Auth] Profile listener failed:', err);
            setUser((prev) => prev ?? buildUserData(fireUser));
            setLoading(false);
          });

          // Update online status + lastSeen (fire-and-forget)
          const snapshot = await getDoc(profileRef);
          if (snapshot.exists() && !cancelled) {
            updateDoc(profileRef, { onlineStatus: true, lastSeen: Date.now() }).catch(() => {});
          }
        } catch (err) {
          console.error('[Auth] Failed to load profile:', err);
          setUser((prev) => prev ?? buildUserData(fireUser));
          setLoading(false);
        }
      } else {
        setUser(null);
        persistUser(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // AppState listener: update onlineStatus on foreground/background
  useEffect(() => {
    if (!user?.uid) return;
    const handleAppState = (nextState: AppStateStatus) => {
      const showOnline = user?.showOnlineStatus !== false;
      const isActive = nextState === 'active';
      // If showOnlineStatus is false, always appear offline
      const onlineStatus = showOnline ? isActive : false;
      updateDoc(doc(db, 'users', user.uid), {
        onlineStatus,
        lastSeen: Date.now(),
      }).catch(() => {});
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [user?.uid, user?.showOnlineStatus]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
      Alert.alert(
        'Continue with Google',
        'Select a Google account to sign in to PaasWala:',
        [
          {
            text: 'Ali Raza (New resident)',
            onPress: async () => {
              try {
                const email = 'ali.raza.google@gmail.com';
                const pass = 'googlemock123';
                let isNew = false;
                try {
                  await signInWithEmailAndPassword(auth, email, pass);
                } catch {
                  await createUserWithEmailAndPassword(auth, email, pass);
                }
                // Check if user doc exists in Firestore
                if (auth.currentUser) {
                  const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
                  isNew = !snap.exists() || !snap.data()?.address;
                }
                resolve(isNew);
              } catch (err) {
                reject(err);
              }
            },
          },
          {
            text: 'Ahmed Malik (Existing resident)',
            onPress: async () => {
              try {
                const email = 'ahmed.malik.google@gmail.com';
                const pass = 'googlemock123';
                let isNew = false;
                try {
                  await signInWithEmailAndPassword(auth, email, pass);
                } catch {
                  await createUserWithEmailAndPassword(auth, email, pass);
                }
                if (auth.currentUser) {
                  const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
                  isNew = !snap.exists() || !snap.data()?.address;
                }
                resolve(isNew);
              } catch (err) {
                reject(err);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => reject(new Error('Google login cancelled')),
          },
        ]
      );
    });
  };

  /** Upload a local file URI to Firebase Storage, return download URL. */
  const uploadLocalImage = async (localUri: string, path: string): Promise<string> => {
    try {
      const resp = await fetch(localUri);
      const blob = await resp.blob();
      const storageRef = ref(storage, path);
      const snap = await uploadBytes(storageRef, blob);
      return getDownloadURL(snap.ref);
    } catch {
      return localUri; // fallback to local URI if upload fails
    }
  };

  const register = async (data: Partial<UserData> & { password: string }) => {
    const { password, ...profile } = data;
    const credential = await createUserWithEmailAndPassword(
      auth,
      profile.email || '',
      password
    );
    const now = Date.now();

    // Upload avatar to Firebase Storage if it's a local URI
    let avatarUrl = profile.avatar || '';
    if (avatarUrl && (avatarUrl.startsWith('file://') || avatarUrl.startsWith('data:'))) {
      avatarUrl = await uploadLocalImage(avatarUrl, `avatars/${credential.user.uid}/profile.jpg`);
    }

    const userData: UserData = {
      uid: credential.user.uid,
      name: profile.name || credential.user.displayName || 'Neighbor',
      email: credential.user.email || profile.email || '',
      phone: profile.phone || '',
      avatar: avatarUrl,
      coverPhoto: profile.coverPhoto || '',
      role: 'resident',
      verified: false,
      neighborhoodId: profile.neighborhoodId || '',
      neighborhoodName: profile.neighborhoodName || '',
      reputationScore: 0,
      streetName: profile.streetName || '',
      onlineStatus: true,
      showOnlineStatus: true,
      createdAt: now,
      lastSeen: now,
      likesPrivacyDefault: 'neighborhood',
      // Location from registration
      latitude: profile.latitude || undefined,
      longitude: profile.longitude || undefined,
      geohash: profile.geohash || undefined,
      address: profile.address || '',
      area: profile.area || '',
      city: profile.city || '',
      lastLocationUpdate: profile.lastLocationUpdate || undefined,
      // Follow / Friend defaults
      searchableByEmail: true,
      followersCount: 0,
      followingCount: 0,
      friendsCount: 0,
      // Notification preferences
      notificationPreferences: {
        newPosts: true,
        messages: true,
        events: false,
        alerts: true,
      },
      whoCanMessage: 'everyone',
      postVisibility: 'neighborhood',
      showLocationOnMap: true,
      reputationTier: 'bronze',
    };

    // Create Firestore profile
    await setDoc(doc(db, 'users', credential.user.uid), {
      ...userData,
      nameLowercase: (userData.name || '').toLowerCase(),
      blockedUsers: [],
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    });

    setUser(userData);
    persistUser(userData);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    persistUser(null);
  };

  const updateUser = async (data: Partial<UserData>) => {
    if (!user) return;
    const updates: Record<string, any> = { ...data, lastSeen: Date.now() };
    if (data.name && !data.nameLowercase) {
      updates.nameLowercase = data.name.toLowerCase();
    }
    const updated = { ...user, ...updates };
    setUser(updated);
    persistUser(updated);
    // Persist to Firestore (fire-and-forget — never block UI on slow writes)
    updateDoc(doc(db, 'users', user.uid), updates).catch((err) => {
      if (err.code !== 'unavailable') console.error('[Auth] updateUser failed:', err);
    });
  };

  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (user?.verified) {
      if (!isVerified) {
        const timer = setTimeout(() => {
          setIsVerified(true);
        }, 2500);
        return () => clearTimeout(timer);
      } else {
        setIsVerified(true);
      }
    } else {
      setIsVerified(false);
    }
  }, [user?.verified, isVerified]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isVerified,
        login,
        loginWithGoogle,
        register,
        logout,
        updateUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
