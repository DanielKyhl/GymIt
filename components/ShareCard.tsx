import { Flame } from "lucide-react-native";
import { Ref } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { C, FONT, T } from "../constants/theme";
import { Comparison } from "../lib/funFacts";
import { formatNumber } from "../lib/format";
import { rankFor } from "../lib/ranks";
import { bestSet } from "../lib/stats";
import { AnimalIcon } from "./AnimalIcon";
import { FRAMES, RankBadge } from "./RankBadge";
import { Workout } from "../types/workout";

type Line = { name: string; weight: number; reps: number };

type Props = {
  ref?: Ref<View>;
  workout: Workout;
  volume: number;
  records: Line[];
  comparison?: Comparison | null; // "the weight of 7 elephants"
  level?: number; // frames the card in the colours of your rank
};

// The workout at a glance. Shown on the summary screen and saved as an image
// by the Share button, so what you see is what gets shared.
export function ShareCard({ ref, workout, volume, records, comparison, level }: Props) {
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

  const rank = level ? rankFor(level) : null;
  const frame = rank ? FRAMES[rank.id] : null;
  const stops = frame ? [...frame.stops, frame.stops[0]] : [];

  return (
    // collapsable={false} keeps this a real native view, which the screenshot needs.
    <View ref={ref} collapsable={false} style={frame ? styles.frame : styles.plain}>
      {frame && (
        // The rank's metal or gem, as a border all the way round.
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="share-frame" x1="0" y1="0" x2="1" y2="1">
              {stops.map((c, i) => (
                <Stop key={i} offset={i / (stops.length - 1)} stopColor={c} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" rx={22} ry={22} fill="url(#share-frame)" />
        </Svg>
      )}
      <View style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.brand}>GYMIT</Text>
          {rank && level ? (
            <View style={styles.chip}>
              <RankBadge level={level} size={20} mini />
              <Text style={[styles.chipText, { color: frame!.color }]}>
                {rank.name.toUpperCase()} · LV {level}
              </Text>
            </View>
          ) : (
            <Text style={styles.date}>{date}</Text>
          )}
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {workout.name}
        </Text>
        {rank && <Text style={styles.dateUnder}>{date}</Text>}

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
              {formatNumber(volume, 0)}
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
                  {formatNumber(l.weight)} {unit} × {l.reps}
                </Text>
              </View>
            ))}
            {lines.length > 4 && <Text style={styles.more}>+{lines.length - 4} more</Text>}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: "100%", borderRadius: 22, padding: 3 },
  plain: { width: "100%", borderRadius: 20, borderWidth: 1, borderColor: C.raised, overflow: "hidden" },
  card: { backgroundColor: C.card, borderRadius: 19, padding: 20 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6 },
  chipText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6 },
  dateUnder: { color: C.textMuted, fontSize: 13, marginTop: -14, marginBottom: 18 },
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
