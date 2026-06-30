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
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';

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
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
  loginWithGoogle: async () => {},
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
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fireUser) => {
      if (fireUser) {
        try {
          // Fetch or create Firestore profile
          const profileRef = doc(db, 'users', fireUser.uid);
          const snapshot = await getDoc(profileRef);
          let profile: Record<string, any> | undefined;
          if (snapshot.exists()) {
            profile = snapshot.data();
          }
          const userData = buildUserData(fireUser, profile);
          // Update lastSeen
          if (snapshot.exists()) {
            updateDoc(profileRef, { lastSeen: Date.now() }).catch(() => {});
          }
          setUser(userData);
        } catch (err) {
          console.error('[Auth] Failed to load profile:', err);
          // Fallback: build from just the Firebase user
          setUser(buildUserData(fireUser));
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
  };

  const loginWithGoogle = async () => {
    // Google Sign-In would require expo-google-sign-in or similar
    // For now, use email/password as fallback
    throw new Error('Google Sign-In not yet configured. Use email login instead.');
  };

  const register = async (data: Partial<UserData> & { password: string }) => {
    const { password, ...profile } = data;
    const credential = await createUserWithEmailAndPassword(
      auth,
      profile.email || '',
      password
    );
    const now = Date.now();
    const userData: UserData = {
      uid: credential.user.uid,
      name: profile.name || credential.user.displayName || 'Neighbor',
      email: credential.user.email || profile.email || '',
      phone: profile.phone || '',
      avatar: profile.avatar || '',
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
    };

    // Create Firestore profile
    await setDoc(doc(db, 'users', credential.user.uid), {
      ...userData,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    });

    setUser(userData);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  const updateUser = async (data: Partial<UserData>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    // Persist to Firestore (fire-and-forget — never block UI on slow writes)
    updateDoc(doc(db, 'users', user.uid), {
      ...data,
      lastSeen: Date.now(),
    }).catch((err) => {
      if (err.code !== 'unavailable') console.error('[Auth] updateUser failed:', err);
    });
  };

  const isAuthenticated = !!user;
  const isVerified = user?.verified ?? false;

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
