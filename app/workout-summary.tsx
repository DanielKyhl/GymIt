import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function WorkoutSummary() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    xp?: string;
    level?: string;
    leveledUp?: string;
    prs?: string;
    achievements?: string;
    volume?: string;
    unit?: string;
  }>();

  const xp = Number(params.xp ?? 0);
  const level = Number(params.level ?? 1);
  const leveledUp = params.leveledUp === "1";
  const prs = Number(params.prs ?? 0);
  const volume = Number(params.volume ?? 0);
  const unit = params.unit ?? "kg";
  let achievements: string[] = [];
  try {
    achievements = params.achievements ? JSON.parse(params.achievements) : [];
  } catch {
    achievements = [];
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.emoji}>💪</Text>
      <Text style={styles.title}>Workout complete!</Text>

      <View style={styles.xpCard}>
        <Text style={styles.xpValue}>+{xp}</Text>
        <Text style={styles.xpLabel}>XP earned</Text>
      </View>

      <View style={styles.volumeCard}>
        <Text style={styles.volumeValue}>{volume.toLocaleString()} {unit}</Text>
        <Text style={styles.volumeLabel}>Total weight lifted</Text>
      </View>

      {leveledUp && (
        <View style={styles.levelCard}>
          <Text style={styles.levelText}>🎉 Level up! You reached Level {level}</Text>
        </View>
      )}

      {prs > 0 && (
        <View style={styles.prCard}>
          <Text style={styles.prText}>
            🔥 {prs} new personal record{prs > 1 ? "s" : ""}!
          </Text>
        </View>
      )}

      {achievements.length > 0 && (
        <View style={styles.achBlock}>
          <Text style={styles.achHeader}>Achievement{achievements.length > 1 ? "s" : ""} unlocked</Text>
          {achievements.map((a) => (
            <View key={a} style={styles.achCard}>
              <Text style={styles.achIcon}>🏆</Text>
              <Text style={styles.achName}>{a}</Text>
            </View>
          ))}
        </View>
      )}

      <Pressable style={styles.doneBtn} onPress={() => router.replace("/(tabs)")}>
        <Text style={styles.doneText}>Done</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111" },
  content: { padding: 24, paddingTop: 80, alignItems: "center" },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { color: "white", fontSize: 26, fontWeight: "bold", marginBottom: 28 },
  xpCard: {
    backgroundColor: "#0a3d62", borderRadius: 16, paddingVertical: 24, paddingHorizontal: 48,
    alignItems: "center", marginBottom: 16, width: "100%",
  },
  xpValue: { color: "#9fd3ff", fontSize: 44, fontWeight: "bold" },
  xpLabel: { color: "#9fd3ff", fontSize: 14, marginTop: 2 },
  volumeCard: { backgroundColor: "#1c1c1e", borderRadius: 16, paddingVertical: 20, alignItems: "center", marginBottom: 16, width: "100%" },
  volumeValue: { color: "white", fontSize: 28, fontWeight: "bold" },
  volumeLabel: { color: "#8a8a8e", fontSize: 13, marginTop: 2 },
  levelCard: { backgroundColor: "#1c1c1e", borderRadius: 12, padding: 16, marginBottom: 12, width: "100%" },
  levelText: { color: "#fac775", fontSize: 16, fontWeight: "500", textAlign: "center" },
  prCard: { backgroundColor: "#1c1c1e", borderRadius: 12, padding: 16, marginBottom: 12, width: "100%" },
  prText: { color: "#e6b800", fontSize: 16, fontWeight: "500", textAlign: "center" },
  achBlock: { width: "100%", marginBottom: 12 },
  achHeader: { color: "#8a8a8e", fontSize: 13, textTransform: "uppercase", marginBottom: 10, textAlign: "center" },
  achCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#1c1c1e", borderRadius: 12, padding: 14, marginBottom: 8,
  },
  achIcon: { fontSize: 24 },
  achName: { color: "white", fontSize: 16, fontWeight: "500" },
  doneBtn: {
    backgroundColor: "#007AFF", borderRadius: 12, paddingVertical: 16,
    alignItems: "center", marginTop: 24, width: "100%",
  },
  doneText: { color: "white", fontSize: 16, fontWeight: "500" },
});
