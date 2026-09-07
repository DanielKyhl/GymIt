import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import {useAuth} from '../../context/AuthContext';

export default function Signup() {
    const router = useRouter();
    const { signup } = useAuth();

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
        signup(email, password);
        router.replace("/(tabs)");
    };
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sign Up</Text>

            <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#8C8A86"
             value={email}
            onChangeText={setEmail}
            />

            <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor = "#8C8A86"
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
        backgroundColor: '#131313',
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        color: '#F2F0EC',
        fontSize: 32,
        marginBottom: 20,
    }, 
    input: {
        backgroundColor: '#1C1C1C',
        color: '#F2F0EC',
        padding: 12,
        marginBottom: 15,
        borderRadius: 6,
    }, 
    error: {
        color: 'red',
        marginBottom: 10,
    },
});
