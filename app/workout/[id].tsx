import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Timer, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { CheckButton } from "../../components/CheckButton";
import { ExercisePicker } from "../../components/ExercisePicker";
import { NumberInput } from "../../components/NumberInput";
import { PlateCalculator } from "../../components/PlateCalculator";
import { RestSheet } from "../../components/RestSheet";
import { C, HIT, R, T } from "../../constants/theme";
import {
  ActiveWorkout,
  elapsedSeconds,
  formatClock,
  historyBest1RM,
  isLivePR,
  linkWithNext,
  nextSetType,
  restAfterSet,
  unlinkFromNext,
  warmupSets,
} from "../../lib/activeWorkout";
import { BodyWeight, startingWeight } from "../../lib/bodyweight";
import { barWeight, isBodyweight } from "../../lib/exercises";
import { getLastPerformance } from "../../lib/stats";
import {
  clearActiveWorkout,
  getActiveWorkout,
  getBodyWeight,
  getDefaultRest,
  getDefaultUnit,
  getTemplates,
  getWeeklyGoal,
  getWorkouts,
  saveActiveWorkout,
  saveTemplate,
  saveWorkout,
} from "../../lib/storage";
import { summarizeWorkout } from "../../lib/summary";
import { convertWeight, normalizeUnits } from "../../lib/units";
import { SetType, Workout, WorkoutExercise, WorkoutSet } from "../../types/workout";

// Routes: /workout/<templateId> starts (or resumes) that template,
// /workout/new starts an empty workout, /workout/resume reopens the
// unfinished one.

