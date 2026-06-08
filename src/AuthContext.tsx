import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, doc } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { User, UserRole, Profile } from './types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  activeProfileId: string | null;
  setActiveProfileId: (id: string) => void;
  availableProfiles: Profile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);

  // Function to switch active profile
  const setActiveProfileId = (id: string) => {
    if (auth.currentUser?.email) {
      localStorage.setItem(`activeProfile_${auth.currentUser.email.toLowerCase().trim()}`, id);
    }
    setActiveProfileIdState(id);
  };

  useEffect(() => {
    let unsubscribeFamily: (() => void) | null = null;
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous listeners
      if (unsubscribeFamily) {
        unsubscribeFamily();
        unsubscribeFamily = null;
      }
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setAvailableProfiles([]);
        setActiveProfileIdState(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const rawEmail = firebaseUser.email?.toLowerCase().trim() || '';
      const email = rawEmail.replace(/\+reset\d+@/, '@');

      // Set up real-time listener for ALL profiles with this email (family members)
      const q = query(collection(db, 'profiles'), where('email', '==', email));
      unsubscribeFamily = onSnapshot(q, async (snapshot) => {
        const list = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Profile))
          .filter(p => !p.isPointer);

        setAvailableProfiles(list);

        // Compute/decide active profile of the family
        let selectedId: string | null = null;
        const storedId = localStorage.getItem(`activeProfile_${email}`);

        if (storedId && list.some(p => p.id === storedId)) {
          selectedId = storedId;
        } else {
          // If no stored selection, try matching UID or userId
          const mainMatch = list.find(p => p.id === firebaseUser.uid || p.userId === firebaseUser.uid);
          if (mainMatch) {
            selectedId = mainMatch.id;
          } else if (list.length > 0) {
            selectedId = list[0].id;
          } else {
            selectedId = firebaseUser.uid;
          }
        }

        setActiveProfileIdState(selectedId);
      }, (err) => {
        console.error("Error listening to family profiles:", err);
        // Fallback if permission / index fails
        setActiveProfileIdState(firebaseUser.uid);
        setAvailableProfiles([]);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFamily) unsubscribeFamily();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Sync activeProfileId to current user state
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    const firebaseUser = auth.currentUser;

    if (!firebaseUser || !activeProfileId) {
      return;
    }

    const rawEmail = firebaseUser.email?.toLowerCase().trim() || '';
    const email = rawEmail.replace(/\+reset\d+@/, '@');
    const isAdminEmail = email === 'pauloeliasc@gmail.com' || email === 'judokadojoosasco@gmail.com';

    unsubscribeProfile = onSnapshot(doc(db, 'profiles', activeProfileId), async (docSnapshot) => {
      if (docSnapshot.exists()) {
        const pData = docSnapshot.data();
        
        // Link with UID if it's not set
        if (activeProfileId === firebaseUser.uid && pData.userId !== firebaseUser.uid) {
          try {
            await setDoc(doc(db, 'profiles', activeProfileId), { userId: firebaseUser.uid }, { merge: true });
          } catch (e) {
            console.warn("Could not link active user with UID:", e);
          }
        }

        const isProfileAdmin = pData.role === UserRole.ADMIN || isAdminEmail;

        setUser({
          uid: firebaseUser.uid,
          id: activeProfileId,
          email: firebaseUser.email || '',
          name: pData.fullName || pData.name || pData.username || email.split('@')[0],
          role: isProfileAdmin ? UserRole.ADMIN : (pData.role || UserRole.STUDENT),
          username: pData.username || email.split('@')[0],
          isApproved: isProfileAdmin ? true : (pData.isApproved ?? false),
          status: isProfileAdmin ? 'active' : (pData.status ?? 'pending')
        });
      } else {
        // Create matching fallback profile if it doesn't exist yet
        const newUser: User = {
          uid: firebaseUser.uid,
          id: activeProfileId,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || email.split('@')[0] || 'Usuário',
          role: isAdminEmail ? UserRole.ADMIN : UserRole.STUDENT,
          username: email.split('@')[0],
          isApproved: isAdminEmail ? true : false,
          status: isAdminEmail ? 'active' : 'pending'
        };

        setUser(newUser);

        if (activeProfileId === firebaseUser.uid) {
          try {
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
          } catch (e) {
            console.error("Failed to auto-create profile doc:", e);
          }
        }
      }
      setLoading(false);
    }, (err) => {
      console.error("Error listening to selected active profile:", err);
      setLoading(false);
    });

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [activeProfileId]);

  const logout = async () => {
    await auth.signOut();
  };

  const refreshUser = async () => {
    // Left as compatibility stub or manually triggers re-fetch if needed
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser, activeProfileId, setActiveProfileId, availableProfiles }}>
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
