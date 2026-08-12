import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getTemplates, saveWorkout } from "../../lib/storage";
import { Template, Workout, WorkoutExercise } from "../../types/workout";

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
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [rest, setRest] = useState(0);

  useEffect(() => {
    getTemplates().then((templates) => {
      const found = templates.find((t) => t.id === id) ?? null;
      setTemplate(found);
      if (found) {
        setExercises(found.exercises.map((e) => ({ name: e.name, sets: [] })));
      }
    });
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const resting = rest > 0;
  useEffect(() => {
    if (!resting) return;
    const interval = setInterval(() => setRest((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(interval);
  }, [resting]);

  const addSet = (exIndex: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? { ...ex, sets: [...ex.sets, { weight: 0, reps: 0, done: false }] }
          : ex
      )
    );
  };

  const updateSet = (exIndex: number, setIndex: number, field: "weight" | "reps", value: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? { ...ex, sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, [field]: value } : s)) }
          : ex
      )
    );
  };

  const toggleDone = (exIndex: number, setIndex: number) => {
    const wasDone = exercises[exIndex].sets[setIndex].done;
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? { ...ex, sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, done: !s.done } : s)) }
          : ex
      )
    );
    if (!wasDone) setRest(90);
  };

  const handleEnd = async () => {
    if (!template) return;
    await saveWorkout({
      id: Date.now().toString(),
      name: template.name,
      date: new Date().toISOString(),
      durationSeconds: seconds,
      unit,
      exercises,
    });
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

      <View style={styles.unitToggle}>
        <Pressable
          style={[styles.unitButton, unit === "kg" && styles.unitActive]}
          onPress={() => setUnit("kg")}
        >
          <Text style={styles.unitText}>kg</Text>
        </Pressable>
        <Pressable
          style={[styles.unitButton, unit === "lb" && styles.unitActive]}
          onPress={() => setUnit("lb")}
        >
          <Text style={styles.unitText}>lb</Text>
        </Pressable>
      </View>

      {rest > 0 && (
        <View style={styles.restBanner}>
          <Text style={styles.restText}>Rest {formatTime(rest)}</Text>
          <Pressable onPress={() => setRest(0)}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {exercises.map((ex, exIndex) => (
          <View style={styles.exerciseCard} key={ex.name + exIndex}>
            <Text style={styles.exerciseName}>{ex.name}</Text>

            {ex.sets.map((set, setIndex) => (
              <View style={styles.setRow} key={setIndex}>
                <Text style={styles.setNum}>{setIndex + 1}</Text>
                <TextInput
                  style={styles.setInput}
                  keyboardType="numeric"
                  placeholder={unit}
                  placeholderTextColor="#8a8a8e"
                  value={set.weight ? String(set.weight) : ""}
                  onChangeText={(v) => updateSet(exIndex, setIndex, "weight", Number(v) || 0)}
                />
                <TextInput
                  style={styles.setInput}
                  keyboardType="numeric"
                  placeholder="reps"
                  placeholderTextColor="#8a8a8e"
                  value={set.reps ? String(set.reps) : ""}
                  onChangeText={(v) => updateSet(exIndex, setIndex, "reps", Number(v) || 0)}
                />
                <Pressable onPress={() => toggleDone(exIndex, setIndex)}>
                  <Text style={styles.check}>{set.done ? "✓" : "○"}</Text>
                </Pressable>
              </View>
            ))}

            <Pressable onPress={() => addSet(exIndex)}>
              <Text style={styles.addSet}>+ Add set</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Pressable style={styles.endButton} onPress={handleEnd}>
        <Text style={styles.endText}>End workout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", padding: 20, paddingTop: 60 },
  name: { color: "white", fontSize: 22, fontWeight: "500", textAlign: "center" },
  timer: { color: "#007AFF", fontSize: 48, fontWeight: "bold", textAlign: "center", marginBottom: 16 },
  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingBottom: 12 },
  exerciseCard: { backgroundColor: "#1c1c1e", borderRadius: 12, padding: 14 },
  exerciseName: { color: "white", fontSize: 16, fontWeight: "500", marginBottom: 10 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  setNum: { color: "#8a8a8e", fontSize: 14, width: 20 },
  setInput: { flex: 1, backgroundColor: "#2c2c2e", color: "white", textAlign: "center", padding: 8, borderRadius: 6 },
  check: { color: "#1d9e75", fontSize: 22, width: 30, textAlign: "center" },
  addSet: { color: "#007AFF", fontSize: 14, marginTop: 4 },
  unitToggle: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 12 },
  unitButton: { paddingVertical: 6, paddingHorizontal: 20, borderRadius: 8, backgroundColor: "#1c1c1e" },
  unitActive: { backgroundColor: "#007AFF" },
  unitText: { color: "white", fontSize: 14 },
  restBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#2c2c1a", borderRadius: 10, padding: 12, marginBottom: 12 },
  restText: { color: "#fac775", fontSize: 16, fontWeight: "500" },
  skipText: { color: "#8a8a8e", fontSize: 14 },
  endButton: { backgroundColor: "#c0392b", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 12 },
  endText: { color: "white", fontSize: 16, fontWeight: "500" },
});