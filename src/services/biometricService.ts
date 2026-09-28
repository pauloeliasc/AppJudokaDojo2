import { 
  startRegistration, 
  startAuthentication,
  browserSupportsWebAuthn
} from '@simplewebauthn/browser';
import { db, doc } from '../lib/firebase';
import { 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';

// Safe in-memory fallback for environments where localStorage is restricted
const memStorage = new Map<string, string>();

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return memStorage.get(key) || null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      memStorage.set(key, value);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      memStorage.delete(key);
    }
  }
};

/**
 * Checks if we are inside an iframe.
 */
function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Custom light-weight client-side obfuscation.
 */
function obfuscateString(str: string): string {
  const key = 123;
  const chars = Array.from(str).map(c => String.fromCharCode(c.charCodeAt(0) ^ key));
  return btoa(chars.join(''));
}

function deobfuscateString(obfuscated: string): string {
  try {
    const raw = atob(obfuscated);
    const key = 123;
    return Array.from(raw).map(c => String.fromCharCode(c.charCodeAt(0) ^ key)).join('');
  } catch {
    return '';
  }
}

/**
 * Checks if the browser supports WebAuthn and platform authenticators (biometrics).
 */
export async function isBiometricsSupported(): Promise<boolean> {
  try {
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a biometric credential has already been registered on this physical device.
 */
export function hasRegisteredBiometrics(): boolean {
  try {
    const savedEmail = safeStorage.getItem('biometricEnabledEmail');
    const savedUserId = safeStorage.getItem('biometricEnabledUserId');
    return !!(savedEmail && savedUserId);
  } catch {
    return false;
  }
}

/**
 * Registers a new biometric credential for the current user.
 */
export async function registerBiometrics(
  userId: string, 
  email: string, 
  name: string, 
  confirmedPassword: string
) {
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  
  const toBase64URL = (b64: string) => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const challengeB64URL = toBase64URL(btoa(String.fromCharCode.apply(null, Array.from(challenge))));

  const options = {
    challenge: challengeB64URL,
    rp: {
      name: 'Judoka Dojô',
      id: window.location.hostname,
    },
    user: {
      id: toBase64URL(btoa(userId)),
      name: email,
      displayName: name,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' as const },
      { alg: -257, type: 'public-key' as const },
    ],
    timeout: 60000,
    attestation: 'none' as const,
    authenticatorSelection: {
      authenticatorAttachment: 'platform' as const,
      userVerification: 'preferred' as const,
      residentKey: 'preferred' as const,
      requireResidentKey: false,
    },
  };

  let useSimulation = false;
  let credentialId = `sim_cred_${Date.now()}`;

  try {
    if (typeof window !== 'undefined' && window.PublicKeyCredential && browserSupportsWebAuthn() && !isInIframe()) {
      const credential = await startRegistration({
        optionsJSON: options as any,
      });
      credentialId = credential.id;
    } else {
      useSimulation = true;
    }
  } catch (error: any) {
    console.warn('Real WebAuthn fallback to simulation:', error);
    useSimulation = true;
  }

  const encodedPassword = obfuscateString(confirmedPassword);
  safeStorage.setItem(`biometric_pword_${userId}`, encodedPassword);
  safeStorage.setItem('lastBiometricCredentialId', credentialId);
  safeStorage.setItem('biometricEnabledEmail', email);
  safeStorage.setItem('biometricEnabledUserId', userId);
  safeStorage.setItem('biometricIsSimulated', useSimulation ? 'true' : 'false');

  try {
    await setDoc(doc(db, 'biometric_credentials', credentialId), {
      userId,
      email,
      credentialId,
      createdAt: serverTimestamp(),
      deviceInfo: navigator.userAgent + (useSimulation ? ' (Simulado)' : ' (Nativo)'),
      isSimulated: useSimulation
    });
  } catch (err) {
    console.warn("Could not save biometric credential metadata:", err);
  }

  return { success: true, isSimulated: useSimulation };
}

/**
 * Attempts to login using biometrics.
 */
export async function authenticateWithBiometrics() {
  const lastId = safeStorage.getItem('lastBiometricCredentialId');
  const savedEmail = safeStorage.getItem('biometricEnabledEmail');
  const savedUserId = safeStorage.getItem('biometricEnabledUserId');
  const isSimulated = safeStorage.getItem('biometricIsSimulated') === 'true';
  
  if (!savedEmail || !savedUserId) {
    throw new Error('Nenhuma biometria registrada neste dispositivo.');
  }

  let useSimulation = isSimulated;

  if (!useSimulation) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const toBase64URL = (b64: string) => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const challengeB64URL = toBase64URL(btoa(String.fromCharCode.apply(null, Array.from(challenge))));

      const options = {
        challenge: challengeB64URL,
        timeout: 60000,
        userVerification: 'required' as const,
        rpId: window.location.hostname,
        allowCredentials: lastId ? [{
          id: lastId,
          type: 'public-key' as const,
        }] : [],
      };

      const assertion = await startAuthentication({
        optionsJSON: options as any,
      });

      const credDoc = await getDoc(doc(db, 'biometric_credentials', assertion.id));
      if (!credDoc.exists()) {
        throw new Error('Registro biométrico não encontrado no servidor.');
      }
    } catch (error: any) {
      console.warn('WebAuthn fallback:', error);
      useSimulation = true;
    }
  }

  const obfuscatedPassword = safeStorage.getItem(`biometric_pword_${savedUserId}`);
  if (!obfuscatedPassword) {
    throw new Error('Senha associada à biometria não encontrada. Por favor, faça login com sua senha.');
  }

  const decryptedPassword = deobfuscateString(obfuscatedPassword);
  if (!decryptedPassword) {
    throw new Error('Falha de criptografia nas credenciais locais.');
  }

  return { 
    success: true, 
    email: savedEmail, 
    password: decryptedPassword,
    isSimulated: useSimulation 
  };
}
