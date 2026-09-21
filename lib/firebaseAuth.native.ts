import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseApp } from "firebase/app";
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";

// iOS/Android: without this, the user is signed out every time the app closes.
// Metro picks this file over firebaseAuth.ts on native because of the suffix.
export function createAuth(app: FirebaseApp): Auth {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Already initialised (fast refresh re-runs this module).
    return getAuth(app);
  }
}
