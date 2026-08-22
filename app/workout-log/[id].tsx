import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { getWorkouts } from "../../lib/storage";
import { Workout } from "../../types/workout";

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
                <Text style={styles.setLine} key={j}>
                  Set {j + 1}:  {set.weight} {workout.unit} × {set.reps} reps {set.done ? " ✓" : ""}
                </Text>
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", padding: 20, paddingTop: 16 },
  title: { color: "white", fontSize: 28, fontWeight: "bold", marginBottom: 4 },
  sub: { color: "#8a8a8e", fontSize: 14, marginBottom: 20 },
  list: { gap: 12 },
  card: { backgroundColor: "#1c1c1e", borderRadius: 12, padding: 16 },
  exName: { color: "white", fontSize: 16, fontWeight: "500", marginBottom: 8 },
  noSets: { color: "#8a8a8e", fontSize: 13 },
  setLine: { color: "#d0d0d0", fontSize: 14, marginBottom: 4 },
});