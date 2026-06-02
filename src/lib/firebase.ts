import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc as originalDoc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Safe doc function wrapper to prevent segment count / offline errors on bad IDs
export function doc(db: any, collectionPath: string, ...documentPaths: string[]) {
  // Safe validation of documentPath segments
  const sanitizedPaths = documentPaths.map(p => {
    if (!p || typeof p !== 'string' || p.trim() === '' || p === 'undefined' || p === 'null') {
      console.warn(`Prevented invalid firestore path segment in collection ${collectionPath}. Falling back to default ID.`);
      return '_invalid_path_fallback_';
    }
    return p;
  });

  if (sanitizedPaths.length === 0) {
    return originalDoc(db, collectionPath, '_invalid_path_fallback_');
  }

  return originalDoc(db, collectionPath, ...sanitizedPaths);
}

// Simple connection test as per instructions
async function testConnection() {
  try {
    // Attempting to get a dummy doc to verify connection
    await getDocFromServer(originalDoc(db, '_connection_test_', 'ping'));
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
    // Normal permission-denied or not-found is fine, it means we reached the server
  }
}

testConnection();

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
  }
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
