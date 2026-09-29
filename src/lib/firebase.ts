import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeAuth, 
  indexedDBLocalPersistence, 
  browserLocalPersistence, 
  getAuth, 
  Auth 
} from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  getFirestore, 
  Firestore, 
  doc as originalDoc, 
  getDocFromCache, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Configure resilient Firestore with IndexedDB Multi-Tab persistent local cache
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
  }, firebaseConfig.firestoreDatabaseId);
} catch (err) {
  // If already initialized or cache failed, fallback to getFirestore
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}
export const db = firestoreInstance;

// Configure resilient Auth with IndexedDB and Browser LocalStorage persistence
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence]
  });
} catch (err) {
  authInstance = getAuth(app);
}
export const auth = authInstance;

// Safe doc function wrapper to prevent segment count / offline errors on bad IDs
export function doc(database: any, collectionPath: string, ...documentPaths: string[]) {
  // Safe validation of documentPath segments
  const sanitizedPaths = documentPaths.map(p => {
    if (!p || typeof p !== 'string' || p.trim() === '' || p === 'undefined' || p === 'null') {
      console.warn(`Prevented invalid firestore path segment in collection ${collectionPath}. Falling back to default ID.`);
      return '_invalid_path_fallback_';
    }
    return p;
  });

  if (sanitizedPaths.length === 0) {
    return originalDoc(database, collectionPath, '_invalid_path_fallback_');
  }

  return originalDoc(database, collectionPath, ...sanitizedPaths);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
