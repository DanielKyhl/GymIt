import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Achievement, getAchievements } from "../lib/achievements";
import { getWeeklyGoal, getWorkouts } from "../lib/storage";

export default function Achievements() {
  const [items, setItems] = useState<Achievement[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getWorkouts(), getWeeklyGoal()]).then(([workouts, goal]) =>
        setItems(getAchievements(workouts, goal))
      );
    }, [])
  );

  const unlockedCount = items.filter((a) => a.unlocked).length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Achievements</Text>
      <Text style={styles.subtitle}>{unlockedCount} / {items.length} unlocked</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.unlocked && styles.cardLocked]}>
            <Text style={styles.icon}>{item.unlocked ? "🏆" : "🔒"}</Text>
            <View style={styles.textCol}>
              <Text style={[styles.cardTitle, !item.unlocked && styles.lockedText]}>{item.title}</Text>
              <Text style={styles.cardSub}>{item.description}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", padding: 20, paddingTop: 60 },
  title: { color: "white", fontSize: 28, fontWeight: "bold", marginBottom: 4 },
  subtitle: { color: "#8a8a8e", fontSize: 14, marginBottom: 20 },
  list: { gap: 10 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#1c1c1e", borderRadius: 12, padding: 16,
  },
  cardLocked: { opacity: 0.5 },
  icon: { fontSize: 26 },
  textCol: { flex: 1 },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "500", marginBottom: 2 },
  lockedText: { color: "#d0d0d0" },
  cardSub: { color: "#8a8a8e", fontSize: 13 },
});
