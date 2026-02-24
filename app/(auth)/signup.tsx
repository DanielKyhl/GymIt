import {Link} from "expo-router";
import {Pressable, StyleSheet, Text, TextInput, View} from "react-native";

export default function Signup() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sign Up</Text>
            <TextInput style={styles.input} placeholder="Email" />
            <TextInput style={styles.input} placeholder="Password" secureTextEntry />
            <Pressable style={styles.button}>
                <Text style={styles.buttonText}>Sign Up</Text>
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
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
    },  
    title: {
        color: 'white',
        fontSize: 32,
        marginBottom: 40,
    },
    input: {
        width: '80%',
        padding: 10,
        marginBottom: 20,
        backgroundColor: '#222',
        color: 'white',
        borderRadius: 5,
    },  
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 10,
        paddingHorizontal: 40,
        borderRadius: 5,
        marginBottom: 20,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
    },
    link: {
        color: '#007AFF',
        fontSize: 16,
    },
});