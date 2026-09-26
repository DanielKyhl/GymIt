import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity } from "react-native";
import { C } from "../constants/theme";
import { plural } from "../lib/format";
import { ExerciseSummary, getTrainedExercises } from "../lib/stats";
import { getWorkoutsForStats } from "../lib/storage";

// Every exercise you've logged, each opening its own progress (chart, PRs).
// Reached from the Progress tab, where a list this long would crowd out the
// rest of the page.
export default function Exercises() {
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseSummary[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      getWorkoutsForStats().then((workouts) => setExercises(getTrainedExercises(workouts)));
    }, [])
  );

  return (
    <FlatList
      style={styles.container}
      data={exercises ?? []}
      keyExtractor={(item) => item.name}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        exercises ? <Text style={styles.empty}>Log some sets in a workout and your exercises show up here.</Text> : null
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push({ pathname: "/exercise-progress/[name]", params: { name: item.name } })}
        >
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSub}>
            Best {item.bestWeight} · est. 1RM {item.best1RM} · {plural(item.sessionCount, "session")}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  list: { gap: 10, padding: 20, paddingBottom: 40 },
  empty: { color: C.textMuted, fontSize: 15, textAlign: "center", marginTop: 20 },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 16 },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: "500", marginBottom: 4 },
  cardSub: { color: C.textMuted, fontSize: 13 },
});
