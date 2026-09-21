import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { getWorkouts } from "../../lib/storage";
import { Workout } from "../../types/workout";
import { C } from "../../constants/theme";
import { Check } from "lucide-react-native";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function WorkoutLogDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workout, setWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    getWorkouts().then((workouts) => {
      setWorkout(workouts.find((w) => w.id === id) ?? null);
    });
  }, [id]);

  if (!workout) {
    return (
      <View style={styles.container}>
        <Text style={styles.sub}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{workout.name}</Text>
      <Text style={styles.sub}>
        {formatDate(workout.date)} · {Math.round(workout.durationSeconds / 60)} min
      </Text>

      <ScrollView contentContainerStyle={styles.list}>
        {workout.exercises.map((ex, i) => (
          <View style={styles.card} key={ex.name + i}>
            <Text style={styles.exName}>{ex.name}</Text>
            {ex.sets.length === 0 ? (
              <Text style={styles.noSets}>No sets logged</Text>
            ) : (
              ex.sets.map((set, j) => (
                <View style={styles.setRow} key={j}>
                  <Text style={styles.setLine}>
                    Set {j + 1}:  {set.weight} {workout.unit} × {set.reps} reps
                  </Text>
                  {set.done && <Check size={14} color={C.success} />}
                </View>
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, padding: 20, paddingTop: 16 },
  title: { color: C.text, fontSize: 28, fontWeight: "bold", marginBottom: 4 },
  sub: { color: C.textMuted, fontSize: 14, marginBottom: 20 },
  list: { gap: 12 },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 16 },
  exName: { color: C.text, fontSize: 16, fontWeight: "500", marginBottom: 8 },
  noSets: { color: C.textMuted, fontSize: 13 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  setLine: { color: C.textSoft, fontSize: 14 },
});