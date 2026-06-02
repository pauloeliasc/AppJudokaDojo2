import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updatePassword, signOut, signInWithEmailAndPassword, deleteUser, updateEmail, sendPasswordResetEmail } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { profilesApi } from './firestoreService';

/**
 * Creates a student account in Firebase Auth without logging out the current admin.
 * It uses a secondary Firebase App instance for this purpose.
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
    console.error('Error creating student account:', error);
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
    console.error('Error deleting student account (likely password changed or already deleted):', error);
    await deleteApp(secondaryApp);
    // We don't throw here to allow the profile deletion to proceed even if auth deletion fails
    return { success: false, error };
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
export async function updateStudentEmail(oldEmail: string, newEmail: string, currentPassword?: string) {
  const secondaryAppName = `secondary-app-email-update-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  
  try {
    const pwd = currentPassword || '123456';
    const userCredential = await signInWithEmailAndPassword(secondaryAuth, oldEmail, pwd);
    await updateEmail(userCredential.user, newEmail);
    
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating student auth email:', error);
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
    console.error('Error resetting student password to 123456:', error);
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
    console.error('Error sending password reset email:', error);
    throw error;
  }
}