function confirm(title: string, message: string, ok: string, opts: { cancel?: string; destructive?: boolean } = {}) {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise<boolean>((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: opts.cancel ?? "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: ok, style: opts.destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    )
  );
}

const TYPE_LABEL: Partial<Record<SetType, string>> = { warmup: "W", drop: "D", failure: "F" };

// The workout clock ticks on its own, so the rest of the screen doesn't
// re-render every second.
function ElapsedClock({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  return <Text style={styles.timer}>{formatClock(elapsedSeconds(startedAt, now))}</Text>;
}

export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [active, setActive] = useState<ActiveWorkout | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [defaultRest, setDefaultRest] = useState(120);
  const [pastWorkouts, setPastWorkouts] = useState<Workout[]>([]);
  const [bodyWeight, setBodyWeightValue] = useState<BodyWeight | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [plateFor, setPlateFor] = useState<{ name: string; weight: number } | null>(null);
  const [openNotes, setOpenNotes] = useState<string[]>([]);
  // Set once the workout is ended or discarded, so a pending autosave can't
  // bring it back.
  const finished = useRef(false);

  // Start, resume, or ask what to do with an unfinished workout.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [existing, templates, bw, unit, def, past] = await Promise.all([
        getActiveWorkout(),
        getTemplates(),
        getBodyWeight(),
        getDefaultUnit(),
        getDefaultRest(),
        getWorkouts(),
      ]);
      if (cancelled) return;
      setBodyWeightValue(bw);
      // In the current unit, so "Prev" hints and PRs compare like with like.
      setPastWorkouts(normalizeUnits(past, unit));
      const template = id === "new" || id === "resume" ? null : (templates.find((t) => t.id === id) ?? null);
      setDefaultRest(template?.restSeconds ?? def);

      const open = (a: ActiveWorkout) => {
        setActive(a);
        setStatus("ready");
      };

      if (id === "resume") {
        if (existing) open(existing);
        else router.replace("/(tabs)");
        return;
      }
      if (id !== "new" && !template) {
        setStatus("missing");
        return;
      }
      if (existing) {
        if (template && existing.templateId === template.id) return open(existing);
        const replace = await confirm(
          "Unfinished workout",
          `"${existing.name}" is still in progress. Discard it and start ${template ? `"${template.name}"` : "an empty workout"}?`,
          "Discard and start",
          { cancel: "Keep it", destructive: true }
        );
        if (cancelled) return;
        if (!replace) return open(existing);
      }
      open({
        templateId: template?.id ?? null,
        name: template?.name ?? "Workout",
        startedAt: Date.now(),
        unit,
        rest: null,
        exercises: (template?.exercises ?? []).map((e) => ({
          name: e.name,
          notes: e.notes,
          supersetId: e.supersetId,
          // Bodyweight exercises are saved in templates as "BW" (0) and start
          // at your current body weight.
          sets: (e.sets ?? []).map((s) => ({ ...s, weight: s.weight || startingWeight(e.name, bw, unit), done: false })),
        })),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  // Autosave, so closing the app mid-session loses nothing.
  useEffect(() => {
    if (!active || finished.current) return;
    const save = setTimeout(() => {
      if (!finished.current) saveActiveWorkout(active);
    }, 250);
    return () => clearTimeout(save);
  }, [active]);

  const exerciseNames = active?.exercises.map((e) => e.name).join("\n") ?? "";
  // Per-exercise history lookups, only redone when the exercise list changes.
  const history = useMemo(() => {
    const names = exerciseNames ? exerciseNames.split("\n") : [];
    return Object.fromEntries(
      names.map((name) => [
        name,
        { best: historyBest1RM(pastWorkouts, name), prev: getLastPerformance(pastWorkouts, name) },
      ])
    );
  }, [pastWorkouts, exerciseNames]);

  if (status === "missing") {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.message}>This template no longer exists.</Text>
        <Pressable style={styles.endButton} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.endText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }
  if (!active) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.message}>Loading…</Text>
      </View>
    );
  }

  const unit = active.unit;
  const update = (change: (a: ActiveWorkout) => ActiveWorkout) => setActive((a) => (a ? change(a) : a));
  const updateExercises = (change: (list: WorkoutExercise[]) => WorkoutExercise[]) =>
    update((a) => ({ ...a, exercises: change(a.exercises) }));
  const updateExercise = (exIndex: number, patch: Partial<WorkoutExercise>) =>
    updateExercises((list) => list.map((ex, i) => (i === exIndex ? { ...ex, ...patch } : ex)));
  const updateSet = (exIndex: number, setIndex: number, patch: Partial<WorkoutSet>) =>
    updateExercises((list) =>
      list.map((ex, i) =>
        i === exIndex ? { ...ex, sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) } : ex
      )
    );

  const addExercise = (name: string) => {
    updateExercises((list) => [...list, { name, sets: [] }]);
    setShowAdd(false);
  };

  const addSet = (exIndex: number) =>
    updateExercises((list) =>
      list.map((ex, i) =>
        i === exIndex
          ? {
              ...ex,
              sets: [
                ...ex.sets,
                { weight: startingWeight(ex.name, bodyWeight, unit), reps: 0, done: false, restSeconds: defaultRest },
              ],
            }
          : ex
      )
    );

  const toggleDone = (exIndex: number, setIndex: number) => {
    const markingDone = !active.exercises[exIndex].sets[setIndex].done;
    const exercises = active.exercises.map((ex, i) =>
      i === exIndex ? { ...ex, sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, done: markingDone } : s)) } : ex
    );
    let rest = active.rest;
    if (markingDone) {
      const seconds = restAfterSet(exercises, exIndex, setIndex);
      if (seconds > 0) rest = { startedAt: Date.now(), target: seconds };
      const ex = exercises[exIndex];
      if (isLivePR(ex, setIndex, history[ex.name]?.best ?? 0)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
    }
    setActive({ ...active, exercises, rest });
  };

  // Replaces any unfinished warm-ups, so tapping twice doesn't double them.
  const addWarmups = (exIndex: number, working: number) =>
    updateExercises((list) =>
      list.map((ex, i) =>
        i === exIndex
          ? {
              ...ex,
              sets: [
                ...warmupSets(working, unit, barWeight(ex.name, unit)),
                ...ex.sets.filter((s) => !(s.type === "warmup" && !s.done)),
              ],
            }
          : ex
      )
    );

  const removeExercise = async (exIndex: number) => {
    const ex = active.exercises[exIndex];
    if (ex.sets.some((s) => s.done)) {
      const ok = await confirm("Remove exercise", `Remove ${ex.name} and its logged sets?`, "Remove", { destructive: true });
      if (!ok) return;
    }
    updateExercises((list) => list.filter((_, i) => i !== exIndex));
  };

  const nextUp = (() => {
    for (const ex of active.exercises) {
      const i = ex.sets.findIndex((s) => !s.done);
      if (i >= 0) return `Next: ${ex.name} · set ${i + 1}`;
    }
    return undefined;
  })();

  const handleEnd = async () => {
    finished.current = true;
    const workout: Workout = {
      id: Date.now().toString(),
      name: active.name.trim() || "Workout",
      date: new Date().toISOString(),
      durationSeconds: elapsedSeconds(active.startedAt, Date.now()),
      unit,
      exercises: active.exercises,
    };
    await saveWorkout(workout);
    await clearActiveWorkout();

    if (active.templateId === null && active.exercises.length > 0) {
      const keep = await confirm("Save as template?", `Start "${workout.name}" from Home next time.`, "Save template", {
        cancel: "Not now",
      });
      if (keep) {
        await saveTemplate({
          id: `t${Date.now()}`,
          name: workout.name,
          exercises: active.exercises.map((e) => ({
            name: e.name,
            notes: e.notes,
            supersetId: e.supersetId,
            sets: e.sets.map((s) => ({
              weight: isBodyweight(e.name) ? 0 : s.weight,
              reps: s.reps,
              restSeconds: s.restSeconds,
              type: s.type,
            })),
          })),
        });
      }
    }

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

  const handleDiscard = async () => {
    const ok = await confirm("Discard workout", "Nothing from this session will be saved.", "Discard", {
      destructive: true,
    });
    if (!ok) return;
    finished.current = true;
    await clearActiveWorkout();
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.container}>
      {active.templateId === null ? (
        <TextInput
          style={[styles.name, styles.nameInput]}
          value={active.name}
          onChangeText={(name) => update((a) => ({ ...a, name }))}
          placeholder="Workout name"
          placeholderTextColor={C.textFaint}
        />
      ) : (
        <Text style={styles.name}>{active.name}</Text>
      )}
      <ElapsedClock startedAt={active.startedAt} />
      <Text style={styles.tip}>Tap a set number: W warm-up · D drop · F failure</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {active.exercises.length === 0 && (
          <Text style={styles.message}>Add your first exercise to get started.</Text>
        )}

        {active.exercises.map((ex, exIndex) => {
          const prev = history[ex.name]?.prev ?? [];
          const best = history[ex.name]?.best ?? 0;
          const bodyweight = isBodyweight(ex.name);
          const bar = barWeight(ex.name, unit);
          const working =
            ex.sets.find((s) => s.type !== "warmup" && s.weight > 0)?.weight ??
            prev.find((s) => s.weight > 0)?.weight ??
            0;
          const next = active.exercises[exIndex + 1];
          const linkedToNext = Boolean(ex.supersetId && next?.supersetId === ex.supersetId);
          const noteOpen = ex.notes !== undefined || openNotes.includes(`${exIndex}:${ex.name}`);

          return (
            <View style={[styles.exerciseCard, ex.supersetId ? styles.supersetCard : null]} key={ex.name + exIndex}>
              {ex.supersetId ? <Text style={styles.supersetLabel}>Superset</Text> : null}
              <Text style={[styles.exerciseName, bodyweight && styles.exerciseNameTight]}>{ex.name}</Text>
              {bodyweight && (
                <Text style={styles.bwNote}>
                  {bodyWeight
                    ? `Bodyweight · uses your ${convertWeight(bodyWeight.value, bodyWeight.unit, unit)} ${unit}`
                    : "Bodyweight · add your weight in Settings"}
                </Text>
              )}
              {noteOpen && (
                <TextInput
                  style={styles.noteInput}
                  value={ex.notes ?? ""}
                  onChangeText={(notes) => updateExercise(exIndex, { notes })}
                  placeholder="Note (seat height, grip, cues…)"
                  placeholderTextColor={C.textFaint}
                  multiline
                />
              )}

              <View style={styles.setRow}>
                <Text style={[styles.setNum, styles.colHead]}>Set</Text>
                <Text style={[styles.prevCol, styles.colHead]}>Prev</Text>
                <Text style={[styles.colHead, styles.colFlex]}>{unit}</Text>
                <Text style={[styles.colHead, styles.colFlex]}>Reps</Text>
                <View style={styles.checkCol}>
                  <Check size={14} color={C.textFaint} />
                </View>
              </View>

              {ex.sets.map((set, setIndex) => {
                const type = set.type ?? "normal";
                const pr = isLivePR(ex, setIndex, best);
                const p = prev[setIndex];
                return (
                  <View key={setIndex}>
                    <View style={[styles.setRow, styles.setRowBody, set.done && styles.setRowDone]}>
                      <Pressable
                        onPress={() => updateSet(exIndex, setIndex, { type: nextSetType(set.type) })}
                        hitSlop={HIT}
                        accessibilityLabel="Change set type"
                      >
                        <Text style={[styles.setNum, type !== "normal" && styles[type]]}>
                          {TYPE_LABEL[type] ?? setIndex + 1}
                        </Text>
                      </Pressable>
                      <View style={styles.prevCol}>
                        <Text style={styles.prev} numberOfLines={1}>
                          {p ? `${!p.weight && bodyweight ? "BW" : p.weight} × ${p.reps}` : "–"}
                        </Text>
                        {pr && (
                          <View style={styles.prPill}>
                            <Text style={styles.prText}>PR</Text>
                          </View>
                        )}
                      </View>
                      <NumberInput
                        style={styles.setInput}
                        placeholder={p?.weight ? String(p.weight) : unit}
                        placeholderTextColor={C.textFaint}
                        value={set.weight}
                        onChangeValue={(v) => updateSet(exIndex, setIndex, { weight: v })}
                      />
                      <NumberInput
                        style={styles.setInput}
                        decimals={false}
                        placeholder={p ? String(p.reps) : "reps"}
                        placeholderTextColor={C.textFaint}
                        value={set.reps}
                        onChangeValue={(v) => updateSet(exIndex, setIndex, { reps: v })}
                      />
                      <CheckButton done={set.done} onToggle={() => toggleDone(exIndex, setIndex)} />
                    </View>

                    <View style={styles.subRow}>
                      {set.restSeconds ? (
                        <View style={styles.subGroup}>
                          <Timer size={13} color={C.textFaint} />
                          <Text style={styles.subLabel}>Rest</Text>
                          <NumberInput
                            style={styles.subInput}
                            decimals={false}
                            value={set.restSeconds}
                            onChangeValue={(v) => updateSet(exIndex, setIndex, { restSeconds: v })}
                          />
                          <Text style={styles.subLabel}>s</Text>
                          <Pressable
                            onPress={() => updateSet(exIndex, setIndex, { restSeconds: 0 })}
                            hitSlop={HIT}
                            accessibilityLabel="Remove rest"
                          >
                            <X size={15} color={C.textFaint} />
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable onPress={() => updateSet(exIndex, setIndex, { restSeconds: defaultRest })} hitSlop={HIT}>
                          <Text style={styles.subLink}>+ Rest</Text>
                        </Pressable>
                      )}
                      <View style={styles.subGroup}>
                        <Text style={styles.subLabel}>RPE</Text>
                        <NumberInput
                          style={styles.subInput}
                          value={set.rpe ?? 0}
                          placeholder="–"
                          placeholderTextColor={C.textFaint}
                          onChangeValue={(v) => updateSet(exIndex, setIndex, { rpe: v ? Math.min(10, v) : undefined })}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}

              <View style={styles.actions}>
                <Pill label="+ Set" onPress={() => addSet(exIndex)} />
                {!bodyweight && working > 0 && <Pill label="Warm-ups" onPress={() => addWarmups(exIndex, working)} />}
                {bar > 0 && <Pill label="Plates" onPress={() => setPlateFor({ name: ex.name, weight: working || bar })} />}
                {!noteOpen && <Pill label="Note" onPress={() => setOpenNotes((n) => [...n, `${exIndex}:${ex.name}`])} />}
                {next && (
                  <Pill
                    label={linkedToNext ? "Unlink" : "Superset"}
                    onPress={() =>
                      updateExercises((list) =>
                        linkedToNext
                          ? unlinkFromNext(list, exIndex, `ss${Date.now()}`)
                          : linkWithNext(list, exIndex, `ss${Date.now()}`)
                      )
                    }
                  />
                )}
                <Pill label="Remove" danger onPress={() => removeExercise(exIndex)} />
              </View>
            </View>
          );
        })}

        <Pressable style={styles.addExerciseBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addExerciseText}>+ Add exercise</Text>
        </Pressable>
      </ScrollView>

      {active.rest && (
        <RestSheet
          rest={active.rest}
          nextLabel={nextUp}
          onAdjust={(delta) =>
            update((a) => (a.rest ? { ...a, rest: { ...a.rest, target: Math.max(15, a.rest.target + delta) } } : a))
          }
          onDone={() => update((a) => ({ ...a, rest: null }))}
        />
      )}

      <ExercisePicker visible={showAdd} onClose={() => setShowAdd(false)} onSelect={addExercise} />
      <PlateCalculator
        exercise={plateFor?.name ?? null}
        unit={unit}
        initialWeight={plateFor?.weight ?? 0}
        onClose={() => setPlateFor(null)}
      />

      <Pressable style={styles.endButton} onPress={handleEnd}>
        <Text style={styles.endText}>End workout</Text>
      </Pressable>
      <Pressable style={styles.discardBtn} onPress={handleDiscard} hitSlop={HIT}>
        <Text style={styles.discardText}>Discard workout</Text>
      </Pressable>
    </View>
  );
}

function Pill({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable style={styles.pill} onPress={onPress} hitSlop={{ top: 6, bottom: 6 }}>
      <Text style={[styles.pillText, danger && styles.pillDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, padding: 20, paddingTop: 16 },
  centered: { justifyContent: "center", alignItems: "stretch", gap: 16 },
  message: { color: C.textMuted, fontSize: 15, textAlign: "center", marginVertical: 12 },
  name: { color: C.text, fontSize: 22, fontWeight: "500", textAlign: "center" },
  nameInput: { borderBottomWidth: 1, borderBottomColor: C.raised, paddingVertical: 4, alignSelf: "center", minWidth: 180 },
  timer: { ...T.numBig, fontSize: 52, color: C.accent, textAlign: "center" },
  tip: { color: C.textFaint, fontSize: 11, textAlign: "center", marginBottom: 10 },
  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingBottom: 12 },

  exerciseCard: { backgroundColor: C.card, borderRadius: R.lg, padding: 14 },
  supersetCard: { borderLeftWidth: 3, borderLeftColor: C.signal },
  supersetLabel: { color: C.signal, fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 4 },
  exerciseName: { color: C.text, fontSize: 16, fontWeight: "500", marginBottom: 10 },
  exerciseNameTight: { marginBottom: 2 },
  bwNote: { color: C.textMuted, fontSize: 12, marginBottom: 10 },
  noteInput: {
    backgroundColor: C.raised,
    color: C.textSoft,
    fontSize: 13,
    borderRadius: R.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },

  setRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  setRowBody: { paddingVertical: 4, paddingHorizontal: 4, borderRadius: R.sm, marginHorizontal: -4 },
  setRowDone: { backgroundColor: C.successBg },
  setNum: { color: C.textMuted, fontSize: 14, width: 24, textAlign: "center", fontWeight: "500" },
  warmup: { color: C.warning },
  drop: { color: C.signal },
  failure: { color: C.danger },
  normal: {},
  prevCol: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 4 },
  prev: { color: C.textFaint, fontSize: 13, flexShrink: 1 },
  prPill: { backgroundColor: C.signal, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  prText: { color: C.onAccent, fontSize: 11, fontWeight: "700" },
  colHead: { color: C.textFaint, fontSize: 11, marginBottom: 4 },
  colFlex: { width: 56, textAlign: "center" },
  checkCol: { width: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  setInput: {
    ...T.num,
    fontSize: 17,
    width: 56,
    backgroundColor: C.raised,
    textAlign: "center",
    paddingVertical: 6,
    borderRadius: R.sm,
  },

  subRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginLeft: 28, marginTop: 4, marginBottom: 10 },
  subGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  subLabel: { color: C.textFaint, fontSize: 12 },
  subLink: { color: C.accent, fontSize: 12 },
  subInput: {
    backgroundColor: C.raised,
    color: C.textSoft,
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 4,
    width: 44,
    borderRadius: R.sm,
  },

  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  pill: { backgroundColor: C.raised, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7 },
  pillText: { color: C.accent, fontSize: 13 },
  pillDanger: { color: C.danger },

  addExerciseBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 0.5,
    borderColor: C.raised,
    borderRadius: R.md,
    borderStyle: "dashed",
  },
  addExerciseText: { color: C.accent, fontSize: 15 },
  endButton: { backgroundColor: C.accent, borderRadius: R.md, padding: 16, alignItems: "center", marginTop: 12 },
  endText: { color: C.onAccent, fontSize: 16, fontWeight: "500" },
  discardBtn: { alignItems: "center", paddingVertical: 10, marginTop: 2 },
  discardText: { color: C.textMuted, fontSize: 14 },
});
