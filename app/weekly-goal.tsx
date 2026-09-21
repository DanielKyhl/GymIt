import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getWeeklyGoal, setWeeklyGoal } from "../lib/storage";
import { C } from "../constants/theme";

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
        How many workouts per week are you aiming for? Two sessions in one day
        count as two. Hit your goal to earn bonus XP.
      </Text>

      <View style={styles.grid}>
        {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
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
  container: { flex: 1, backgroundColor: C.bg, padding: 20, paddingTop: 16 },
  title: { color: C.text, fontSize: 26, fontWeight: "bold", marginBottom: 8 },
  subtitle: { color: C.textMuted, fontSize: 15, marginBottom: 28, lineHeight: 21 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  option: {
    width: 56, height: 56, borderRadius: 12, backgroundColor: C.card,
    alignItems: "center", justifyContent: "center",
  },
  optionActive: { backgroundColor: C.selected },
  optionText: { color: C.text, fontSize: 20, fontWeight: "500" },
  optionTextActive: { color: C.text },
});
