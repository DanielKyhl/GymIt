import { StyleSheet, Text, View } from "react-native";
import { Slug } from "react-native-body-highlighter";
import { C, T } from "../constants/theme";
import { MuscleSets } from "../lib/stats";

// A common evidence-based target for muscle growth: 10-20 hard sets per
// muscle per week.
const BAND_LOW = 10;
const BAND_HIGH = 20;

const NAMES: Partial<Record<Slug, string>> = {
  chest: "Chest",
  "upper-back": "Back",
  "lower-back": "Lower back",
  deltoids: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearm: "Forearms",
  trapezius: "Traps",
  quadriceps: "Quads",
  hamstring: "Hamstrings",
  gluteal: "Glutes",
  calves: "Calves",
  adductors: "Adductors",
  abs: "Abs",
  obliques: "Obliques",
  neck: "Neck",
};

function barColor(sets: number): string {
  if (sets < BAND_LOW) return C.accentDim;
  return sets <= BAND_HIGH ? C.success : C.signal;
}

export function MuscleSetBars({ data }: { data: MuscleSets[] }) {
  const scale = Math.max(24, ...data.map((m) => m.sets));
  const pct = (n: number) => `${(n / scale) * 100}%` as const;

  return (
    <View style={styles.list}>
      {data.map((m) => (
        <View key={m.slug} style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {NAMES[m.slug] ?? m.slug}
          </Text>
          <View style={styles.track}>
            <View style={[styles.band, { left: pct(BAND_LOW), width: pct(BAND_HIGH - BAND_LOW) }]} />
            {m.sets > 0 && <View style={[styles.fill, { width: pct(m.sets), backgroundColor: barColor(m.sets) }]} />}
          </View>
          <Text style={[styles.value, m.sets === 0 && styles.valueZero]}>{m.sets}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { width: 84, color: C.textSoft, fontSize: 13 },
  track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: C.raised, overflow: "hidden" },
  band: { position: "absolute", top: 0, bottom: 0, backgroundColor: "rgba(29, 158, 117, 0.22)" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 5 },
  value: { ...T.num, width: 24, textAlign: "right", fontSize: 16 },
  valueZero: { color: C.textFaint },
});
