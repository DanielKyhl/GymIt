import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Flame } from "lucide-react-native";
import { getDefaultUnit, getWorkoutsForStats } from "../../lib/storage";
import { ExerciseSession, getExerciseSessions, PersonalRecord, prHistory } from "../../lib/stats";
import { C, T } from "../../constants/theme";
import { prGain, prTotal } from "../../lib/format";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
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
  const maxBar = Math.max(best1RM, 1);

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
        <View style={styles.chart}>
          {sessions.map((s, i) => (
            <View key={i} style={styles.barWrap}>
              <View style={[styles.bar, { height: Math.max(4, (s.best1RM / maxBar) * 150) }]} />
              <Text style={styles.barLabel}>{formatDate(s.date)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.section}>Personal records</Text>
      {records.length === 0 ? (
        <Text style={styles.empty}>
          {sessions.length === 0
            ? "No logged sets yet."
            : "Beat your best total for this exercise and the record shows up here."}
        </Text>
      ) : (
        <View style={styles.prList}>
          {records.map((r, i) => (
            <View key={r.date} style={[styles.prRow, i === records.length - 1 && styles.prRowLast]}>
              <Flame size={18} color={C.signal} />
              <View style={styles.prMain}>
                <Text style={styles.prSet}>{prTotal(r, unit)}</Text>
                <Text style={styles.prDate}>{formatDate(r.date)}</Text>
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
  title: { color: C.text, fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: "center" },
  statLabel: { color: C.textMuted, fontSize: 12, marginBottom: 6 },
  statValue: { ...T.num, fontSize: 30 },
  section: { color: C.textMuted, fontSize: 13, textTransform: "uppercase", marginBottom: 12, marginTop: 8 },
  empty: { color: C.textMuted, fontSize: 14, marginBottom: 20 },
  chart: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    height: 180, marginBottom: 24, paddingTop: 10,
  },
  barWrap: { alignItems: "center", flex: 1 },
  bar: { width: "70%", backgroundColor: C.accent, borderRadius: 4 },
  barLabel: { color: C.textMuted, fontSize: 10, marginTop: 6 },
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
