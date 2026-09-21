import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AuthHeading, AuthScreen, Field, FormMessage, PrimaryButton, SwitchLink } from '../../components/AuthUI';
import { useAuth } from '../../context/AuthContext';
import { authErrorMessage } from '../../lib/authErrors';

export default function Signup() {
    const router = useRouter();
    const { signup } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const handleSignup = async () => {
        if (!email.trim() || !password) {
            setError('Enter an email and a password.');
            return;
        }
        if (!/\S+@\S+\.\S+/.test(email.trim())) {
            setError("That email address isn't valid.");
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setError('');
        setBusy(true);
        try {
            // On success the auth layout redirects once the account is ready.
            await signup(email, password);
        } catch (e) {
            setError(authErrorMessage(e));
            setBusy(false);
        }
    };

    return (
        <AuthScreen back>
            <AuthHeading title="Create your account" subtitle="Your workouts are backed up and synced across your devices." />

            <Field
                label="Email"
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />
            <Field
                label="Password"
                placeholder="Choose a password"
                hint="At least 6 characters."
                secureTextEntry
                autoComplete="new-password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleSignup}
            />

            <View style={{ height: 8 }} />
            <FormMessage error={error} />
            <PrimaryButton label="Create account" onPress={handleSignup} busy={busy} />
            <SwitchLink prompt="Already have an account?" action="Log in" onPress={() => router.replace('/login')} />
        </AuthScreen>
    );
}
