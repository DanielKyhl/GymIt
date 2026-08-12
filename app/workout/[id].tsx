import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { getTemplates, saveWorkout } from "../../lib/storage";
import { Template, Workout } from "../../types/workout";

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}`;
}

export default function ActiveWorkout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    getTemplates().then((templates) => {
      setTemplate(templates.find((t) => t.id === id) ?? null);
    });
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEnd = async () => {
    if (!template) return;
    const workout: Workout = {
      id: Date.now().toString(),
      name: template.name,
      date: new Date().toISOString(),
      durationSeconds: seconds,
      unit: "kg",
      exercises: template.exercises.map((e) => ({ name: e.name, sets: [] })),
    };
    await saveWorkout(workout);
    router.replace("/(tabs)");
  };

  if (!template) {
    return (
      <View style={styles.container}>
        <Text style={styles.timer}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{template.name}</Text>
      <Text style={styles.timer}>{formatTime(seconds)}</Text>

      <FlatList
        data={template.exercises}
        keyExtractor={(item, index) => item.name + index}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>{item.name}</Text>
          </View>
        )}
      />

      <Pressable style={styles.endButton} onPress={handleEnd}>
        <Text style={styles.endText}>End workout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", padding: 20, paddingTop: 60 },
  name: { color: "white", fontSize: 22, fontWeight: "500", textAlign: "center" },
  timer: { color: "#007AFF", fontSize: 48, fontWeight: "bold", textAlign: "center", marginBottom: 24 },
  list: { gap: 10 },
  row: { backgroundColor: "#1c1c1e", borderRadius: 12, padding: 16 },
  rowText: { color: "white", fontSize: 16 },
  endButton: {
    backgroundColor: "#c0392b", borderRadius: 12, padding: 16,
    alignItems: "center", marginTop: 12,
  },
  endText: { color: "white", fontSize: 16, fontWeight: "500" },
});