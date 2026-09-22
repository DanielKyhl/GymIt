import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Pencil, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Anchor, DropdownMenu, MenuItem } from "../../components/DropdownMenu";
import { ExercisePicker } from "../../components/ExercisePicker";
import { NumberInput } from "../../components/NumberInput";
import { RpeCell, RpeHelpButton, rpeItems } from "../../components/Rpe";
import { SetBadge, setTypeItems } from "../../components/SetBadge";
import { C, HIT, R, T } from "../../constants/theme";
import { setNumber } from "../../lib/activeWorkout";
import { confirm } from "../../lib/confirm";
import { formatRPE, workoutRPE } from "../../lib/rpe";
import { deleteWorkout, getWorkouts, updateWorkout } from "../../lib/storage";
import { Workout, WorkoutSet } from "../../types/workout";

const SET_TYPE_NAME = { drop: "drop set", failure: "to failure" } as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function WorkoutLogDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [missing, setMissing] = useState(false);
  // While editing, changes go to a draft; nothing is saved until "Save".
  const [draft, setDraft] = useState<Workout | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [menu, setMenu] = useState<{ anchor: Anchor; title: string; items: MenuItem[] } | null>(null);

  useEffect(() => {
    getWorkouts().then((workouts) => {
      const found = workouts.find((w) => w.id === id) ?? null;
      setWorkout(found);
      setMissing(!found);
    });
  }, [id]);

  if (missing) {
    return (
      <View style={styles.container}>
        <Text style={styles.sub}>This workout no longer exists.</Text>
      </View>
    );
  }
  if (!workout) {
    return (
      <View style={styles.container}>
        <Text style={styles.sub}>Loading…</Text>
      </View>
    );
  }

  const handleDelete = async () => {
    const ok = await confirm(
      "Delete workout",
      `Delete "${workout.name}" from ${formatDate(workout.date)}? Its XP, records and progress go with it.`,
      "Delete",
      { destructive: true }
    );
    if (!ok) return;
    await deleteWorkout(workout.id);
    router.back();
  };

  if (draft) {
    const updateSet = (exIndex: number, setIndex: number, patch: Partial<WorkoutSet>) =>
      setDraft({
        ...draft,
        exercises: draft.exercises.map((ex, i) =>
          i === exIndex ? { ...ex, sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) } : ex
        ),
      });
    const removeSet = (exIndex: number, setIndex: number) =>
      setDraft({
        ...draft,
        exercises: draft.exercises.map((ex, i) =>
          i === exIndex ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIndex) } : ex
        ),
      });
    const addSet = (exIndex: number) =>
      setDraft({
        ...draft,
        exercises: draft.exercises.map((ex, i) => {
          if (i !== exIndex) return ex;
          const last = ex.sets[ex.sets.length - 1];
          return { ...ex, sets: [...ex.sets, { weight: last?.weight ?? 0, reps: last?.reps ?? 0, done: true }] };
        }),
      });
    const removeExercise = (exIndex: number) =>
      setDraft({ ...draft, exercises: draft.exercises.filter((_, i) => i !== exIndex) });

    const save = async () => {
      const cleaned = { ...draft, name: draft.name.trim() || workout.name };
      await updateWorkout(cleaned);
      setWorkout(cleaned);
      setDraft(null);
    };

    return (
      <View style={styles.container}>
        <TextInput
          style={styles.nameInput}
          value={draft.name}
          onChangeText={(name) => setDraft({ ...draft, name })}
          placeholder="Workout name"
          placeholderTextColor={C.textFaint}
        />
        <Text style={styles.sub}>{formatDate(draft.date)} · editing</Text>

        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {draft.exercises.map((ex, exIndex) => (
            <View style={styles.card} key={ex.name + exIndex}>
              <View style={styles.cardHeader}>
                <Text style={[styles.exName, styles.flex]}>{ex.name}</Text>
                <Pressable onPress={() => removeExercise(exIndex)} hitSlop={HIT}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
              {ex.sets.map((set, setIndex) => {
                const number = setNumber(ex.sets, setIndex);
                return (
                  <View style={styles.editRow} key={setIndex}>
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
                    <NumberInput
                      style={styles.input}
                      value={set.weight}
                      onChangeValue={(v) => updateSet(exIndex, setIndex, { weight: v })}
                      placeholder="0"
                      placeholderTextColor={C.textFaint}
                    />
                    <Text style={styles.unit}>{draft.unit} ×</Text>
                    <NumberInput
                      style={styles.input}
                      decimals={false}
                      value={set.reps}
                      onChangeValue={(v) => updateSet(exIndex, setIndex, { reps: v })}
                      placeholder="0"
                      placeholderTextColor={C.textFaint}
                    />
                    <Text style={[styles.unit, styles.flex]}>reps</Text>
                    <RpeCell
                      value={set.rpe}
                      onOpen={(anchor) =>
                        setMenu({
                          anchor,
                          title: "How hard was that set?",
                          items: rpeItems(set.rpe, (rpe) => updateSet(exIndex, setIndex, { rpe })),
                        })
                      }
                    />
                  </View>
                );
              })}
              <Pressable onPress={() => addSet(exIndex)} hitSlop={HIT}>
                <Text style={styles.link}>+ Set</Text>
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.addExercise} onPress={() => setShowAdd(true)}>
            <Text style={styles.link}>+ Add exercise</Text>
          </Pressable>
        </ScrollView>

        <ExercisePicker
          visible={showAdd}
          onClose={() => setShowAdd(false)}
          onSelect={(name) => {
            setDraft({ ...draft, exercises: [...draft.exercises, { name, sets: [] }] });
            setShowAdd(false);
          }}
        />
        <DropdownMenu
          anchor={menu?.anchor ?? null}
          title={menu?.title}
          items={menu?.items ?? []}
          onClose={() => setMenu(null)}
        />

        <View style={styles.footer}>
          <Pressable style={[styles.button, styles.secondary]} onPress={() => setDraft(null)}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.primary]} onPress={save}>
            <Text style={styles.primaryText}>Save changes</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const rpe = workoutRPE(workout);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{workout.name}</Text>
      <View style={styles.subRow}>
        <Text style={[styles.sub, styles.subInline]}>
          {formatDate(workout.date)} · {Math.round(workout.durationSeconds / 60)} min
          {rpe !== null ? ` · avg RPE ${formatRPE(rpe)}` : ""}
        </Text>
        {rpe !== null && <RpeHelpButton size={13} />}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {workout.exercises.map((ex, i) => (
          <View style={styles.card} key={ex.name + i}>
            {ex.supersetId ? <Text style={styles.superset}>Superset</Text> : null}
            <Text style={styles.exName}>{ex.name}</Text>
            {ex.notes ? <Text style={styles.notes}>{ex.notes}</Text> : null}
            {ex.sets.length === 0 ? (
              <Text style={styles.noSets}>No sets logged</Text>
            ) : (
              ex.sets.map((set, j) => (
                <View style={styles.setRow} key={j}>
                  <Text style={styles.setLine}>
                    {set.type === "warmup" ? "Warm-up" : `Set ${setNumber(ex.sets, j)}`}:  {set.weight} {workout.unit} ×{" "}
                    {set.reps} reps
                    {set.type === "drop" || set.type === "failure" ? `  · ${SET_TYPE_NAME[set.type]}` : ""}
                    {set.rpe ? `  · RPE ${formatRPE(set.rpe)}` : ""}
                  </Text>
                  {set.done && <Check size={14} color={C.success} />}
                </View>
              ))
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.button, styles.secondary]} onPress={handleDelete}>
          <Trash2 size={17} color={C.danger} />
          <Text style={styles.dangerText}>Delete</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.primary]} onPress={() => setDraft(workout)}>
          <Pencil size={17} color={C.onAccent} />
          <Text style={styles.primaryText}>Edit</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, padding: 20, paddingTop: 16 },
  flex: { flex: 1 },
  title: { color: C.text, fontSize: 28, fontWeight: "bold", marginBottom: 4 },
  nameInput: {
    color: C.text,
    fontSize: 24,
    fontWeight: "bold",
    borderBottomWidth: 1,
    borderBottomColor: C.raised,
    paddingVertical: 4,
    marginBottom: 4,
  },
  sub: { color: C.textMuted, fontSize: 14, marginBottom: 20 },
  list: { gap: 12, paddingBottom: 12 },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  exName: { color: C.text, fontSize: 16, fontWeight: "500", marginBottom: 8 },
  remove: { color: C.danger, fontSize: 13 },
  noSets: { color: C.textMuted, fontSize: 13 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  setLine: { color: C.textSoft, fontSize: 14 },
  superset: { color: C.signal, fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  notes: { color: C.textMuted, fontSize: 13, fontStyle: "italic", marginBottom: 8 },

  editRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 },
  subInline: { marginBottom: 0, flexShrink: 1 },
  normal: {},
  input: {
    ...T.num,
    fontSize: 17,
    width: 60,
    backgroundColor: C.raised,
    textAlign: "center",
    paddingVertical: 6,
    borderRadius: R.sm,
  },
  unit: { color: C.textMuted, fontSize: 13 },
  link: { color: C.accent, fontSize: 14 },
  addExercise: {
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 0.5,
    borderColor: C.raised,
    borderRadius: R.md,
    borderStyle: "dashed",
  },

  footer: { flexDirection: "row", gap: 10, paddingTop: 12 },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: R.md,
    paddingVertical: 14,
  },
  primary: { backgroundColor: C.accent },
  primaryText: { color: C.onAccent, fontSize: 15, fontWeight: "600" },
  secondary: { borderWidth: 1, borderColor: C.raised },
  secondaryText: { color: C.text, fontSize: 15, fontWeight: "500" },
  dangerText: { color: C.danger, fontSize: 15, fontWeight: "500" },
});
