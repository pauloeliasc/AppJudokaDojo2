import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, handleFirestoreError, OperationType, doc } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getDoc, getDocFromCache, setDoc, collection, query, where, getDocs, getDocsFromCache, limit } from 'firebase/firestore';
import { User, UserRole } from './types';
import { profilesApi } from './services/firestoreService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const safeGetDoc = async (docRef: any) => {
    try {
      return await getDoc(docRef);
    } catch (err: any) {
      console.warn("Server doc fetch failed, trying local cache...", err);
      try {
        return await getDocFromCache(docRef);
      } catch (cacheErr) {
        console.error("Cache doc fetch failed too:", cacheErr);
        throw err;
      }
    }
  };

  const safeGetDocs = async (queryRef: any) => {
    try {
      return await getDocs(queryRef);
    } catch (err: any) {
      console.warn("Server query fetch failed, trying local cache...", err);
      try {
        return await getDocsFromCache(queryRef);
      } catch (cacheErr) {
        console.error("Cache query fetch failed too:", cacheErr);
        throw err;
      }
    }
  };

  const fetchUserData = async (firebaseUser: FirebaseUser) => {
    try {
      // 1. Try search by doc ID = UID
      let profileDoc = await safeGetDoc(doc(db, 'profiles', firebaseUser.uid));
      let data: any = profileDoc.exists() ? profileDoc.data() : null;
      let profileId = profileDoc.id;

      // 2. If not found, try search by userId field (profiles created by admin then linked)
      if (!data) {
        const q = query(collection(db, 'profiles'), where('userId', '==', firebaseUser.uid), limit(1));
        const querySnapshot = await safeGetDocs(q);
        if (!querySnapshot.empty) {
          const snapshot = querySnapshot.docs[0];
          data = snapshot.data();
          profileId = snapshot.id;
        }
      }

      // 3. Fallback: Search by email if still not found
      if (!data && firebaseUser.email) {
        const q = query(collection(db, 'profiles'), where('email', '==', firebaseUser.email.toLowerCase()), limit(1));
        const querySnapshot = await safeGetDocs(q);
        if (!querySnapshot.empty) {
          const snapshot = querySnapshot.docs[0];
          data = snapshot.data();
          profileId = snapshot.id;
          
          // Link this profile to the current UID for future access
          try {
            await profilesApi.update(profileId, { userId: firebaseUser.uid });
          } catch (linkError) {
            console.error("Failed to link profile with UID:", linkError);
          }
        }
      }
      
      const email = firebaseUser.email?.toLowerCase() || '';
      const isAdminEmail = email === 'pauloeliasc@gmail.com' || email === 'judokadojoosasco@gmail.com';
      
      if (data) {
        if (profileId !== firebaseUser.uid) {
          try {
            const refDoc = doc(db, 'profiles', firebaseUser.uid);
            await setDoc(refDoc, {
              id: profileId,
              uid: firebaseUser.uid,
              fullName: data.fullName || data.name || '',
              email: firebaseUser.email || '',
              role: data.role || (isAdminEmail ? UserRole.ADMIN : UserRole.STUDENT),
              isPointer: true,
              isApproved: isAdminEmail ? true : (data.isApproved ?? false),
              status: isAdminEmail ? 'active' : (data.status ?? 'pending')
            }, { merge: true });
          } catch (pointerError) {
            console.error("Failed to set pointer profile:", pointerError);
          }
        }

        setUser({
          uid: firebaseUser.uid,
          id: profileId,
          email: firebaseUser.email || '',
          name: data.fullName || data.name || data.username || email.split('@')[0],
          role: data.role || (isAdminEmail ? UserRole.ADMIN : UserRole.STUDENT),
          username: data.username || email.split('@')[0],
          isApproved: isAdminEmail ? true : (data.isApproved ?? false),
          status: isAdminEmail ? 'active' : (data.status ?? 'pending')
        });
      } else {
        const newUser: User = {
          uid: firebaseUser.uid,
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || email.split('@')[0] || 'Usuário',
          role: isAdminEmail ? UserRole.ADMIN : UserRole.STUDENT,
          username: email.split('@')[0],
          isApproved: isAdminEmail ? true : false,
          status: isAdminEmail ? 'active' : 'pending'
        };

        setUser(newUser);
        setLoading(false);
        
        // Auto-create profile doc for everyone so they have a state in DB
        try {
          const checkAgain = await safeGetDoc(doc(db, 'profiles', firebaseUser.uid));
          if (!checkAgain.exists()) {
            await setDoc(doc(db, 'profiles', firebaseUser.uid), {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              fullName: newUser.name,
              email: newUser.email,
              role: newUser.role,
              username: newUser.username,
              isApproved: newUser.isApproved,
              status: newUser.status,
              enrollmentDate: new Date().toISOString().split('T')[0],
              points: 0,
              currentGrade: isAdminEmail ? 'Preta' : 'Branca'
            });
          }
        } catch (e: any) {
          console.error("Failed to auto-create profile:", e.message || e);
        }
      }
    } catch (error) {
      console.error("AuthContext fetch error (falling back):", error);
      const email = firebaseUser.email?.toLowerCase() || '';
      const isAdminEmail = email === 'pauloeliasc@gmail.com' || email === 'judokadojoosasco@gmail.com';
      setUser({
        uid: firebaseUser.uid,
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || email.split('@')[0] || 'Usuário',
        role: isAdminEmail ? UserRole.ADMIN : UserRole.STUDENT,
        username: email.split('@')[0],
        isApproved: isAdminEmail ? true : false,
        status: isAdminEmail ? 'active' : 'pending'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        fetchUserData(firebaseUser);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await auth.signOut();
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await fetchUserData(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
