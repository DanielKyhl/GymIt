import { View, Text, StyleSheet, Button } from "react-native";
import { useState } from "react";

export default function HomeScreen() {
  const [workouts, setWorkouts] = useState(0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GymIt 💪</Text>

      <Text style={styles.counter}>
        Workouts completed: {workouts}
      </Text>

      <Button
        title="Add Workout"
        onPress={() => setWorkouts(workouts + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
  },
  counter: {
    color: "white",
    fontSize: 18,
    marginBottom: 20,
  },
});
