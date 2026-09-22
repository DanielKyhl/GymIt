import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleCheck, Disc, Ellipsis, Flame, Link2, Plus, StickyNote, Timer, Trash2, Unlink2 } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { CheckButton } from "../../components/CheckButton";
import { Anchor, DropdownMenu, measureAnchor, MenuItem } from "../../components/DropdownMenu";
import { ExercisePicker } from "../../components/ExercisePicker";
import { NumberInput } from "../../components/NumberInput";
import { PlateCalculator } from "../../components/PlateCalculator";
import { RestRow } from "../../components/RestRow";
import { RpeCell, RpeHelpButton, rpeItems } from "../../components/Rpe";
import { SetBadge, setTypeItems } from "../../components/SetBadge";
import { C, HIT, R, T } from "../../constants/theme";
import {
  ActiveWorkout,
  elapsedSeconds,
  formatClock,
  formatRest,
  historyBest1RM,
  isLivePR,
  linkWithNext,
  loggedExercises,
  REST_OPTIONS,
  restAfterSet,
  setNumber,
  toggleSet,
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
import { confirm } from "../../lib/confirm";
import { summarizeWorkout } from "../../lib/summary";
import { convertWeight, normalizeUnits } from "../../lib/units";
import { Workout, WorkoutExercise, WorkoutSet } from "../../types/workout";

// Routes: /workout/<templateId> starts (or resumes) that template,
// /workout/new starts an empty workout, /workout/resume reopens the
// unfinished one.

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

// The "⋯" button on each exercise. It opens the exercise menu next to itself.
function MenuButton({ label, onOpen }: { label: string; onOpen: (anchor: Anchor) => void }) {
  const ref = useRef<View>(null);
  return (
    <Pressable
      ref={ref}
      style={({ pressed }) => [styles.menuBtn, pressed && styles.menuBtnPressed]}
      onPress={() => measureAnchor(ref.current, onOpen)}
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ellipsis size={20} color={C.textSoft} />
    </Pressable>
  );
}

type OpenMenu = { anchor: Anchor; title?: string; items: MenuItem[]; align?: "left" | "right" };

const blankSets = (weight: number, restSeconds: number): WorkoutSet[] =>
  Array.from({ length: 3 }, () => ({ weight, reps: 0, done: false, restSeconds }));

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
  const [menu, setMenu] = useState<OpenMenu | null>(null);
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
      const rest = template?.restSeconds ?? def;
      setDefaultRest(rest);

      const open = (a: ActiveWorkout) => {
        // Workouts saved by an older version have a rest timer that doesn't
        // say which set it follows; drop it rather than show it in the wrong place.
        setActive(a.rest && typeof a.rest.exIndex !== "number" ? { ...a, rest: null } : a);
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
          // at your current body weight. Exercises with no planned sets (the
          // examples) start with three empty ones, ready to fill in.
          sets: e.sets?.length
            ? e.sets.map((s) => ({ ...s, weight: s.weight || startingWeight(e.name, bw, unit), done: false }))
            : blankSets(startingWeight(e.name, bw, unit), rest),
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
    updateExercises((list) => [...list, { name, sets: blankSets(startingWeight(name, bodyWeight, unit), defaultRest) }]);
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
                {
                  weight: startingWeight(ex.name, bodyWeight, unit),
                  reps: 0,
                  done: false,
                  // Same rest as the sets before it, so a changed rest sticks.
                  restSeconds: ex.sets[ex.sets.length - 1]?.restSeconds ?? defaultRest,
                },
              ],
            }
          : ex
      )
    );

  const toggleDone = (exIndex: number, setIndex: number) => {
    const next = toggleSet(active, exIndex, setIndex, Date.now());
    const ex = next.exercises[exIndex];
    if (ex.sets[setIndex].done && isLivePR(ex, setIndex, history[ex.name]?.best ?? 0)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    setActive(next);
  };

  // Inserting or removing sets would leave a running rest timer under the
  // wrong set, so those changes stop it.
  const changeSets = (exIndex: number, change: (sets: WorkoutSet[]) => WorkoutSet[]) =>
    update((a) => ({
      ...a,
      rest: a.rest?.exIndex === exIndex ? null : a.rest,
      exercises: a.exercises.map((ex, i) => (i === exIndex ? { ...ex, sets: change(ex.sets) } : ex)),
    }));

  const removeSet = (exIndex: number, setIndex: number) =>
    changeSets(exIndex, (sets) => sets.filter((_, j) => j !== setIndex));

  // Replaces any unfinished warm-ups, so adding them twice doesn't double them.
  const addWarmups = (exIndex: number, working: number) =>
    changeSets(exIndex, (sets) => [
      ...warmupSets(working, unit, barWeight(active.exercises[exIndex].name, unit)),
      ...sets.filter((s) => !(s.type === "warmup" && !s.done)),
    ]);

  // One rest length for every set of the exercise; a running rest follows it.
  const setExerciseRest = (exIndex: number, seconds: number) =>
    update((a) => ({
      ...a,
      rest: a.rest?.exIndex === exIndex ? (seconds > 0 ? { ...a.rest, target: seconds } : null) : a.rest,
      exercises: a.exercises.map((ex, i) =>
        i === exIndex ? { ...ex, sets: ex.sets.map((s) => ({ ...s, restSeconds: seconds })) } : ex
      ),
    }));

  const removeExercise = async (exIndex: number) => {
    const ex = active.exercises[exIndex];
    if (ex.sets.some((s) => s.done)) {
      const ok = await confirm("Remove exercise", `Remove ${ex.name} and its logged sets?`, "Remove", { destructive: true });
      if (!ok) return;
    }
    update((a) => ({
      ...a,
      rest:
        !a.rest || a.rest.exIndex === exIndex
          ? null
          : a.rest.exIndex > exIndex
            ? { ...a.rest, exIndex: a.rest.exIndex - 1 }
            : a.rest,
      exercises: a.exercises.filter((_, i) => i !== exIndex),
    }));
  };

  const openRestMenu = (exIndex: number, anchor: Anchor, current: number, align: "left" | "right" = "left") =>
    setMenu({
      anchor,
      align,
      title: "Rest between sets",
      items: REST_OPTIONS.map((seconds) => ({
        key: String(seconds),
        label: seconds === 0 ? "No rest timer" : formatRest(seconds),
        selected: seconds === current,
        onPress: () => setExerciseRest(exIndex, seconds),
      })),
    });

  const openExerciseMenu = (exIndex: number, anchor: Anchor) => {
    const ex = active.exercises[exIndex];
    const prev = history[ex.name]?.prev ?? [];
    const bar = barWeight(ex.name, unit);
    const working =
      ex.sets.find((s) => s.type !== "warmup" && s.weight > 0)?.weight ?? prev.find((s) => s.weight > 0)?.weight ?? 0;
    const rest = ex.sets.find((s) => s.restSeconds !== undefined)?.restSeconds ?? defaultRest;
    const next = active.exercises[exIndex + 1];
    const linkedToNext = Boolean(ex.supersetId && next?.supersetId === ex.supersetId);
    const noteOpen = ex.notes !== undefined || openNotes.includes(`${exIndex}:${ex.name}`);
    const icon = (Icon: typeof Timer, color: string = C.textSoft) => <Icon size={18} color={color} />;

    const items: MenuItem[] = [];
    if (!isBodyweight(ex.name) && working > 0) {
      items.push({
        key: "warmups",
        label: "Add warm-up sets",
        detail: `Lighter sets building up to ${working} ${unit}`,
        icon: icon(Flame),
        onPress: () => addWarmups(exIndex, working),
      });
    }
    if (bar > 0) {
      items.push({
        key: "plates",
        label: "Plate calculator",
        detail: "Which plates to load on each side",
        icon: icon(Disc),
        onPress: () => setPlateFor({ name: ex.name, weight: working || bar }),
      });
    }
    if (!noteOpen) {
      items.push({
        key: "note",
        label: "Add note",
        detail: "Seat height, grip, cues…",
        icon: icon(StickyNote),
        onPress: () => setOpenNotes((n) => [...n, `${exIndex}:${ex.name}`]),
      });
    }
    items.push({
      key: "rest",
      label: "Rest timer",
      detail: rest > 0 ? `${formatRest(rest)} between sets` : "Off",
      icon: icon(Timer),
      onPress: () => openRestMenu(exIndex, anchor, rest, "right"),
    });
    if (next) {
      items.push({
        key: "superset",
        label: linkedToNext ? "Remove superset" : "Superset with next exercise",
        detail: linkedToNext ? undefined : `Alternate with ${next.name}, rest after each pair`,
        icon: icon(linkedToNext ? Unlink2 : Link2),
        onPress: () =>
          updateExercises((list) =>
            linkedToNext
              ? unlinkFromNext(list, exIndex, `ss${Date.now()}`)
              : linkWithNext(list, exIndex, `ss${Date.now()}`)
          ),
      });
    }
    items.push({
      key: "remove",
      label: "Remove exercise",
      danger: true,
      icon: icon(Trash2, C.danger),
      onPress: () => removeExercise(exIndex),
    });
    setMenu({ anchor, align: "right", items });
  };

  const handleEnd = async () => {
    finished.current = true;
    const workout: Workout = {
      id: Date.now().toString(),
      name: active.name.trim() || "Workout",
      date: new Date().toISOString(),
      durationSeconds: elapsedSeconds(active.startedAt, Date.now()),
      unit,
      exercises: loggedExercises(active.exercises),
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
        id: workout.id,
        xp: String(s.xpGained),
        level: String(s.levelAfter),
        leveledUp: s.leveledUp ? "1" : "0",
        achievements: JSON.stringify(s.newAchievements),
        records: JSON.stringify(s.records.map(({ name, weight, reps }) => ({ name, weight, reps }))),
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

  const totalSets = active.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const doneSets = active.exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.done).length, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          {active.templateId === null ? (
            <TextInput
              style={[styles.name, styles.nameInput]}
              value={active.name}
              onChangeText={(name) => update((a) => ({ ...a, name }))}
              placeholder="Workout name"
              placeholderTextColor={C.textFaint}
            />
          ) : (
            <Text style={styles.name} numberOfLines={1}>
              {active.name}
            </Text>
          )}
          <Text style={styles.progress}>
            {totalSets === 0 ? "No sets yet" : `${doneSets} of ${totalSets} sets done`}
          </Text>
        </View>
        <View style={styles.clock}>
          <Timer size={16} color={C.accent} />
          <ElapsedClock startedAt={active.startedAt} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {active.exercises.length === 0 && (
          <Text style={styles.message}>Add your first exercise to get started.</Text>
        )}

        {active.exercises.map((ex, exIndex) => {
          const prev = history[ex.name]?.prev ?? [];
          const best = history[ex.name]?.best ?? 0;
          const bodyweight = isBodyweight(ex.name);
          const noteOpen = ex.notes !== undefined || openNotes.includes(`${exIndex}:${ex.name}`);
          const allDone = ex.sets.length > 0 && ex.sets.every((s) => s.done);

          return (
            <View style={[styles.card, ex.supersetId ? styles.supersetCard : null]} key={ex.name + exIndex}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitle}>
                  {ex.supersetId ? <Text style={styles.supersetLabel}>Superset</Text> : null}
                  <Text style={styles.exerciseName} numberOfLines={2}>
                    {ex.name}
                  </Text>
                  {bodyweight && (
                    <Text style={styles.bwNote}>
                      {bodyWeight
                        ? `Bodyweight · uses your ${convertWeight(bodyWeight.value, bodyWeight.unit, unit)} ${unit}`
                        : "Bodyweight · add your weight in Settings"}
                    </Text>
                  )}
                </View>
                {allDone && <CircleCheck size={20} color={C.success} />}
                <MenuButton label={`${ex.name} options`} onOpen={(anchor) => openExerciseMenu(exIndex, anchor)} />
              </View>

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

              {ex.sets.length > 0 && (
                <View style={styles.row}>
                  <Text style={[styles.colHead, styles.colSet]}>Set</Text>
                  <Text style={[styles.colHead, styles.colPrev]}>Previous</Text>
                  <Text style={[styles.colHead, styles.colWeight, styles.center]}>{unit}</Text>
                  <Text style={[styles.colHead, styles.colReps, styles.center]}>Reps</Text>
                  <View style={[styles.colRpe, styles.rpeHead]}>
                    <Text style={[styles.colHead, styles.colHeadInline]}>RPE</Text>
                    <RpeHelpButton size={12} />
                  </View>
                  <View style={styles.colCheck} />
                </View>
              )}

              {ex.sets.map((set, setIndex) => {
                const number = setNumber(ex.sets, setIndex);
                const p = prev[setIndex];
                const rest = restAfterSet(active.exercises, exIndex, setIndex);
                const running = active.rest?.exIndex === exIndex && active.rest.setIndex === setIndex ? active.rest : null;
                const isLast = setIndex === ex.sets.length - 1;
                return (
                  <View key={setIndex}>
                    <View style={[styles.row, styles.setRow, set.done && styles.setRowDone]}>
                      <SetBadge
                        type={set.type}
                        number={number}
                        onOpen={(anchor) =>
                          setMenu({
                            anchor,
                            title: set.type === "warmup" ? "Warm-up set" : `Set ${number}`,
                            items: setTypeItems(
                              set.type,
                              ex.sets.slice(0, setIndex).filter((s) => s.type !== "warmup").length + 1,
                              (type) => updateSet(exIndex, setIndex, { type }),
                              () => removeSet(exIndex, setIndex)
                            ),
                          })
                        }
                      />
                      <View style={[styles.colPrev, styles.prevCell]}>
                        <Text style={styles.prev} numberOfLines={1}>
                          {p ? `${!p.weight && bodyweight ? "BW" : p.weight} × ${p.reps}` : "–"}
                        </Text>
                        {isLivePR(ex, setIndex, best) && (
                          <View style={styles.prPill}>
                            <Text style={styles.prText}>PR</Text>
                          </View>
                        )}
                      </View>
                      <NumberInput
                        style={[styles.input, styles.colWeight]}
                        placeholder={p?.weight ? String(p.weight) : "0"}
                        placeholderTextColor={C.textFaint}
                        value={set.weight}
                        onChangeValue={(v) => updateSet(exIndex, setIndex, { weight: v })}
                      />
                      <NumberInput
                        style={[styles.input, styles.colReps]}
                        decimals={false}
                        placeholder={p ? String(p.reps) : "0"}
                        placeholderTextColor={C.textFaint}
                        value={set.reps}
                        onChangeValue={(v) => updateSet(exIndex, setIndex, { reps: v })}
                      />
                      <RpeCell
                        value={set.rpe}
                        onOpen={(anchor) =>
                          setMenu({
                            anchor,
                            align: "right",
                            title: "How hard was that set?",
                            items: rpeItems(set.rpe, (rpe) => updateSet(exIndex, setIndex, { rpe })),
                          })
                        }
                      />
                      <CheckButton done={set.done} onToggle={() => toggleDone(exIndex, setIndex)} />
                    </View>

                    {/* The rest between this set and the next. After the last set it
                        only shows while it's running (the rest before the next exercise). */}
                    {(running || (rest > 0 && !isLast)) && (
                      <RestRow
                        seconds={rest}
                        running={running}
                        onEdit={(anchor) => openRestMenu(exIndex, anchor, set.restSeconds ?? 0)}
                        onStop={() => update((a) => ({ ...a, rest: null }))}
                      />
                    )}
                  </View>
                );
              })}

              <Pressable
                style={({ pressed }) => [styles.addSet, pressed && styles.addSetPressed]}
                onPress={() => addSet(exIndex)}
                accessibilityRole="button"
              >
                <Plus size={16} color={C.accent} />
                <Text style={styles.addSetText}>Add set</Text>
              </Pressable>
            </View>
          );
        })}

        <Pressable style={styles.addExerciseBtn} onPress={() => setShowAdd(true)} accessibilityRole="button">
          <Plus size={18} color={C.accent} />
          <Text style={styles.addExerciseText}>Add exercise</Text>
        </Pressable>

        <Pressable style={styles.discardBtn} onPress={handleDiscard} hitSlop={HIT} accessibilityRole="button">
          <Text style={styles.discardText}>Discard workout</Text>
        </Pressable>
      </ScrollView>

      <Pressable style={styles.endButton} onPress={handleEnd} accessibilityRole="button">
        <Text style={styles.endText}>Finish workout</Text>
      </Pressable>

      <DropdownMenu
        anchor={menu?.anchor ?? null}
        title={menu?.title}
        items={menu?.items ?? []}
        align={menu?.align}
        onClose={() => setMenu(null)}
      />
      <ExercisePicker visible={showAdd} onClose={() => setShowAdd(false)} onSelect={addExercise} />
      <PlateCalculator
        exercise={plateFor?.name ?? null}
        unit={unit}
        initialWeight={plateFor?.weight ?? 0}
        onClose={() => setPlateFor(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 8 },
  centered: { justifyContent: "center", alignItems: "stretch", gap: 16, padding: 20 },
  message: { color: C.textMuted, fontSize: 15, textAlign: "center", marginVertical: 12 },

  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4, marginBottom: 12 },
  headerText: { flex: 1 },
  name: { color: C.text, fontSize: 22, fontWeight: "700" },
  nameInput: { borderBottomWidth: 1, borderBottomColor: C.raised, paddingVertical: 2 },
  progress: { color: C.textMuted, fontSize: 13, marginTop: 2 },
  clock: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6,
  },
  timer: { ...T.num, fontSize: 20, color: C.accent },

  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingBottom: 16 },

  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 14 },
  supersetCard: { borderLeftWidth: 3, borderLeftColor: C.signal },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 10 },
  cardTitle: { flex: 1, paddingTop: 4 },
  supersetLabel: { color: C.signal, fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  exerciseName: { color: C.text, fontSize: 17, fontWeight: "600" },
  bwNote: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  menuBtn: { width: 36, height: 32, borderRadius: R.sm, alignItems: "center", justifyContent: "center" },
  menuBtnPressed: { backgroundColor: C.raised },
  noteInput: {
    backgroundColor: C.raised,
    color: C.textSoft,
    fontSize: 13,
    borderRadius: R.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },

  // Columns: set | previous | weight | reps | done
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  colSet: { width: 38, textAlign: "center" },
  colPrev: { flex: 1 },
  colWeight: { width: 60 },
  colReps: { width: 50 },
  colRpe: { width: 40 },
  colCheck: { width: 36 },
  colHead: { color: C.textFaint, fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 6 },
  colHeadInline: { marginBottom: 0 },
  center: { textAlign: "center" },
  rpeHead: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, marginBottom: 6 },
  setRow: { paddingVertical: 5, paddingHorizontal: 6, marginHorizontal: -6, borderRadius: R.md },
  setRowDone: { backgroundColor: C.successBg },
  prevCell: { flexDirection: "row", alignItems: "center", gap: 6 },
  prev: { color: C.textFaint, fontSize: 13, flexShrink: 1 },
  prPill: { backgroundColor: C.signal, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  prText: { color: C.onAccent, fontSize: 11, fontWeight: "700" },
  input: {
    ...T.num,
    fontSize: 18,
    height: 38,
    backgroundColor: C.raised,
    textAlign: "center",
    borderRadius: R.sm,
  },

  addSet: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: 10, paddingVertical: 10, borderRadius: R.md, backgroundColor: C.raised,
  },
  addSetPressed: { backgroundColor: C.selected },
  addSetText: { color: C.accent, fontSize: 14, fontWeight: "600" },

  addExerciseBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderWidth: 1, borderColor: C.raised, borderRadius: R.lg, borderStyle: "dashed",
  },
  addExerciseText: { color: C.accent, fontSize: 15, fontWeight: "500" },
  discardBtn: { alignItems: "center", paddingVertical: 12 },
  discardText: { color: C.danger, fontSize: 14 },
  endButton: { backgroundColor: C.accent, borderRadius: R.md, padding: 16, alignItems: "center", marginTop: 8, marginBottom: 24 },
  endText: { color: C.onAccent, fontSize: 16, fontWeight: "600" },
});
