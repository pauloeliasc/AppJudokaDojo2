import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updatePassword, signOut, signInWithEmailAndPassword, deleteUser, updateEmail, sendPasswordResetEmail } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { profilesApi } from './firestoreService';

/**
 * Creates a student account in Firebase Auth without logging out the current admin.
 * It uses a secondary Firebase App instance for this purpose.
 * If the account already exists, it tries to login with the default password to link it.
 */
export async function createStudentAccount(email: string, profileId: string) {
  const secondaryAppName = `secondary-app-create-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  
  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, '123456');
    const uid = userCredential.user.uid;
    
    // Update the profile with the new userId
    await profilesApi.update(profileId, { userId: uid });
    
    // Sign out of the secondary instance and delete the app
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
    
    return { success: true, uid };
  } catch (error: any) {
    // If the email is already in use, let's see if we can resolve it by signing in with '123456'
    if (error.code === 'auth/email-already-in-use') {
      try {
        console.log('Email already exists in Firebase Auth. Checking if we can authenticate with default password to link the profile...');
        const userCredential = await signInWithEmailAndPassword(secondaryAuth, email, '123456');
        const uid = userCredential.user.uid;
        
        await profilesApi.update(profileId, { userId: uid });
        
        await signOut(secondaryAuth);
        await deleteApp(secondaryApp);
        return { success: true, uid };
      } catch (signInError: any) {
        console.warn('Sign in with default password failed for existing email:', signInError.message || signInError);
        await deleteApp(secondaryApp);
        // Throw a clean custom error instead of bubbling the raw auth/email-already-in-use or triggering console.error
        throw new Error(`O e-mail ${email} já possui uma conta criada no Firebase e a senha padrão "123456" não funcionou (provavelmente o usuário já alterou a senha). Nesse caso, peça ao aluno para fazer login ou redefinir a senha.`);
      }
    }
    
    console.warn('Error creating student account:', error.message || error);
    await deleteApp(secondaryApp);
    throw error;
  }
}

/**
 * Attempts to delete a student account from Firebase Auth.
 * Note: This only works if the user is using the default password '123456' 
 * because client-side SDK cannot delete other users by UID without Admin SDK.
 */
export async function deleteStudentAccount(email: string) {
  const secondaryAppName = `secondary-app-delete-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    // Attempt to sign in with the default password to delete
    const userCredential = await signInWithEmailAndPassword(secondaryAuth, email, '123456');
    await deleteUser(userCredential.user);
    await deleteApp(secondaryApp);
    return { success: true };
  } catch (error: any) {
    console.warn('Silent notice: Deleting student auth account failed (likely password changed or already deleted):', error.message || error);
    await deleteApp(secondaryApp);
    // We don't throw here to allow the profile deletion to proceed even if auth deletion fails
    return { success: false, error: error.message || error };
  }
}

export async function changePassword(newPassword: string) {
  const auth = getAuth();
  if (auth.currentUser) {
    await updatePassword(auth.currentUser, newPassword);
  }
}

/**
 * Updates a user's Firebase Auth login email without logging out the current admin.
 * Attempts to sign in using the provided password (or default: '123456') to perform the update.
 */
export async function updateStudentEmail(oldEmail: string, newEmail: string, currentPassword?: string, profileId?: string) {
  const secondaryAppName = `secondary-app-email-update-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  
  try {
    const pwd = currentPassword || '123456';
    const userCredential = await signInWithEmailAndPassword(secondaryAuth, oldEmail, pwd);
    await updateEmail(userCredential.user, newEmail);
    const uid = userCredential.user.uid;
    
    if (profileId) {
      await profilesApi.update(profileId, { userId: uid });
    }
    
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
    return { success: true, uid };
  } catch (error: any) {
    // If sign in fails, it could be that the account doesn't exist yet, OR password was changed.
    // Let's check if the error is auth/invalid-credential or auth/user-not-found
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
      try {
        console.log('Sign in failed for old email. Attempting to create account directly with new email...');
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmail, '123456');
        const uid = userCredential.user.uid;
        
        if (profileId) {
          await profilesApi.update(profileId, { userId: uid });
        }
        
        await signOut(secondaryAuth);
        await deleteApp(secondaryApp);
        return { success: true, uid };
      } catch (createError: any) {
        if (createError.code === 'auth/email-already-in-use') {
          console.warn('New email already in use during email update fallback:', createError.message || createError);
          await deleteApp(secondaryApp);
          throw new Error('O novo e-mail já está em uso por outro usuário.');
        } else {
          console.warn('Failed fallback account creation on email update:', createError.message || createError);
          await deleteApp(secondaryApp);
          throw createError;
        }
      }
    }
    console.warn('Error updating student auth email:', error.message || error);
    await deleteApp(secondaryApp);
    throw error;
  }
}

/**
 * Resets a student's password back to '123456' by signing in and updating the password.
 */
export async function resetStudentPassword(email: string, currentPassword?: string) {
  const secondaryAppName = `secondary-app-pword-reset-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  
  try {
    const pwd = currentPassword || '123456';
    const userCredential = await signInWithEmailAndPassword(secondaryAuth, email, pwd);
    await updatePassword(userCredential.user, '123456');
    
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
    return { success: true };
  } catch (error: any) {
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
      try {
        console.log('Account may not exist, attempting to create auth account with default password instead of resetting...');
        await createUserWithEmailAndPassword(secondaryAuth, email, '123456');
        await signOut(secondaryAuth);
        await deleteApp(secondaryApp);
        return { success: true };
      } catch (createError: any) {
        if (createError.code === 'auth/email-already-in-use') {
          console.warn('Account already exists with changed password, cannot reset without current user password.');
          await deleteApp(secondaryApp);
          throw new Error('A conta do aluno já existe e a senha padrão não funciona (senha atualizada). Preencha a senha atual do aluno para podermos redefini-la.');
        } else {
          console.warn('Failed fallback account creation on password reset:', createError.message || createError);
          await deleteApp(secondaryApp);
          throw createError;
        }
      }
    }
    console.warn('Error resetting student password to 123456:', error.message || error);
    await deleteApp(secondaryApp);
    throw error;
  }
}

/**
 * Triggers a standard password recovery email from Firebase Auth.
 */
export async function sendStudentPasswordReset(email: string) {
  const auth = getAuth();
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    console.warn('Error sending password reset email:', error.message || error);
    throw error;
  }
}
