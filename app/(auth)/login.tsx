import { Link } from 'expo-router';
import {useState} from 'react';
import {useAuth} from '../../context/AuthContext';
import { authErrorMessage } from '../../lib/authErrors';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
            placeholderTextColor="#8C8A86"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value = {email}
            onChangeText = {setEmail}
            />
            <TextInput style={styles.input}
            placeholder = "Password"
            placeholderTextColor="#8C8A86"
            secureTextEntry
            value = {password}
            onChangeText = {setPassword}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.button} onPress={handleLogin} disabled={busy}>
                {busy ? (
                    <ActivityIndicator color="#171614" />
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
        backgroundColor: '#131313',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: '#F2F0EC',
        fontSize: 32,
        marginBottom: 40,
    },
    input: {
        width: '80%',
        padding: 10,
        marginBottom: 20,
        backgroundColor: '#1C1C1C',
        color: '#F2F0EC',
        borderRadius: 5,
    },
    button: {
        backgroundColor: "#D9D5CE",
        paddingVertical: 10,
        paddingHorizontal: 40,
        borderRadius: 5,
        marginBottom: 20,
    },
    buttonText: {
        color: "#171614",
        fontSize: 18,
    },
    link: {
        color: '#D9D5CE',
        fontSize: 16,
    },
    error: {
        color: '#E5544B',
        marginBottom: 16,
        width: '80%',
        textAlign: 'center',
    },
});
