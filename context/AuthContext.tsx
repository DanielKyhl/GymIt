import {
    createUserWithEmailAndPassword,
    deleteUser,
    EmailAuthProvider,
    onAuthStateChanged,
    reauthenticateWithCredential,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { auth } from '../lib/firebase';
import { migrateExerciseNames } from '../lib/storage';
import { hasSyncedBefore, syncAll, wipeAccount } from '../lib/sync';

type User = {
    uid: string;
    email: string | null;
};

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    // These reject with a Firebase error on failure; see lib/authErrors.ts.
    signup: (email: string, password: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    // Sends Firebase's password-reset email. Succeeds whether or not the
    // address has an account, so it can't be used to probe for accounts.
    resetPassword: (email: string) => Promise<void>;
    // Permanently deletes the account and all its data. Needs the password
    // again: Firebase only allows deletion right after a fresh sign-in.
    deleteAccount: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// How long a first sign-in on a new device waits for the cloud copy before
// showing the app anyway.
const FIRST_SYNC_TIMEOUT_MS = 8000;

// Sync, then move any old exercise names over (lib/exerciseNames.ts). The
// renaming runs even when the sync fails, e.g. offline: it works on this
// device's copy and uploads with the next sync.
function syncAndMigrate(uid: string): Promise<void> {
    return syncAll(uid)
        .catch(() => undefined)
        .then(() => migrateExerciseNames(uid))
        .catch(() => undefined);
}

function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
    return Promise.race([promise, new Promise<void>((resolve) => setTimeout(resolve, ms))]);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Firebase remembers the session between launches and tells us here, both
    // on startup and whenever someone signs in or out.
    useEffect(() => {
        return onAuthStateChanged(auth, async (fbUser) => {
            if (!fbUser) {
                setUser(null);
                setIsLoading(false);
                return;
            }
            const uid = fbUser.uid;
            if (await hasSyncedBefore(uid)) {
                // Local copy already here: show it now, refresh behind the scenes.
                syncAndMigrate(uid);
            } else {
                // First time on this device. Screens load their data once when
                // they open, so wait for the download rather than show empty lists.
                await withTimeout(syncAndMigrate(uid), FIRST_SYNC_TIMEOUT_MS);
            }
            // They may have signed out (or switched account) while we waited.
            if (auth.currentUser?.uid !== uid) return;
            setUser({ uid, email: fbUser.email });
            setIsLoading(false);
        });
    }, []);

    // Pick up changes made on other devices when the app comes back to the front.
    useEffect(() => {
        if (!user) return;
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') syncAll(user.uid).catch(() => undefined);
        });
        return () => sub.remove();
    }, [user]);

    // Success is reported through onAuthStateChanged above, which also runs the
    // first sync, so these only need to start the request.
    const signup = async (email: string, password: string) => {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
    };

    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email.trim(), password);
    };

    const logout = async () => {
        await signOut(auth);
    };

    const resetPassword = async (email: string) => {
        await sendPasswordResetEmail(auth, email.trim());
    };

    const deleteAccount = async (password: string) => {
        const current = auth.currentUser;
        if (!current?.email) throw new Error('Not signed in.');
        await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, password));
        await wipeAccount(current.uid);
        await deleteUser(current);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, signup, login, logout, resetPassword, deleteAccount }}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
