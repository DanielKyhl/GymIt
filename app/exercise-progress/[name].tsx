import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Polyline, Text as SvgText } from "react-native-svg";
import { Flame } from "lucide-react-native";
import { getDefaultUnit, getWorkoutsForStats } from "../../lib/storage";
import { ExerciseSession, getExerciseSessions, PersonalRecord, prHistory } from "../../lib/stats";
import { C, FONT, T } from "../../constants/theme";
import { formatNumber, prGain, prTotal } from "../../lib/format";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// A round step for gridlines: 1, 2, 2.5 or 5 times a power of ten.
function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
}

// The axis fitted to the values, on round numbers, so a 101 → 117 kg climb
// fills the chart instead of sitting on top of a bar from zero.
function fittedAxis(values: number[]): { lo: number; hi: number; ticks: number[] } {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 1) {
    min -= 2.5;
    max += 2.5;
  }
  const step = niceStep((max - min) / 3);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks };
}

const CHART_H = 200;
const PAD = { top: 26, bottom: 26, left: 36, right: 22 };

// Estimated 1RM per session, as a line on a fitted axis: labelled gridlines,
// the first and latest values called out, the newest point in the signal colour.
function OneRmChart({ sessions }: { sessions: ExerciseSession[] }) {
  const [width, setWidth] = useState(0);
  const values = sessions.map((s) => s.best1RM);
  const { lo, hi, ticks } = fittedAxis(values);
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const n = values.length;
  const x = (i: number) => PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - lo) / (hi - lo)) * innerH;
  const baseY = PAD.top + innerH;
  const last = n - 1;
  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `M${x(0)},${baseY} ${values.map((v, i) => `L${x(i)},${y(v)}`).join(" ")} L${x(last)},${baseY} Z`;
  const label = { fontFamily: FONT.num, fontSize: 11, fill: C.textFaint };

  return (
    <View style={styles.chart} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg
          width={width}
          height={CHART_H}
          accessibilityLabel={`Estimated 1RM, ${formatNumber(values[0])} on ${formatDate(sessions[0].date)} to ${formatNumber(values[last])} on ${formatDate(sessions[last].date)}`}
        >
          {ticks.map((t) => (
            <Line key={t} x1={PAD.left} y1={y(t)} x2={width - PAD.right} y2={y(t)} stroke={C.raised} strokeWidth={1} />
          ))}
          {ticks.map((t) => (
            <SvgText key={`l${t}`} x={PAD.left - 8} y={y(t) + 4} textAnchor="end" {...label}>
              {formatNumber(t)}
            </SvgText>
          ))}
          {n > 1 && <Path d={area} fill={C.accent} fillOpacity={0.08} />}
          {n > 1 && <Polyline points={line} fill="none" stroke={C.accent} strokeWidth={2.25} strokeLinejoin="round" />}
          {values.map((v, i) =>
            i === last ? null : <Circle key={i} cx={x(i)} cy={y(v)} r={3} fill={C.accent} />
          )}
          <Circle cx={x(last)} cy={y(values[last])} r={5.5} fill={C.signal} stroke={C.bg} strokeWidth={2} />
          {n > 1 && (
            <SvgText x={x(0)} y={y(values[0]) - 10} textAnchor="middle" fontFamily={FONT.num} fontSize={12} fill={C.textMuted}>
              {formatNumber(values[0])}
            </SvgText>
          )}
          <SvgText
            x={x(last)}
            y={y(values[last]) - 12}
            textAnchor="middle"
            fontFamily={FONT.numBold}
            fontSize={14}
            fill={C.text}
          >
            {formatNumber(values[last])}
          </SvgText>
          <SvgText x={x(0)} y={CHART_H - 6} textAnchor={n === 1 ? "middle" : "start"} {...label}>
            {formatDate(sessions[0].date)}
          </SvgText>
          {n > 1 && (
            <SvgText x={x(last)} y={CHART_H - 6} textAnchor="end" {...label}>
              {formatDate(sessions[last].date)}
            </SvgText>
          )}
        </Svg>
      )}
    </View>
  );
}

export default function ExerciseProgress() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [unit, setUnit] = useState<"kg" | "lb">("kg");

  useEffect(() => {
    getWorkoutsForStats().then((workouts) => {
      setSessions(getExerciseSessions(workouts, name));
      setRecords(prHistory(workouts, name));
    });
    getDefaultUnit().then(setUnit);
  }, [name]);

  const best1RM = sessions.reduce((m, s) => Math.max(m, s.best1RM), 0);
  const bestWeight = sessions.reduce((m, s) => Math.max(m, s.topWeight), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{name}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Best weight</Text>
          <Text style={styles.statValue}>{bestWeight}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Best 1RM</Text>
          <Text style={styles.statValue}>{best1RM}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Sessions</Text>
          <Text style={styles.statValue}>{sessions.length}</Text>
        </View>
      </View>

      <Text style={styles.section}>Estimated 1RM over time</Text>
      {sessions.length === 0 ? (
        <Text style={styles.empty}>No logged sets yet.</Text>
      ) : (
        <OneRmChart sessions={sessions} />
      )}

      <Text style={styles.section}>Personal records · session volume</Text>
      {records.length === 0 ? (
        <Text style={styles.empty}>
          {sessions.length === 0
            ? "No logged sets yet."
            : "Beat your best total for this exercise and the record shows up here. Each template keeps its own."}
        </Text>
      ) : (
        <View style={styles.prList}>
          {records.map((r, i) => (
            <View key={r.date} style={[styles.prRow, i === records.length - 1 && styles.prRowLast]}>
              <Flame size={18} color={C.signal} />
              <View style={styles.prMain}>
                <Text style={styles.prSet}>{prTotal(r, unit)}</Text>
                <Text style={styles.prDate} numberOfLines={1}>
                  {r.workout} · {formatDate(r.date)}
                </Text>
              </View>
              <View style={styles.prRight}>
                <Text style={styles.prValue}>{prGain(r, unit)}</Text>
                <Text style={styles.prDelta}>on your best</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.section}>Session history</Text>
      {sessions
        .slice()
        .reverse()
        .map((s, i) => (
          <View key={i} style={styles.sessionRow}>
            <Text style={styles.sessionDate}>{formatDate(s.date)}</Text>
            <Text style={styles.sessionStat}>top {s.topWeight} · 1RM {s.best1RM}</Text>
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16 },
  title: { ...T.title, marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: "center" },
  statLabel: { color: C.textMuted, fontSize: 12, marginBottom: 6 },
  statValue: { ...T.num, fontSize: 30 },
  section: { ...T.label, marginBottom: 12, marginTop: 8 },
  empty: { color: C.textMuted, fontSize: 14, marginBottom: 20 },
  chart: { height: CHART_H, marginBottom: 24 },
  prList: { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14, marginBottom: 24 },
  prRow: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: C.raised,
  },
  prRowLast: { borderBottomWidth: 0 },
  prMain: { flex: 1 },
  prSet: { ...T.num, fontSize: 20 },
  prDate: { color: C.textMuted, fontSize: 12, marginTop: 1 },
  prRight: { alignItems: "flex-end" },
  prValue: { ...T.num, fontSize: 20, color: C.signal },
  prDelta: { color: C.textMuted, fontSize: 12, marginTop: 1 },
  sessionRow: {
    flexDirection: "row", justifyContent: "space-between",
    borderBottomWidth: 0.5, borderBottomColor: C.raised, paddingVertical: 12,
  },
  sessionDate: { color: C.text, fontSize: 14 },
  sessionStat: { color: C.textMuted, fontSize: 14 },
});
