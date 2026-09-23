import { Image } from "expo-image";
import { CircleHelp, Star, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { C, HIT } from "../constants/theme";
import { EXERCISE_CREDIT, exerciseByName, exerciseImageUrl, muscleList } from "../lib/exercises";
import { Exercise } from "../types/workout";

// The sheet about one exercise: its animation, the muscles it works and how
// to do it. Opened from the exercise picker, and from the "?" next to an
// exercise anywhere else (a workout, a template, the template editor).
// The Add button and the star only appear where the caller asks for them.
export function ExerciseInfo({
  exercise,
  onClose,
  onAdd,
  starred,
  onToggleStar,
}: {
  exercise: Exercise | null;
  onClose: () => void;
  onAdd?: (name: string) => void;
  starred?: boolean;
  onToggleStar?: (name: string) => void;
}) {
  if (!exercise) return null;

  const picture = exerciseImageUrl(exercise);
  const tags = [exercise.equipment, exercise.bodyPart].filter((t): t is string => Boolean(t));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle} numberOfLines={1}>
              {exercise.name}
            </Text>
            {onToggleStar && <StarButton name={exercise.name} on={!!starred} onToggle={onToggleStar} />}
            <Pressable onPress={onClose} hitSlop={HIT} accessibilityLabel="Close">
              <X size={22} color={C.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {picture && (
              // The animations are 180 px, so they're shown at a size that
              // keeps them sharp rather than stretched across the sheet.
              <View style={styles.pictureWrap}>
                <Image
                  source={picture}
                  style={styles.animation}
                  contentFit="contain"
                  transition={150}
                  cachePolicy="disk"
                  accessibilityLabel={`How to do ${exercise.name}`}
                />
              </View>
            )}
            {exercise.gifOf && <Text style={styles.standIn}>Closest animation: {exercise.gifOf}</Text>}

            {tags.length > 0 && (
              <View style={styles.tagRow}>
                {tags.map((t) => (
                  <View key={t} style={styles.tag}>
                    <Text style={styles.tagText}>{t}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>Muscles worked</Text>
            <Text style={styles.body}>{muscleList(exercise.primaryMuscles) || "—"}</Text>
            {exercise.secondaryMuscles.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Also works</Text>
                <Text style={styles.body}>{muscleList(exercise.secondaryMuscles)}</Text>
              </>
            )}

            {exercise.instructions.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>How to do it</Text>
                {exercise.instructions.map((step, i) => (
                  <View key={i} style={styles.step}>
                    <Text style={styles.stepNum}>{i + 1}</Text>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </>
            )}

            {exercise.gif && <Text style={styles.credit}>{EXERCISE_CREDIT}</Text>}
          </ScrollView>

          {onAdd && (
            <Pressable style={styles.addBtn} onPress={() => onAdd(exercise.name)}>
              <Text style={styles.addBtnText}>Add exercise</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

export function StarButton({ name, on, onToggle }: { name: string; on: boolean; onToggle: (name: string) => void }) {
  return (
    <Pressable
      style={styles.iconBtn}
      hitSlop={6}
      onPress={() => onToggle(name)}
      accessibilityRole="button"
      accessibilityLabel={on ? `Unstar ${name}` : `Star ${name}`}
      accessibilityState={{ selected: on }}
    >
      <Star size={20} color={on ? C.signal : C.textFaint} fill={on ? C.signal : "transparent"} />
    </Pressable>
  );
}

// The small "?" beside an exercise's name that opens its sheet. Draws
// nothing for a name that isn't in the exercise list (an old name kept in
// history), since there's nothing to show.
export function ExerciseInfoButton({ name, size = 18 }: { name: string; size?: number }) {
  const [open, setOpen] = useState(false);
  const exercise = exerciseByName(name);
  if (!exercise) return null;
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={HIT}
        style={styles.help}
        accessibilityRole="button"
        accessibilityLabel={`About ${name}`}
      >
        <CircleHelp size={size} color={C.textMuted} />
      </Pressable>
      {open && <ExerciseInfo exercise={exercise} onClose={() => setOpen(false)} />}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  panel: {
    width: "100%",
    maxHeight: "85%",
    flexShrink: 1,
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.raised,
    overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.raised,
    gap: 12,
  },
  panelTitle: { color: C.text, fontSize: 17, fontWeight: "600", flex: 1 },
  iconBtn: { width: 32, height: 44, alignItems: "center", justifyContent: "center" },
  help: { paddingHorizontal: 4, paddingVertical: 2 },

  content: { padding: 16, paddingBottom: 8, gap: 4 },
  // The animations are drawn on white, so they sit on a white panel.
  pictureWrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 10,
  },
  animation: { width: 240, height: 240 },
  standIn: { color: C.textFaint, fontSize: 12, marginTop: -4, marginBottom: 8 },
  credit: { color: C.textFaint, fontSize: 11, marginTop: 12 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  tag: { backgroundColor: C.raised, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagText: { color: C.textSoft, fontSize: 12, textTransform: "capitalize" },
  sectionLabel: {
    color: C.textFaint,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 4,
  },
  body: { color: C.text, fontSize: 15, textTransform: "capitalize" },
  step: { flexDirection: "row", gap: 10, marginBottom: 10 },
  stepNum: { color: C.textFaint, fontSize: 13, width: 16, marginTop: 2 },
  stepText: { color: C.textSoft, fontSize: 14, lineHeight: 20, flex: 1 },
  addBtn: {
    backgroundColor: C.accent,
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  addBtnText: { color: C.onAccent, fontSize: 15, fontWeight: "600" },
});
