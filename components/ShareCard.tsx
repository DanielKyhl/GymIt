import { Flame } from "lucide-react-native";
import { Ref } from "react";
import { StyleSheet, Text, View } from "react-native";
import { C, FONT, T } from "../constants/theme";
import { Comparison } from "../lib/funFacts";
import { bestSet } from "../lib/stats";
import { AnimalIcon } from "./AnimalIcon";
import { Workout } from "../types/workout";

type Line = { name: string; weight: number; reps: number };

type Props = {
  ref?: Ref<View>;
  workout: Workout;
  volume: number;
  records: Line[];
  comparison?: Comparison | null; // "the weight of 7 elephants"
};

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

// The workout at a glance. Shown on the summary screen and saved as an image
// by the Share button, so what you see is what gets shared.
export function ShareCard({ ref, workout, volume, records, comparison }: Props) {
  const unit = workout.unit;
  const sets = workout.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.done && s.type !== "warmup").length,
    0
  );
  const minutes = Math.max(1, Math.round(workout.durationSeconds / 60));
  const date = new Date(workout.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  // With no records, show the best set of each exercise instead.
  const lines: Line[] =
    records.length > 0
      ? records
      : workout.exercises.flatMap((ex) => {
          const top = bestSet(ex.sets.filter((s) => s.done));
          return top && top.weight > 0 ? [{ name: ex.name, weight: top.weight, reps: top.reps }] : [];
        });

  return (
    // collapsable={false} keeps this a real native view, which the screenshot needs.
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.brand}>GYMIT</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {workout.name}
      </Text>

      {/* The hero: a big silhouette of the animal, with what it means under it. */}
      {comparison && (
        <View style={styles.hero}>
          <AnimalIcon animal={comparison.animal} width={260} height={150} color="#FFFFFF" />
          <Text style={styles.heroText}>{comparison.text}</Text>
        </View>
      )}

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{minutes}</Text>
          <Text style={styles.statLabel}>Minutes</Text>
        </View>
        <View style={[styles.stat, styles.statWide]}>
          <Text style={styles.statValue} numberOfLines={1}>
            {Math.round(volume).toLocaleString()}
            <Text style={styles.statUnit}> {unit}</Text>
          </Text>
          <Text style={styles.statLabel}>Volume</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{sets}</Text>
          <Text style={styles.statLabel}>Sets</Text>
        </View>
      </View>

      {lines.length > 0 && (
        <View style={styles.lines}>
          <View style={styles.linesHeader}>
            {records.length > 0 && <Flame size={14} color={C.signal} />}
            <Text style={[styles.linesTitle, records.length > 0 && { color: C.signal }]}>
              {records.length > 0 ? (records.length === 1 ? "New record" : "New records") : "Best sets"}
            </Text>
          </View>
          {lines.slice(0, 4).map((l) => (
            <View key={l.name} style={styles.line}>
              <Text style={styles.lineName} numberOfLines={1}>
                {l.name}
              </Text>
              <Text style={styles.lineSet}>
                {fmt(l.weight)} {unit} × {l.reps}
              </Text>
            </View>
          ))}
          {lines.length > 4 && <Text style={styles.more}>+{lines.length - 4} more</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%", backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.raised, padding: 20,
  },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  brand: { fontFamily: FONT.numBold, fontSize: 18, letterSpacing: 2, color: C.accent },
  date: { color: C.textMuted, fontSize: 13 },
  name: { color: C.text, fontSize: 26, fontWeight: "700", marginBottom: 18 },
  stats: { flexDirection: "row", justifyContent: "space-between" },
  stat: { flex: 1 },
  statWide: { flex: 1.8 }, // volume runs to 5-6 digits
  statValue: { ...T.num, fontSize: 30 },
  statUnit: { ...T.num, color: C.textMuted, fontSize: 16 },
  statLabel: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  hero: { alignItems: "center", paddingTop: 6, paddingBottom: 22 },
  heroText: { color: C.text, fontSize: 20, fontWeight: "700", textAlign: "center", marginTop: 16, lineHeight: 26 },
  lines: { borderTopWidth: 1, borderTopColor: C.raised, marginTop: 18, paddingTop: 14, gap: 8 },
  linesHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  linesTitle: { color: C.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  lineName: { flex: 1, color: C.text, fontSize: 14 },
  lineSet: { ...T.num, color: C.textSoft, fontSize: 16 },
  more: { color: C.textFaint, fontSize: 12 },
});
