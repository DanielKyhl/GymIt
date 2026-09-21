import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Achievement, getAchievements } from "../lib/achievements";
import { getWeeklyGoal, getWorkoutsForStats } from "../lib/storage";
import { C } from "../constants/theme";
import { Lock, Trophy } from "lucide-react-native";

export default function Achievements() {
  const [items, setItems] = useState<Achievement[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getWorkoutsForStats(), getWeeklyGoal()]).then(([workouts, goal]) =>
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
            <View style={styles.icon}>
              {item.unlocked ? <Trophy size={24} color={C.signal} /> : <Lock size={22} color={C.textFaint} />}
            </View>
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
  container: { flex: 1, backgroundColor: C.bg, padding: 20, paddingTop: 16 },
  title: { color: C.text, fontSize: 28, fontWeight: "bold", marginBottom: 4 },
  subtitle: { color: C.textMuted, fontSize: 14, marginBottom: 20 },
  list: { gap: 10 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.card, borderRadius: 12, padding: 16,
  },
  cardLocked: { opacity: 0.5 },
  icon: { width: 28, alignItems: "center" },
  textCol: { flex: 1 },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: "500", marginBottom: 2 },
  lockedText: { color: C.textSoft },
  cardSub: { color: C.textMuted, fontSize: 13 },
});
