import { Link } from 'expo-router';
import {useState} from 'react';
import {useRouter}  from 'expo-router';
import {useAuth} from '../../context/AuthContext';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function Login() { 
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    const { login } = useAuth();
    const handleLogin = () => {
        const sucess = login(email, password);
        if (sucess) {
            router.replace('/(tabs)');
        } else { 
            alert ('Wrong email or password');
        }
    };
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            <TextInput style={styles.input} 
            placeholder = "Email"
            value = {email}
            onChangeText = {setEmail}
            />
            <TextInput style={styles.input} 
            placeholder = "Password"
            secureTextEntry
            value = {password}
            onChangeText = {setPassword}   
            />
            <Pressable style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Log In</Text>
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
});
