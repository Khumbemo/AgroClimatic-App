// Runtime configuration derived from Vite env vars.

const firebaseKey = import.meta.env.VITE_FIREBASE_API_KEY;

/**
 * Demo mode: no real Firebase project configured. The app signs in a demo user and keeps
 * all records in this browser instead of Firestore.
 */
export const IS_DEMO = !firebaseKey || firebaseKey === 'your_api_key';
