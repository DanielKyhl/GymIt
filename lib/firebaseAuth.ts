import { FirebaseApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";

// Web: the browser build persists sign-in in IndexedDB by itself.
export function createAuth(app: FirebaseApp): Auth {
  return getAuth(app);
}
