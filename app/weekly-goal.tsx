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
  container: { flex: 1, backgroundColor: "#131313", padding: 20, paddingTop: 16 },
  title: { color: "#F2F0EC", fontSize: 26, fontWeight: "bold", marginBottom: 8 },
  subtitle: { color: "#8C8A86", fontSize: 15, marginBottom: 28, lineHeight: 21 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  option: {
    width: 56, height: 56, borderRadius: 12, backgroundColor: "#1C1C1C",
    alignItems: "center", justifyContent: "center",
  },
  optionActive: { backgroundColor: "#3A3A3A" },
  optionText: { color: "#F2F0EC", fontSize: 20, fontWeight: "500" },
  optionTextActive: { color: "#F2F0EC" },
});
