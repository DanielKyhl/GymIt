import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, Circle, CircleCheck, Timer, X } from "lucide-react-native";
import { ExercisePicker } from "../../components/ExercisePicker";
import { NumberInput } from "../../components/NumberInput";
import { BodyWeight, startingWeight } from "../../lib/bodyweight";
import { isBodyweight } from "../../lib/exercises";
import { getLastPerformance } from "../../lib/stats";
import { summarizeWorkout } from "../../lib/summary";
import { getBodyWeight, getDefaultRest, getDefaultUnit, getTemplates, getWeeklyGoal, getWorkouts, saveWorkout } from "../../lib/storage";
import { convertWeight, normalizeUnits } from "../../lib/units";
import { Template, Workout, WorkoutExercise, WorkoutSet } from "../../types/workout";
import { C, HIT, T } from "../../constants/theme";

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
  const [bodyWeight, setBodyWeightValue] = useState<BodyWeight | null>(null);

  useEffect(() => {
    getTemplates().then(async (templates) => {
      const found = templates.find((t) => t.id === id) ?? null;
      setTemplate(found);
      if (found) {
        const [bw, u] = await Promise.all([getBodyWeight(), getDefaultUnit()]);
        setBodyWeightValue(bw);
        setExercises(
          found.exercises.map((e) => ({
            name: e.name,
            // Bodyweight exercises are saved in templates as "BW" (0) and
            // start at your current body weight.
            sets: (e.sets ?? []).map((s) => ({
              ...s,
              weight: s.weight || startingWeight(e.name, bw, u),
              done: false,
            })),
          }))
        );
        const def = await getDefaultRest();
        setDefaultRest(found.restSeconds ?? def);
        // In the current unit, so "Prev" hints and PRs compare like with like.
        setPastWorkouts(normalizeUnits(await getWorkouts(), u));
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
          ? {
              ...ex,
              sets: [
                ...ex.sets,
                {
                  weight: startingWeight(ex.name, bodyWeight, unit),
                  reps: 0,
                  done: false,
                  restSeconds: defaultRest,
                },
              ],
            }
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
              <Text style={[styles.exerciseName, isBodyweight(ex.name) && styles.exerciseNameTight]}>{ex.name}</Text>
              {isBodyweight(ex.name) && (
                <Text style={styles.bwNote}>
                  {bodyWeight
                    ? `Bodyweight · uses your ${convertWeight(bodyWeight.value, bodyWeight.unit, unit)} ${unit}`
                    : "Bodyweight · add your weight in Settings"}
                </Text>
              )}

              <View style={styles.setRow}>
                <Text style={[styles.setNum, styles.colHead]}>Set</Text>
                <Text style={[styles.prev, styles.colHead]}>Prev</Text>
                <Text style={[styles.colHead, styles.colFlex]}>{unit}</Text>
                <Text style={[styles.colHead, styles.colFlex]}>Reps</Text>
                <View style={styles.checkCol}>
                  <Check size={14} color={C.textFaint} />
                </View>
              </View>

              {ex.sets.map((set, setIndex) => (
                <View key={setIndex}>
                  <View style={styles.setRow}>
                    <Pressable onPress={() => toggleSetType(exIndex, setIndex)} hitSlop={HIT}>
                      <Text style={[styles.setNum, set.type === "warmup" && styles.warmupNum]}>
                        {set.type === "warmup" ? "W" : setIndex + 1}
                      </Text>
                    </Pressable>
                    <Text style={styles.prev}>
                      {prev[setIndex]
                        ? `${!prev[setIndex].weight && isBodyweight(ex.name) ? "BW" : prev[setIndex].weight} × ${prev[setIndex].reps}`
                        : "–"}
                    </Text>
                    <NumberInput
                      style={styles.setInput}
                      placeholder={prev[setIndex]?.weight ? String(prev[setIndex].weight) : unit}
                      placeholderTextColor={C.textFaint}
                      value={set.weight}
                      onChangeValue={(v) => updateSet(exIndex, setIndex, "weight", v)}
                    />
                    <NumberInput
                      style={styles.setInput}
                      decimals={false}
                      placeholder={prev[setIndex] ? String(prev[setIndex].reps) : "reps"}
                      placeholderTextColor={C.textFaint}
                      value={set.reps}
                      onChangeValue={(v) => updateSet(exIndex, setIndex, "reps", v)}
                    />
                    <Pressable
                      style={styles.checkCol}
                      onPress={() => toggleDone(exIndex, setIndex)}
                      hitSlop={HIT}
                      accessibilityLabel={set.done ? "Mark set not done" : "Mark set done"}
                    >
                      {set.done ? (
                        <CircleCheck size={26} color={C.success} />
                      ) : (
                        <Circle size={26} color={C.textFaint} />
                      )}
                    </Pressable>
                  </View>

                  {set.restSeconds ? (
                    <View style={styles.restEditRow}>
                      <Timer size={13} color={C.textFaint} />
                      <Text style={styles.restEditLabel}>Rest</Text>
                      <NumberInput
                        style={styles.restEditInput}
                        decimals={false}
                        value={set.restSeconds}
                        onChangeValue={(v) => setRestForSet(exIndex, setIndex, v)}
                      />
                      <Text style={styles.restEditUnit}>s</Text>
                      <Pressable
                        onPress={() => setRestForSet(exIndex, setIndex, 0)}
                        hitSlop={HIT}
                        accessibilityLabel="Remove rest"
                        style={styles.restDelete}
                      >
                        <X size={16} color={C.textFaint} />
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
  container: { flex: 1, backgroundColor: C.bg, padding: 20, paddingTop: 16 },
  name: { color: C.text, fontSize: 22, fontWeight: "500", textAlign: "center" },
  timer: { ...T.numBig, fontSize: 52, color: C.accent, textAlign: "center", marginBottom: 16 },
  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingBottom: 12 },
  exerciseCard: { backgroundColor: C.card, borderRadius: 12, padding: 14 },
  exerciseName: { color: C.text, fontSize: 16, fontWeight: "500", marginBottom: 10 },
  exerciseNameTight: { marginBottom: 2 },
  bwNote: { color: C.textMuted, fontSize: 12, marginBottom: 10 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  setNum: { color: C.textMuted, fontSize: 14, width: 24, textAlign: "center" },
  warmupNum: { color: C.warning, fontWeight: "bold" },
  prev: { flex: 1, color: C.textFaint, fontSize: 13, paddingLeft: 4 },
  colHead: { color: C.textFaint, fontSize: 11 },
  colFlex: { width: 56, textAlign: "center" },
  tip: { color: C.textFaint, fontSize: 11, textAlign: "center", marginBottom: 10 },
  setInput: { width: 56, backgroundColor: C.raised, color: C.text, textAlign: "center", padding: 8, borderRadius: 6 },
  checkCol: { width: 36, alignItems: "center", justifyContent: "center" },
  addSet: { color: C.accent, fontSize: 14, marginTop: 4 },
  addExerciseBtn: {
    alignItems: "center", paddingVertical: 12, borderWidth: 0.5, borderColor: C.raised,
    borderRadius: 10, borderStyle: "dashed",
  },
  addExerciseText: { color: C.accent, fontSize: 15 },
  restBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 12 },
  restText: { ...T.num, color: C.rest, fontSize: 20 },
  restBannerOver: { backgroundColor: C.restOver },
  restTextOver: { color: C.danger },
  skipText: { color: C.textMuted, fontSize: 14 },
  restEditRow: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 24, marginBottom: 10 },
  restEditLabel: { color: C.textFaint, fontSize: 12 },
  restEditInput: { backgroundColor: C.raised, color: C.textSoft, fontSize: 12, textAlign: "center", paddingVertical: 4, width: 46, borderRadius: 6 },
  restEditUnit: { color: C.textFaint, fontSize: 12 },
  restDelete: { marginLeft: 4 },
  addRest: { color: C.accent, fontSize: 12, marginLeft: 24, marginBottom: 10 },
  endButton: { backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 12 },
  endText: { color: C.onAccent, fontSize: 16, fontWeight: "500" },
  discardBtn: { alignItems: "center", paddingVertical: 10, marginTop: 2 },
  discardText: { color: C.textMuted, fontSize: 14 },
});