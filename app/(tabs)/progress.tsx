import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getWorkouts } from "../../lib/storage";
import { ExerciseSummary, getTrainedExercises } from "../../lib/stats";

export default function Progress() {
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then((workouts) => setExercises(getTrainedExercises(workouts)));
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progress</Text>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Log some sets in a workout and your progress shows up here.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: "/exercise-progress/[name]", params: { name: item.name } })}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>
              Best {item.bestWeight} · est. 1RM {item.best1RM} · {item.sessionCount} sessions
            </Text>
          </TouchableOpacity>
        )}
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
  cardTitle: { color: "white", fontSize: 16, fontWeight: "500", marginBottom: 4 },
  cardSub: { color: "#8a8a8e", fontSize: 13 },
});
