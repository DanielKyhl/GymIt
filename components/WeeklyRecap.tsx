import { Award, Clock, Dumbbell, Flame, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { C, HIT, R, T } from "../constants/theme";
import { compareVolume } from "../lib/funFacts";
import { formatDuration, formatNumber, plural } from "../lib/format";
import { WeekRecap } from "../lib/recap";
import { Unit } from "../lib/units";
import { AnimalIcon } from "./AnimalIcon";

// The weekly recap (lib/recap.ts): Home shows it the first time the app's
// opened in a new week, as a look back at the week before.
export function WeeklyRecap({ recap, unit, onClose }: { recap: WeekRecap | null; unit: Unit; onClose: () => void }) {
  return (
    <Modal visible={recap !== null} transparent animationType="fade" onRequestClose={onClose}>
      {recap && <Recap recap={recap} unit={unit} onClose={onClose} />}
    </Modal>
  );
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// "12 Oct – 18 Oct", in the phone's own way of writing dates.
function weekRange(start: number): string {
  const first = new Date(start);
  const last = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 6);
  const day = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `${day(first)} – ${day(last)}`;
}

// The weight lifted next to the week before: "↑ 12% on the week before".
function change(volume: number, before: number): { text: string; up: boolean } | null {
  if (before <= 0) return null;
  const pct = Math.round(((volume - before) / before) * 100);
  if (pct === 0) return { text: "Same as the week before", up: false };
  return { text: `${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}% on the week before`, up: pct > 0 };
}

function Recap({ recap, unit, onClose }: { recap: WeekRecap; unit: Unit; onClose: () => void }) {
  const goalHit = recap.workouts >= recap.goal;
  const levelUp = recap.levelAfter > recap.levelBefore;
  const vsBefore = change(recap.volume, recap.volumeBefore);
  // A different animal from week to week, even at the same weight.
  const animal = compareVolume(recap.volume, unit, Math.floor(recap.start / WEEK_MS));

  return (
    <ScrollView style={styles.backdrop} contentContainerStyle={styles.backdropContent}>
      <View style={styles.panel} accessibilityViewIsModal>
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.kicker}>Your week</Text>
            <Text style={styles.title} accessibilityRole="header">
              {weekRange(recap.start)}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={HIT} accessibilityRole="button" accessibilityLabel="Close">
            <X size={22} color={C.textMuted} />
          </Pressable>
        </View>

        <View style={styles.row}>
          <Tile
            value={String(recap.workouts)}
            label={recap.workouts === 1 ? "workout" : "workouts"}
            note={goalHit ? "Weekly goal hit" : `Goal: ${recap.goal}`}
            strong={goalHit}
          />
          <Tile
            value={formatNumber(Math.round(recap.volume), 0)}
            unit={unit}
            label="lifted"
            note={vsBefore?.text}
            strong={vsBefore?.up}
          />
        </View>
        <View style={styles.row}>
          <Tile
            value={`+${formatNumber(recap.xp, 0)}`}
            label="XP"
            note={levelUp ? `Level up! Level ${recap.levelAfter}` : `Level ${recap.levelAfter}`}
            strong={levelUp}
          />
          <Tile
            value={String(recap.prs)}
            label={recap.prs === 1 ? "PR" : "PRs"}
            note={recap.prs === 0 ? "None this week" : recap.prs === 1 ? "A new personal record" : "New personal records"}
            strong={recap.prs > 0}
          />
        </View>

        <View style={styles.chips}>
          <Chip icon={<Dumbbell size={14} color={C.textSoft} />} text={plural(recap.sets, "set")} />
          <Chip icon={<Clock size={14} color={C.textSoft} />} text={formatDuration(recap.seconds)} />
          {recap.streak > 0 && (
            <Chip icon={<Flame size={14} color={C.signal} />} text={`${recap.streak}-week streak`} />
          )}
        </View>

        {animal && (
          <View style={styles.animal}>
            <AnimalIcon animal={animal.animal} width={52} height={34} color={C.accent} />
            <Text style={styles.animalText}>{animal.text}</Text>
          </View>
        )}

        {recap.achievements.length > 0 && (
          <View style={styles.achievements}>
            <Text style={styles.section}>
              {recap.achievements.length === 1 ? "Achievement unlocked" : "Achievements unlocked"}
            </Text>
            {recap.achievements.map((title) => (
              <View key={title} style={styles.achievement}>
                <Award size={18} color={C.signal} />
                <Text style={styles.achievementText}>{title}</Text>
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onClose}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>On to this week</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Tile({
  value,
  unit,
  label,
  note,
  strong,
}: {
  value: string;
  unit?: string;
  label: string;
  note?: string;
  strong?: boolean; // the note's good news, in the highlight colour
}) {
  return (
    <View style={styles.tile}>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {unit ? <Text style={styles.unit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.label}>{label}</Text>
      {note ? <Text style={[styles.note, strong && styles.noteStrong]}>{note}</Text> : null}
    </View>
  );
}

function Chip({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={styles.chip}>
      {icon}
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
  backdropContent: { flexGrow: 1, justifyContent: "center", padding: 20, paddingVertical: 48 },
  panel: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    backgroundColor: C.card,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.raised,
    padding: 20,
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 18 },
  headText: { flex: 1 },
  kicker: { color: C.signal, fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  title: { color: C.text, fontSize: 22, fontWeight: "700", marginTop: 4 },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  tile: { flex: 1, minWidth: 0, backgroundColor: C.bg, borderRadius: R.lg, paddingVertical: 14, paddingHorizontal: 14 },
  value: { ...T.num, fontSize: 34, lineHeight: 38 },
  unit: { ...T.num, fontSize: 18, color: C.textMuted },
  label: { color: C.textMuted, fontSize: 13 },
  note: { color: C.textFaint, fontSize: 12, marginTop: 6 },
  noteStrong: { color: C.signal, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.bg,
    borderRadius: R.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { color: C.textSoft, fontSize: 13 },
  animal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.raised,
  },
  animalText: { flex: 1, color: C.text, fontSize: 14, lineHeight: 19 },
  achievements: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.raised, gap: 8 },
  section: { color: C.textMuted, fontSize: 12, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  achievement: { flexDirection: "row", alignItems: "center", gap: 10 },
  achievementText: { color: C.text, fontSize: 15, fontWeight: "500" },
  button: { backgroundColor: C.accent, borderRadius: R.lg, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: C.onAccent, fontSize: 16, fontWeight: "600" },
});
