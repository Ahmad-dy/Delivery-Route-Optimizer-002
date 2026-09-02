export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
  useEmulator: boolean;
  authEmulatorHost: string;
  firestoreEmulatorHost: string;
}

export function getFirebaseConfig(): FirebaseClientConfig {
  const env = import.meta.env;

  return {
    apiKey: env.VITE_FIREBASE_API_KEY || 'demo-api-key',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'delivery-route-optimizer.firebaseapp.com',
    projectId: env.VITE_FIREBASE_PROJECT_ID || 'delivery-route-optimizer',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'delivery-route-optimizer.appspot.com',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
    appId: env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
    firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)',
    useEmulator: env.VITE_USE_FIREBASE_EMULATOR === 'true',
    authEmulatorHost: env.VITE_FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099',
    firestoreEmulatorHost: env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST || 'localhost:8080'
  };
}
