import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialised on first use so demo mode (no Firebase project) never opens a connection.
let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

const getApp = () => (app ??= initializeApp(firebaseConfig));

export const getDb = (): Firestore =>
  (db ??= initializeFirestore(getApp(), {
    // Optional fields may be undefined in app records; Firestore rejects undefined otherwise.
    ignoreUndefinedProperties: true,
    // Offline-first: reads and writes hit the local cache and sync when online.
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  }));

export const getFirebaseAuth = (): Auth => (auth ??= getAuth(getApp()));
