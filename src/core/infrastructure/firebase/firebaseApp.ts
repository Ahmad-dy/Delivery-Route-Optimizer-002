import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';
import { getFirebaseConfig } from './firebaseConfig';

const config = getFirebaseConfig();

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId
  });
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const functions: Functions = getFunctions(app);

// Connect emulators if enabled in environment
if (config.useEmulator) {
  try {
    const [authHost, authPortStr] = config.authEmulatorHost.split(':');
    connectAuthEmulator(auth, `http://${authHost}:${authPortStr || '9099'}`, { disableWarnings: true });

    const [fsHost, fsPortStr] = config.firestoreEmulatorHost.split(':');
    connectFirestoreEmulator(db, fsHost, parseInt(fsPortStr || '8080', 10));

    // Connect Functions emulator if available (default port 5001)
    try {
      connectFunctionsEmulator(functions, fsHost || 'localhost', 5001);
    } catch {
      // Ignore if functions emulator not active
    }

    console.log(`[Firebase] Connected to local Emulators (Auth: ${config.authEmulatorHost}, Firestore: ${config.firestoreEmulatorHost})`);
  } catch (err) {
    console.warn('[Firebase] Emulator connection warning:', err);
  }
}

export { app };
