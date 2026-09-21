import { Link } from 'expo-router';
import {useState} from 'react';
import {useAuth} from '../../context/AuthContext';
import { authErrorMessage } from '../../lib/authErrors';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C } from "../../constants/theme";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const { login } = useAuth();
    const handleLogin = async () => {
        if (!email.trim() || !password) {
            setError("Enter your email and password.");
            return;
        }
        setError("");
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
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            <TextInput style={styles.input}
            placeholder = "Email"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value = {email}
            onChangeText = {setEmail}
            />
            <TextInput style={styles.input}
            placeholder = "Password"
            placeholderTextColor={C.textMuted}
            secureTextEntry
            value = {password}
            onChangeText = {setPassword}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.button} onPress={handleLogin} disabled={busy}>
                {busy ? (
                    <ActivityIndicator color={C.onAccent} />
                ) : (
                    <Text style={styles.buttonText}>Log In</Text>
                )}
            </Pressable>
            <Link href="/welcome" asChild>
                <Text style={styles.link}>Return</Text>
            </Link>
        </View> 
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.bg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: C.text,
        fontSize: 32,
        marginBottom: 40,
    },
    input: {
        width: '80%',
        padding: 10,
        marginBottom: 20,
        backgroundColor: C.card,
        color: C.text,
        borderRadius: 5,
    },
    button: {
        backgroundColor: C.accent,
        paddingVertical: 10,
        paddingHorizontal: 40,
        borderRadius: 5,
        marginBottom: 20,
    },
    buttonText: {
        color: C.onAccent,
        fontSize: 18,
    },
    link: {
        color: C.accent,
        fontSize: 16,
    },
    error: {
        color: C.danger,
        marginBottom: 16,
        width: '80%',
        textAlign: 'center',
    },
});
