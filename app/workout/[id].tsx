import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ExercisePicker } from "../../components/ExercisePicker";
import { getLastPerformance } from "../../lib/stats";
import { summarizeWorkout } from "../../lib/summary";
import { getDefaultRest, getDefaultUnit, getTemplates, getWeeklyGoal, getWorkouts, saveWorkout } from "../../lib/storage";
import { Template, Workout, WorkoutExercise, WorkoutSet } from "../../types/workout";

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
  const [defaultRest, setDefaultRest] = useState(120);
  const [restTarget, setRestTarget] = useState<number | null>(null);
  const [restElapsed, setRestElapsed] = useState(0);
  const [pastWorkouts, setPastWorkouts] = useState<Workout[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    getTemplates().then(async (templates) => {
      const found = templates.find((t) => t.id === id) ?? null;
      setTemplate(found);
      if (found) {
                setExercises(
          found.exercises.map((e) => ({
            name: e.name,
            sets: (e.sets ?? []).map((s) => ({ ...s, done: false })),
          }))
        );
        const def = await getDefaultRest();
        setDefaultRest(found.restSeconds ?? def);
        setPastWorkouts(await getWorkouts());
      }
    });
  }, [id]);

  useEffect(() => {
    getDefaultUnit().then(setUnit);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (restTarget === null) return;
    const interval = setInterval(() => setRestElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [restTarget]);

  const addExerciseToWorkout = (name: string) => {
    setExercises((prev) => [...prev, { name, sets: [] }]);
    setShowAdd(false);
  };

  const addSet = (exIndex: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? { ...ex, sets: [...ex.sets, { weight: 0, reps: 0, done: false, restSeconds: defaultRest }] }
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

  const setRestForSet = (exIndex: number, setIndex: number, seconds: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? { ...ex, sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, restSeconds: seconds } : s)) }
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
    if (!wasDone) {
      const r = exercises[exIndex].sets[setIndex].restSeconds;
      if (r && r > 0) {
        setRestTarget(r);
        setRestElapsed(0);
      }
    }
  };

  const toggleSetType = (exIndex: number, setIndex: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j === setIndex ? { ...s, type: s.type === "warmup" ? "normal" : "warmup" } : s
              ),
            }
          : ex
      )
    );
  };

  const handleEnd = async () => {
    if (!template) return;
    const workout: Workout = {
      id: Date.now().toString(),
      name: template.name,
      date: new Date().toISOString(),
      durationSeconds: seconds,
      unit,
      exercises,
    };
    await saveWorkout(workout);
    const goal = await getWeeklyGoal();
    const s = summarizeWorkout(pastWorkouts, workout, goal);
    router.replace({
      pathname: "/workout-summary",
      params: {
        xp: String(s.xpGained),
        level: String(s.levelAfter),
        leveledUp: s.leveledUp ? "1" : "0",
        prs: String(s.newPRs),
        achievements: JSON.stringify(s.newAchievements),
        volume: String(s.volume),
        unit,
      },
    });
  };

  const handleDiscard = () => {
    const proceed = () => router.replace("/(tabs)");
    if (Platform.OS === "web") {
      if (window.confirm("Discard this workout? Nothing will be saved.")) proceed();
      return;
    }
    Alert.alert("Discard workout", "Nothing will be saved.", [
      { text: "Cancel", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: proceed },
    ]);
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

      <Text style={styles.tip}>Tip: tap a set&apos;s number to mark it a warm-up (W)</Text>

      {restTarget !== null && (
        <View style={[styles.restBanner, restElapsed >= restTarget && styles.restBannerOver]}>
          <Text style={[styles.restText, restElapsed >= restTarget && styles.restTextOver]}>
            Rest {formatTime(restElapsed)} / {formatTime(restTarget)}
          </Text>
          <Pressable onPress={() => setRestTarget(null)}>
            <Text style={styles.skipText}>Done</Text>
          </Pressable>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {exercises.map((ex, exIndex) => {
          const prev = getLastPerformance(pastWorkouts, ex.name);
          return (
            <View style={styles.exerciseCard} key={ex.name + exIndex}>
              <Text style={styles.exerciseName}>{ex.name}</Text>

              <View style={styles.setRow}>
                <Text style={[styles.setNum, styles.colHead]}>Set</Text>
                <Text style={[styles.prev, styles.colHead]}>Prev</Text>
                <Text style={[styles.colHead, styles.colFlex]}>{unit}</Text>
                <Text style={[styles.colHead, styles.colFlex]}>Reps</Text>
                <Text style={[styles.colHead, { width: 30 }]}>✓</Text>
              </View>

              {ex.sets.map((set, setIndex) => (
                <View key={setIndex}>
                  <View style={styles.setRow}>
                    <Pressable onPress={() => toggleSetType(exIndex, setIndex)}>
                      <Text style={[styles.setNum, set.type === "warmup" && styles.warmupNum]}>
                        {set.type === "warmup" ? "W" : setIndex + 1}
                      </Text>
                    </Pressable>
                    <Text style={styles.prev}>
                      {prev[setIndex] ? `${prev[setIndex].weight} × ${prev[setIndex].reps}` : "–"}
                    </Text>
                    <TextInput
                      style={styles.setInput}
                      keyboardType="numeric"
                      placeholder={prev[setIndex] ? String(prev[setIndex].weight) : unit}
                      placeholderTextColor="#8C8A86"
                      value={set.weight ? String(set.weight) : ""}
                      onChangeText={(v) => updateSet(exIndex, setIndex, "weight", Number(v) || 0)}
                    />
                    <TextInput
                      style={styles.setInput}
                      keyboardType="numeric"
                      placeholder={prev[setIndex] ? String(prev[setIndex].reps) : "reps"}
                      placeholderTextColor="#8C8A86"
                      value={set.reps ? String(set.reps) : ""}
                      onChangeText={(v) => updateSet(exIndex, setIndex, "reps", Number(v) || 0)}
                    />
                    <Pressable onPress={() => toggleDone(exIndex, setIndex)}>
                      <Text style={styles.check}>{set.done ? "✓" : "○"}</Text>
                    </Pressable>
                  </View>

                  {set.restSeconds ? (
                    <View style={styles.restEditRow}>
                      <Text style={styles.restEditLabel}>⏱ Rest</Text>
                      <TextInput
                        style={styles.restEditInput}
                        keyboardType="numeric"
                        value={String(set.restSeconds)}
                        onChangeText={(v) => setRestForSet(exIndex, setIndex, Number(v) || 0)}
                      />
                      <Text style={styles.restEditUnit}>s</Text>
                      <Pressable onPress={() => setRestForSet(exIndex, setIndex, 0)}>
                        <Text style={styles.restDelete}>✕</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={() => setRestForSet(exIndex, setIndex, defaultRest)}>
                      <Text style={styles.addRest}>+ Add rest</Text>
                    </Pressable>
                  )}
                </View>
              ))}

              <Pressable onPress={() => addSet(exIndex)}>
                <Text style={styles.addSet}>+ Add set</Text>
              </Pressable>
            </View>
          );
        })}

        <Pressable style={styles.addExerciseBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addExerciseText}>+ Add exercise</Text>
        </Pressable>
      </ScrollView>

      <ExercisePicker
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSelect={addExerciseToWorkout}
      />

      <Pressable style={styles.endButton} onPress={handleEnd}>
        <Text style={styles.endText}>End workout</Text>
      </Pressable>
      <Pressable style={styles.discardBtn} onPress={handleDiscard}>
        <Text style={styles.discardText}>Discard workout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#131313", padding: 20, paddingTop: 16 },
  name: { color: "#F2F0EC", fontSize: 22, fontWeight: "500", textAlign: "center" },
  timer: { color: "#D9D5CE", fontSize: 48, fontWeight: "bold", textAlign: "center", marginBottom: 16 },
  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingBottom: 12 },
  exerciseCard: { backgroundColor: "#1C1C1C", borderRadius: 12, padding: 14 },
  exerciseName: { color: "#F2F0EC", fontSize: 16, fontWeight: "500", marginBottom: 10 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  setNum: { color: "#8C8A86", fontSize: 14, width: 24, textAlign: "center" },
  warmupNum: { color: "#e6b800", fontWeight: "bold" },
  prev: { flex: 1, color: "#6E6C68", fontSize: 13, paddingLeft: 4 },
  colHead: { color: "#6E6C68", fontSize: 11 },
  colFlex: { width: 56, textAlign: "center" },
  tip: { color: "#6E6C68", fontSize: 11, textAlign: "center", marginBottom: 10 },
  setInput: { width: 56, backgroundColor: "#272727", color: "#F2F0EC", textAlign: "center", padding: 8, borderRadius: 6 },
  check: { color: "#1d9e75", fontSize: 22, width: 30, textAlign: "center" },
  addSet: { color: "#D9D5CE", fontSize: 14, marginTop: 4 },
  addExerciseBtn: {
    alignItems: "center", paddingVertical: 12, borderWidth: 0.5, borderColor: "#272727",
    borderRadius: 10, borderStyle: "dashed",
  },
  addExerciseText: { color: "#D9D5CE", fontSize: 15 },
  restBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1C1C1C", borderRadius: 10, padding: 12, marginBottom: 12 },
  restText: { color: "#fac775", fontSize: 16, fontWeight: "500" },
  restBannerOver: { backgroundColor: "#3A2020" },
  restTextOver: { color: "#E5544B" },
  skipText: { color: "#8C8A86", fontSize: 14 },
  restEditRow: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 24, marginBottom: 10 },
  restEditLabel: { color: "#6E6C68", fontSize: 12 },
  restEditInput: { backgroundColor: "#272727", color: "#B5B1AA", fontSize: 12, textAlign: "center", paddingVertical: 4, width: 46, borderRadius: 6 },
  restEditUnit: { color: "#6E6C68", fontSize: 12 },
  restDelete: { color: "#6E6C68", fontSize: 14, marginLeft: 4 },
  addRest: { color: "#D9D5CE", fontSize: 12, marginLeft: 24, marginBottom: 10 },
  endButton: { backgroundColor: "#D9D5CE", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 12 },
  endText: { color: "#171614", fontSize: 16, fontWeight: "500" },
  discardBtn: { alignItems: "center", paddingVertical: 10, marginTop: 2 },
  discardText: { color: "#8C8A86", fontSize: 14 },
});