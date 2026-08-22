import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getWeeklyGoal, setWeeklyGoal } from "../lib/storage";

export default function WeeklyGoalScreen() {
  const router = useRouter();
  const [goal, setGoal] = useState(3);

  useFocusEffect(
    useCallback(() => {
      getWeeklyGoal().then(setGoal);
    }, [])
  );

  const pick = async (n: number) => {
    setGoal(n);
    await setWeeklyGoal(n);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly goal</Text>
      <Text style={styles.subtitle}>
        How many workouts per week are you aiming for? Hit it to earn bonus XP.
      </Text>

      <View style={styles.grid}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Pressable
            key={n}
            style={[styles.option, goal === n && styles.optionActive]}
            onPress={() => pick(n)}
          >
            <Text style={[styles.optionText, goal === n && styles.optionTextActive]}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", padding: 20, paddingTop: 16 },
  title: { color: "white", fontSize: 26, fontWeight: "bold", marginBottom: 8 },
  subtitle: { color: "#8a8a8e", fontSize: 15, marginBottom: 28, lineHeight: 21 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  option: {
    width: 56, height: 56, borderRadius: 12, backgroundColor: "#1c1c1e",
    alignItems: "center", justifyContent: "center",
  },
  optionActive: { backgroundColor: "#007AFF" },
  optionText: { color: "white", fontSize: 20, fontWeight: "500" },
  optionTextActive: { color: "white" },
});
