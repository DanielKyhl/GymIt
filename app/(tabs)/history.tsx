import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { plural } from "../../lib/format";
import { formatRPE, workoutRPE } from "../../lib/rpe";
import { getWorkouts } from "../../lib/storage";
import { Workout } from "../../types/workout";
import { C } from "../../constants/theme";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function History() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then(setWorkouts);
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>

      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No workouts yet. Finish one to see it here.</Text>
        }
        renderItem={({ item }) => {
          const totalSets = item.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
          const rpe = workoutRPE(item);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/workout-log/${item.id}`)}
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSub}>
                {formatDate(item.date)} · {Math.round(item.durationSeconds / 60)} min · {plural(totalSets, "set")}
                {rpe !== null ? ` · RPE ${formatRPE(rpe)}` : ""}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, padding: 20, paddingTop: 60 },
  title: { color: C.text, fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  list: { gap: 10 },
  empty: { color: C.textMuted, fontSize: 15, textAlign: "center", marginTop: 40 },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 16 },
  cardTitle: { color: C.text, fontSize: 17, fontWeight: "500", marginBottom: 4 },
  cardSub: { color: C.textMuted, fontSize: 13 },
});