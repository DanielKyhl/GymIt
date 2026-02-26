import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

export default function Signup() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const validateEmail = (email: string) => {
        return /\S+@\S+\.\S+/.test(email);
    };
    const handleSignup = () => {
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
        router.replace("/welcome");
    };
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sign Up</Text>

            <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#aaa"
             value={email}
            onChangeText={setEmail}
            />

            <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor = "#aaa"
            secureTextEntry
            value = {password}
            onChangeText={setPassword}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Create Account" onPress={handleSignup} />
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        color: 'white',
        fontSize: 32,
        marginBottom: 20,
    }, 
    input: {
        backgroundColor: '#222',
        color: 'white',
        padding: 12,
        marginBottom: 15,
        borderRadius: 6,
    }, 
    error: {
        color: 'red',
        marginBottom: 10,
    },
});
