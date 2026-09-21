import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator, Firestore, getFirestore, initializeFirestore } from "firebase/firestore";
import { createAuth } from "./firebaseAuth";

// These values identify the project; they are not secrets. Access is
// controlled by firestore.rules, not by hiding this config.
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!config.apiKey || !config.projectId) {
  throw new Error(
    "Firebase isn't configured. Copy .env.example to .env, fill in your " +
      "project's values, then restart with `npx expo start -c`."
  );
}

// getApps() guards against double-initialising on fast refresh.
const app = getApps().length ? getApp() : initializeApp(config);

export const auth = createAuth(app);
// Optional fields (restSeconds, type) can be undefined; Firestore rejects those
// by default rather than just leaving the field out.
function createDb(): Firestore {
  try {
    return initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    return getFirestore(app); // already initialised (fast refresh)
  }
}
export const db = createDb();

// Local emulators: free, offline, and nothing touches the real project.
// Host is configurable because a phone can't reach the laptop's "localhost".
if (process.env.EXPO_PUBLIC_USE_EMULATORS === "1") {
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST || "127.0.0.1";
  const g = globalThis as { __gymitEmulators?: boolean };
  if (!g.__gymitEmulators) {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    g.__gymitEmulators = true;
  }
}
