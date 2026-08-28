import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { VolumeChart } from "../../components/VolumeChart";
import { plural } from "../../lib/format";
import { getWorkouts } from "../../lib/storage";
import { ExerciseSummary, getTrainedExercises, getVolumeHistory } from "../../lib/stats";

export default function Progress() {
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [volHistory, setVolHistory] = useState<{ date: string; volume: number }[]>([]);

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then((workouts) => {
        setExercises(getTrainedExercises(workouts));
        setVolHistory(getVolumeHistory(workouts));
      });
    }, [])
  );

  const recent = volHistory.slice(-8);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progress</Text>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.section}>Total weight per workout</Text>
            {recent.length === 0 ? (
              <Text style={styles.chartEmpty}>Finish a workout to see your volume trend.</Text>
            ) : (
              <VolumeChart data={recent} />
            )}
            <Text style={styles.section}>Exercises</Text>
          </View>
        }
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
              Best {item.bestWeight} · est. 1RM {item.best1RM} · {plural(item.sessionCount, "session")}
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
  section: { color: "#8a8a8e", fontSize: 13, textTransform: "uppercase", marginBottom: 12, marginTop: 8 },
  chartEmpty: { color: "#8a8a8e", fontSize: 14, marginBottom: 20 },
  list: { gap: 10 },
  empty: { color: "#8a8a8e", fontSize: 15, textAlign: "center", marginTop: 20 },
  card: { backgroundColor: "#1c1c1e", borderRadius: 12, padding: 16 },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "500", marginBottom: 4 },
  cardSub: { color: "#8a8a8e", fontSize: 13 },
});
