import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { getWorkouts } from "../../lib/storage";
import { ExerciseSession, getExerciseSessions } from "../../lib/stats";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function ExerciseProgress() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);

  useEffect(() => {
    getWorkouts().then((workouts) => setSessions(getExerciseSessions(workouts, name)));
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
  container: { flex: 1, backgroundColor: "#131313" },
  content: { padding: 20, paddingTop: 16 },
  title: { color: "#F2F0EC", fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: "#1C1C1C", borderRadius: 12, padding: 14, alignItems: "center" },
  statLabel: { color: "#8C8A86", fontSize: 12, marginBottom: 6 },
  statValue: { color: "#F2F0EC", fontSize: 22, fontWeight: "bold" },
  section: { color: "#8C8A86", fontSize: 13, textTransform: "uppercase", marginBottom: 12, marginTop: 8 },
  empty: { color: "#8C8A86", fontSize: 14, marginBottom: 20 },
  chart: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    height: 180, marginBottom: 24, paddingTop: 10,
  },
  barWrap: { alignItems: "center", flex: 1 },
  bar: { width: "70%", backgroundColor: "#D9D5CE", borderRadius: 4 },
  barLabel: { color: "#8C8A86", fontSize: 10, marginTop: 6 },
  sessionRow: {
    flexDirection: "row", justifyContent: "space-between",
    borderBottomWidth: 0.5, borderBottomColor: "#272727", paddingVertical: 12,
  },
  sessionDate: { color: "#F2F0EC", fontSize: 14 },
  sessionStat: { color: "#8C8A86", fontSize: 14 },
});
