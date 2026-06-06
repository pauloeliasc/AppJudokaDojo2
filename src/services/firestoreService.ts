import { 
  collection, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  addDoc,
  onSnapshot,
  collectionGroup,
  QueryConstraint
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, doc } from '../lib/firebase';
import { Profile, ClassSession, Presence, Payment, Settings, Schedule, EventItem } from '../types';

export const scheduleApi = {
  getAll: async (): Promise<Schedule[]> => {
    const path = 'schedule';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  create: async (data: Omit<Schedule, 'id'>) => {
    const path = 'schedule';
    try {
      const docRef = await addDoc(collection(db, path), data);
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
      return null;
    }
  },

  delete: async (id: string) => {
    const path = `schedule/${id}`;
    try {
      await deleteDoc(doc(db, 'schedule', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  update: async (id: string, data: Partial<Schedule>) => {
    const path = `schedule/${id}`;
    try {
      await updateDoc(doc(db, 'schedule', id), data as any);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  }
};

export const profilesApi = {
  getById: async (id: string): Promise<Profile | null> => {
    if (!id || id === 'undefined') {
      console.warn("getById called with empty or undefined ID");
      return null;
    }
    try {
      const docRef = doc(db, 'profiles', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Profile;
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `profiles/${id}`);
      return null;
    }
  },

  getAll: async (): Promise<Profile[]> => {
    const path = 'profiles';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  upsert: async (profile: Partial<Profile> & { id: string }) => {
    if (!profile || !profile.id || profile.id === 'undefined') {
      console.warn("upsert called with empty or undefined profile ID");
      return;
    }
    const path = `profiles/${profile.id}`;
    const dataToSave = { ...profile };
    if (dataToSave.email) {
      dataToSave.email = dataToSave.email.trim().toLowerCase();
    }
    try {
      await setDoc(doc(db, 'profiles', profile.id), dataToSave, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  update: async (id: string, data: Partial<Profile>) => {
    if (!id || id === 'undefined') {
      console.warn("update called with empty or undefined ID");
      return;
    }
    const path = `profiles/${id}`;
    const dataToUpdate = { ...data };
    if (dataToUpdate.email) {
      dataToUpdate.email = dataToUpdate.email.trim().toLowerCase();
    }
    try {
      await updateDoc(doc(db, 'profiles', id), dataToUpdate);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  }
};

export const classesApi = {
  getAll: async (): Promise<ClassSession[]> => {
    const path = 'classes';
    try {
      const q = query(collection(db, path), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSession));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  create: async (classData: Omit<ClassSession, 'id'>) => {
    const path = 'classes';
    try {
      const docRef = await addDoc(collection(db, path), classData);
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
      return null;
    }
  },

  update: async (id: string, data: Partial<ClassSession>) => {
    const path = `classes/${id}`;
    try {
      await updateDoc(doc(db, 'classes', id), data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  }
};

export const presencesApi = {
  getByClass: async (classId: string): Promise<Presence[]> => {
    const path = `classes/${classId}/presences`;
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Presence));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  record: async (classId: string, presence: Omit<Presence, 'id'>) => {
    const path = `classes/${classId}/presences`;
    try {
      await addDoc(collection(db, path), presence);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },
  
  getAllGlobal: async (): Promise<Presence[]> => {
    try {
      const q = query(collectionGroup(db, 'presences'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Presence));
    } catch (e) {
      console.error("Error fetching global presences:", e);
      return [];
    }
  },

  getByMember: async (memberId: string): Promise<Presence[]> => {
    try {
      const q = query(collectionGroup(db, 'presences'), where('memberId', '==', memberId), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Presence));
    } catch (e) {
      console.error("Error fetching member presences:", e);
      return [];
    }
  }
};

export const paymentsApi = {
  getByUser: async (userId: string): Promise<Payment[]> => {
    const path = 'payments';
    try {
      const q = query(collection(db, path), where('memberId', '==', userId), orderBy('year', 'desc'), orderBy('month', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  getAll: async (): Promise<Payment[]> => {
    const path = 'payments';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  create: async (payment: Omit<Payment, 'id'>) => {
    const path = 'payments';
    try {
      await addDoc(collection(db, path), payment);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  updateStatus: async (id: string, status: 'pending' | 'paid', pixTimestamp?: string, memberId?: string, month?: number, year?: number) => {
    const path = `payments/${id}`;
    try {
      const data: any = { status };
      if (pixTimestamp) data.pixTimestamp = pixTimestamp;
      if (memberId) data.memberId = memberId;
      if (month !== undefined) data.month = month;
      if (year !== undefined) data.year = year;
      await setDoc(doc(db, 'payments', id), data, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  }
};

export const settingsApi = {
  get: async (): Promise<Settings | null> => {
    const path = 'settings/global';
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'global'));
      if (docSnap.exists()) {
        return docSnap.data() as Settings;
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return null;
    }
  },

  update: async (data: Partial<Settings>) => {
    const path = 'settings/global';
    try {
      await setDoc(doc(db, 'settings', 'global'), data, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
};

export const eventsApi = {
  getAll: async (): Promise<EventItem[]> => {
    const path = 'events';
    try {
      const q = query(collection(db, path), orderBy('date', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventItem));
    } catch (e) {
      console.error("Error fetching events:", e);
      return [];
    }
  },

  create: async (data: Omit<EventItem, 'id'>) => {
    const path = 'events';
    try {
      const docRef = await addDoc(collection(db, path), data);
      return docRef.id;
    } catch (e) {
      console.error("Error creating event:", e);
      return null;
    }
  },

  delete: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (e) {
      console.error("Error deleting event:", e);
    }
  },

  update: async (id: string, data: Partial<EventItem>) => {
    try {
      await updateDoc(doc(db, 'events', id), data);
    } catch (e) {
      console.error("Error updating event:", e);
    }
  }
};
