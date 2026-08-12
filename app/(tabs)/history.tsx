import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { getWorkouts } from "../../lib/storage";
import { Workout } from "../../types/workout";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function History() {
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
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSub}>
                {formatDate(item.date)} · {Math.round(item.durationSeconds / 60)} min · {totalSets} sets
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", padding: 20, paddingTop: 60 },
  title: { color: "white", fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  list: { gap: 10 },
  empty: { color: "#8a8a8e", fontSize: 15, textAlign: "center", marginTop: 40 },
  card: { backgroundColor: "#1c1c1e", borderRadius: 12, padding: 16 },
  cardTitle: { color: "white", fontSize: 17, fontWeight: "500", marginBottom: 4 },
  cardSub: { color: "#8a8a8e", fontSize: 13 },
});