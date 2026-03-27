import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Handle redirect result on load
getRedirectResult(auth).catch((error) => {
  console.error('Redirect Result Error:', error);
});

export const signInWithGoogle = async () => {
  try {
    // Try popup first
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error('Login Error:', error);
    
    // If popup is blocked or fails, try redirect as fallback
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      try {
        return await signInWithRedirect(auth, googleProvider);
      } catch (redirectError: any) {
        console.error('Redirect Error:', redirectError);
        alert(`LOGIN_FAILED: ${redirectError.message}`);
      }
    } else if (error.code === 'auth/unauthorized-domain') {
      alert(`UNAUTHORIZED_DOMAIN: Please add your current domain to the Firebase Authorized Domains list in the Firebase Console (Project ID: ${firebaseConfig.projectId}).`);
    } else {
      alert(`LOGIN_FAILED: ${error.message}`);
    }
    throw error;
  }
};
export const logout = () => signOut(auth);
