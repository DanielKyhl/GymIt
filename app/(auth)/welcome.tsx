import { View, Text, StyleSheet, Button } from "react-native";
import { Link } from "expo-router";
import { C } from "../../constants/theme";

export default function Welcome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>GymIt</Text>

      <Link href="/login" asChild>
        <Button title="Log In" onPress={() => {}} />
      </Link>

      <Link href="/signup" asChild>
        <Button title="Sign Up" onPress={() => {}} />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: C.text,
    fontSize: 32,
    marginBottom: 40,
  },
});