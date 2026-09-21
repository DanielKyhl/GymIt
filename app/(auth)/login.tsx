import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AuthHeading, AuthScreen, Field, FormMessage, PrimaryButton, SwitchLink } from '../../components/AuthUI';
import { C, HIT } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { authErrorMessage } from '../../lib/authErrors';

export default function Login() {
    const router = useRouter();
    const { login, resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [busy, setBusy] = useState(false);

    const handleLogin = async () => {
        setInfo('');
        if (!email.trim() || !password) {
            setError('Enter your email and password.');
            return;
        }
        setError('');
        setBusy(true);
        try {
            // On success the auth layout redirects once the account has loaded,
            // so the button stays busy until this screen goes away.
            await login(email, password);
        } catch (e) {
            setError(authErrorMessage(e));
            setBusy(false);
        }
    };

    const handleForgot = async () => {
        setError('');
        setInfo('');
        if (!email.trim()) {
            setError('Enter your email above, then tap "Forgot password?" again.');
            return;
        }
        // Same message whether or not the account exists, on purpose, so nobody
        // can use this to find out which emails have accounts.
        const sent = `If ${email.trim()} has an account, a reset link is on its way. Check your spam folder too.`;
        try {
            await resetPassword(email);
            setInfo(sent);
        } catch (e) {
            if ((e as { code?: string })?.code === 'auth/user-not-found') setInfo(sent);
            else setError(authErrorMessage(e));
        }
    };

    return (
        <AuthScreen back>
            <AuthHeading title="Welcome back" subtitle="Log in to pick up where you left off." />

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
                placeholder="Your password"
                secureTextEntry
                autoComplete="current-password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleLogin}
            />
            <Pressable style={styles.forgot} onPress={handleForgot} hitSlop={HIT}>
                <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            <FormMessage error={error} info={info} />
            <PrimaryButton label="Log in" onPress={handleLogin} busy={busy} />
            <SwitchLink prompt="New here?" action="Create an account" onPress={() => router.replace('/signup')} />
        </AuthScreen>
    );
}

const styles = StyleSheet.create({
    forgot: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 20 },
    forgotText: { color: C.accent, fontSize: 14, fontWeight: '500' },
});
