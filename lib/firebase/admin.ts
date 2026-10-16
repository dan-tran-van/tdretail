import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let firestoreInstance: Firestore | null = null;
let firebaseAppInstance: App | null = null;
let isConfigured = false;

export function initFirebaseAdmin(): { app: App | null; firestore: Firestore | null; isConfigured: boolean } {
  if (firestoreInstance && firebaseAppInstance) {
    return { app: firebaseAppInstance, firestore: firestoreInstance, isConfigured: true };
  }

  // Check if credentials exist in environment
  const serviceAccountKeyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  try {
    if (serviceAccountKeyJson) {
      const serviceAccount = JSON.parse(serviceAccountKeyJson);
      firebaseAppInstance = getApps().length === 0
        ? initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || projectId,
        })
        : getApps()[0];
      firestoreInstance = getFirestore(firebaseAppInstance);
      isConfigured = true;
      return { app: firebaseAppInstance, firestore: firestoreInstance, isConfigured: true };
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && projectId) {
      firebaseAppInstance = getApps().length === 0
        ? initializeApp({ projectId })
        : getApps()[0];
      firestoreInstance = getFirestore(firebaseAppInstance);
      isConfigured = true;
      return { app: firebaseAppInstance, firestore: firestoreInstance, isConfigured: true };
    }
  } catch (error) {
    console.warn('[FirebaseAdmin] Could not initialize Firebase Admin SDK with provided credentials, falling back to local persistent store:', error);
  }

  return { app: null, firestore: null, isConfigured: false };
}

export function isFirebaseConfigured(): boolean {
  return isConfigured;
}
