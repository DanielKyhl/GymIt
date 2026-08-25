import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { plural, relativeDay } from "../../lib/format";
import { computeXP, levelInfo, thisWeekCount } from "../../lib/gamification";
import { lastUsedDate } from "../../lib/stats";
import { getTemplates, getWeeklyGoal, getWorkouts } from "../../lib/storage";
import { Template, Workout } from "../../types/workout";

export default function HomeScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState(3);

  useFocusEffect(
    useCallback(() => {
      getTemplates().then(setTemplates);
      getWorkouts().then(setWorkouts);
      getWeeklyGoal().then(setWeeklyGoal);
    }, [])
  );

  const totalXP = computeXP(workouts, weeklyGoal);
  const { level, xpIntoLevel, xpForNext, isMax } = levelInfo(totalXP);
  const weekCount = thisWeekCount(workouts);
  const progress = isMax ? 1 : Math.min(1, xpIntoLevel / xpForNext);

  const custom = templates.filter((t) => !t.id.startsWith("premade-"));
  const premade = templates.filter((t) => t.id.startsWith("premade-"));

  const renderCard = (item: Template) => {
    const used = lastUsedDate(workouts, item.name);
    const preview = item.exercises.map((e) => e.name).join(", ");
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        onPress={() => router.push(`/template/${item.id}`)}
      >
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardPreview} numberOfLines={2}>
          {preview || "No exercises"}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={styles.clock}>🕒</Text>
          <Text style={styles.cardMetaText}>{used ? relativeDay(used) : "Never used"}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>GymIt 💪</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.push("/settings")}>
            <Text style={styles.gear}>⚙</Text>
          </Pressable>
          <Pressable onPress={logout}>
            <Text style={styles.logout}>Log out</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.levelRow}>
          <Text style={styles.levelText}>Level {level}</Text>
          <Text style={styles.xpText}>{isMax ? "MAX" : `${xpIntoLevel} / ${xpForNext} XP`}</Text>
        </View>
        <View style={styles.xpBarBg}>
          <View style={[styles.xpBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.miniRow}>
          <Pressable onPress={() => router.push("/weekly-goal")}>
            <Text style={styles.miniStat}>This week  {weekCount}/{weeklyGoal}  ⚙</Text>
          </Pressable>
          <Text style={styles.miniStat}>{plural(workouts.length, "workout")} total</Text>
        </View>
      </View>

      <Pressable style={styles.achievementsLink} onPress={() => router.push("/achievements")}>
        <Text style={styles.achievementsText}>🏆  Achievements</Text>
        <Text style={styles.achievementsChevron}>›</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Your templates</Text>
      {custom.length === 0 ? (
        <Text style={styles.empty}>No templates yet. Create your first one below.</Text>
      ) : (
        <View style={styles.list}>{custom.map(renderCard)}</View>
      )}

      <Pressable style={styles.createButton} onPress={() => router.push("/create-template")}>
        <Text style={styles.createButtonText}>+ Create template</Text>
      </Pressable>

      {premade.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, styles.sectionSpacer]}>Example templates</Text>
          <View style={styles.list}>{premade.map(renderCard)}</View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111" },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { color: "white", fontSize: 28, fontWeight: "bold" },
  logout: { color: "#8a8a8e", fontSize: 14 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  gear: { color: "white", fontSize: 20 },
  statsCard: { backgroundColor: "#1c1c1e", borderRadius: 14, padding: 16, marginBottom: 24 },
  levelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  levelText: { color: "white", fontSize: 20, fontWeight: "bold" },
  xpText: { color: "#8a8a8e", fontSize: 13 },
  xpBarBg: { height: 10, backgroundColor: "#2c2c2e", borderRadius: 5, overflow: "hidden" },
  xpBarFill: { height: 10, backgroundColor: "#007AFF", borderRadius: 5 },
  miniRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  miniStat: { color: "#d0d0d0", fontSize: 13 },
  achievementsLink: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#1c1c1e", borderRadius: 12, padding: 16, marginBottom: 24,
  },
  achievementsText: { color: "white", fontSize: 15, fontWeight: "500" },
  achievementsChevron: { color: "#8a8a8e", fontSize: 20 },
  sectionTitle: { color: "#8a8a8e", fontSize: 13, marginBottom: 12, textTransform: "uppercase" },
  sectionSpacer: { marginTop: 28 },
  list: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  empty: { color: "#8a8a8e", fontSize: 15, textAlign: "center", marginTop: 20, marginBottom: 8 },
  card: {
    width: "48%", minHeight: 140, backgroundColor: "#1c1c1e",
    borderRadius: 24, borderWidth: 1, borderColor: "#333", padding: 16,
  },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "600", marginBottom: 8 },
  cardPreview: { color: "#8a8a8e", fontSize: 12, lineHeight: 17, marginBottom: 12 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: "auto" },
  clock: { fontSize: 13 },
  cardMetaText: { color: "#8a8a8e", fontSize: 12 },
  createButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
  },
  createButtonText: { color: "white", fontSize: 16, fontWeight: "500" },
});
