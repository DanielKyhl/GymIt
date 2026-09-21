import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import {useAuth} from '../../context/AuthContext';
import { authErrorMessage } from '../../lib/authErrors';
import { C } from "../../constants/theme";

export default function Signup() {
    const { signup } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const validateEmail = (email: string) => {
        return /\S+@\S+\.\S+/.test(email);
    };
    const handleSignup = async () => {
        if (!email || !password) {
            setError("Please fill in all fields.");
            return;
        }
        if (!validateEmail(email)) {
            setError("Please enter a valid email address.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }
        setError("");
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
        <View style={styles.container}>
            <Text style={styles.title}>Sign Up</Text>

            <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
             value={email}
            onChangeText={setEmail}
            />

            <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={C.textMuted}
            secureTextEntry
            value = {password}
            onChangeText={setPassword}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
                title={busy ? "Creating account…" : "Create Account"}
                onPress={handleSignup}
                disabled={busy}
            />
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.bg,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        color: C.text,
        fontSize: 32,
        marginBottom: 20,
    }, 
    input: {
        backgroundColor: C.card,
        color: C.text,
        padding: 12,
        marginBottom: 15,
        borderRadius: 6,
    }, 
    error: {
        color: 'red',
        marginBottom: 10,
    },
});
