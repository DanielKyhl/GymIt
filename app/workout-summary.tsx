import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { C, T } from "../constants/theme";
import { Award, Flame, Sparkles, Trophy } from "lucide-react-native";

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
      <View style={styles.hero}>
        <Trophy size={48} color={C.signal} />
      </View>
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
          <Sparkles size={18} color={C.rest} />
          <Text style={styles.levelText}>Level up! You reached Level {level}</Text>
        </View>
      )}

      {prs > 0 && (
        <View style={styles.prCard}>
          <Flame size={18} color={C.signal} />
          <Text style={styles.prText}>
            {prs} new personal record{prs > 1 ? "s" : ""}!
          </Text>
        </View>
      )}

      {achievements.length > 0 && (
        <View style={styles.achBlock}>
          <Text style={styles.achHeader}>Achievement{achievements.length > 1 ? "s" : ""} unlocked</Text>
          {achievements.map((a) => (
            <View key={a} style={styles.achCard}>
              <Award size={22} color={C.signal} />
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
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 24, paddingTop: 80, alignItems: "center" },
  hero: { marginBottom: 12 },
  title: { color: C.text, fontSize: 26, fontWeight: "bold", marginBottom: 28 },
  xpCard: {
    backgroundColor: C.card, borderRadius: 16, paddingVertical: 24, paddingHorizontal: 48,
    alignItems: "center", marginBottom: 16, width: "100%",
  },
  xpValue: { ...T.numBig, color: C.accent },
  xpLabel: { color: C.accent, fontSize: 14, marginTop: 2 },
  volumeCard: { backgroundColor: C.card, borderRadius: 16, paddingVertical: 20, alignItems: "center", marginBottom: 16, width: "100%" },
  volumeValue: { ...T.num, fontSize: 32 },
  volumeLabel: { color: C.textMuted, fontSize: 13, marginTop: 2 },
  levelCard: {
    backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 12, width: "100%",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  levelText: { color: C.rest, fontSize: 16, fontWeight: "500", textAlign: "center" },
  prCard: {
    backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 12, width: "100%",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  prText: { color: C.signal, fontSize: 16, fontWeight: "500", textAlign: "center" },
  achBlock: { width: "100%", marginBottom: 12 },
  achHeader: { color: C.textMuted, fontSize: 13, textTransform: "uppercase", marginBottom: 10, textAlign: "center" },
  achCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8,
  },
  achName: { color: C.text, fontSize: 16, fontWeight: "500" },
  doneBtn: {
    backgroundColor: C.accent, borderRadius: 12, paddingVertical: 16,
    alignItems: "center", marginTop: 24, width: "100%",
  },
  doneText: { color: C.onAccent, fontSize: 16, fontWeight: "500" },
});
