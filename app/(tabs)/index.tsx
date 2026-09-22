import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { BodyWeightPrompt } from "../../components/BodyWeightPrompt";
import { WeekStrip } from "../../components/WeekStrip";
import { useAuth } from "../../context/AuthContext";
import { plural, relativeDay } from "../../lib/format";
import { computeXP, levelInfo, thisWeekCount } from "../../lib/gamification";
import { computeRecovery } from "../../lib/recovery";
import { consistencyGrid, lastUsedDate } from "../../lib/stats";
import { Suggestion, suggestTemplate } from "../../lib/suggest";
import {
  getActiveWorkout,
  getDefaultUnit,
  getPlanTemplates,
  getTemplates,
  getWeeklyGoal,
  getWorkoutsForStats,
  setBodyWeight,
  shouldAskBodyWeight,
  skipBodyWeight,
} from "../../lib/storage";
import { Template, Workout } from "../../types/workout";
import { ChevronRight, Clock, Pencil, Play, Plus, Settings, Trophy } from "lucide-react-native";
import { ActiveWorkout, elapsedSeconds } from "../../lib/activeWorkout";
import { C, HIT, T } from "../../constants/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [askWeight, setAskWeight] = useState(false);
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [inProgress, setInProgress] = useState<ActiveWorkout | null>(null);
  const [planIds, setPlanIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      getTemplates().then(setTemplates);
      getWorkoutsForStats().then(setWorkouts);
      getWeeklyGoal().then(setWeeklyGoal);
      getDefaultUnit().then(setUnit);
      shouldAskBodyWeight().then(setAskWeight);
      getActiveWorkout().then(setInProgress);
      getPlanTemplates().then(setPlanIds);
    }, [])
  );

  const totalXP = computeXP(workouts, weeklyGoal);
  const { level, xpIntoLevel, xpForNext, isMax } = levelInfo(totalXP);
  const weekCount = thisWeekCount(workouts);
  const progress = isMax ? 1 : Math.min(1, xpIntoLevel / xpForNext);
  const week = consistencyGrid(workouts, 1)[0];
  const suggestion = suggestTemplate(templates, workouts, computeRecovery(workouts), planIds);

  // The XP bar fills up to its value instead of appearing full.
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(withTiming(progress, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [fill, progress]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

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
          <Clock size={13} color={C.textMuted} />
          <Text style={styles.cardMetaText}>{used ? relativeDay(used) : "Never used"}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>GymIt</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.push("/settings")} hitSlop={HIT} accessibilityLabel="Settings">
            <Settings size={22} color={C.text} />
          </Pressable>
          <Pressable onPress={logout}>
            <Text style={styles.logout}>Log out</Text>
          </Pressable>
        </View>
      </View>

      {!inProgress && suggestion && (
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Up next</Text>
          <Pressable onPress={() => router.push(`/template/${suggestion.template.id}`)} hitSlop={HIT}>
            <Text style={styles.heroName} numberOfLines={1}>
              {suggestion.template.name}
            </Text>
          </Pressable>
          <Text style={styles.heroMeta}>{heroReason(suggestion)}</Text>
          <Pressable
            style={styles.heroBtn}
            onPress={() => router.push(`/workout/${suggestion.template.id}`)}
            accessibilityRole="button"
          >
            <Play size={18} color={C.onAccent} fill={C.onAccent} />
            <Text style={styles.heroBtnText}>Start workout</Text>
          </Pressable>
        </View>
      )}

      {inProgress && (
        <Pressable style={styles.resumeCard} onPress={() => router.push("/workout/resume")}>
          <View style={styles.resumeText}>
            <Text style={styles.resumeLabel}>Workout in progress</Text>
            <Text style={styles.resumeName} numberOfLines={1}>
              {inProgress.name} · {Math.floor(elapsedSeconds(inProgress.startedAt, Date.now()) / 60)} min
            </Text>
          </View>
          <View style={styles.resumeBtn}>
            <Play size={16} color={C.onAccent} />
            <Text style={styles.resumeBtnText}>Resume</Text>
          </View>
        </Pressable>
      )}

      <View style={styles.statsCard}>
        <View style={styles.levelRow}>
          <Text style={styles.levelText}>Level {level}</Text>
          <Text style={styles.xpText}>{isMax ? "MAX" : `${xpIntoLevel} / ${xpForNext} XP`}</Text>
        </View>
        <View style={styles.xpBarBg}>
          <Animated.View style={[styles.xpBarFill, fillStyle]} />
        </View>
        <View style={styles.weekStrip}>
          <WeekStrip days={week} />
        </View>
        <View style={styles.miniRow}>
          <Pressable style={styles.goalLink} onPress={() => router.push("/weekly-goal")} hitSlop={HIT}>
            <Text style={styles.miniStat}>This week  {weekCount}/{weeklyGoal}</Text>
            <Pencil size={12} color={C.textSoft} />
          </Pressable>
          <Text style={styles.miniStat}>{plural(workouts.length, "workout")} total</Text>
        </View>
      </View>

      <Pressable style={styles.emptyWorkout} onPress={() => router.push("/workout/new")}>
        <Plus size={18} color={C.accent} />
        <Text style={styles.emptyWorkoutText}>Start empty workout</Text>
      </Pressable>

      <Pressable style={styles.achievementsLink} onPress={() => router.push("/achievements")}>
        <View style={styles.achievementsLabel}>
          <Trophy size={18} color={C.signal} />
          <Text style={styles.achievementsText}>Achievements</Text>
        </View>
        <ChevronRight size={20} color={C.textMuted} />
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
      <BodyWeightPrompt
        visible={askWeight}
        unit={unit}
        onSave={(value, entered) => {
          setAskWeight(false);
          setBodyWeight(value, entered);
        }}
        onLater={() => {
          setAskWeight(false);
          skipBodyWeight();
        }}
      />
    </ScrollView>
  );
}

// Why this template: how recovered its muscles are, and when you last did it.
function heroReason({ readiness, lastDone }: Suggestion): string {
  const recovered = readiness >= 95 ? "Muscles recovered" : `Muscles ${readiness}% recovered`;
  const last = lastDone ? `last done ${relativeDay(lastDone).toLowerCase()}` : "not done yet";
  return `${recovered} · ${last}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { color: C.text, fontSize: 28, fontWeight: "bold" },
  logout: { color: C.textMuted, fontSize: 14 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  statsCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 12 },
  hero: {
    backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.raised,
    padding: 20, marginBottom: 12,
  },
  heroLabel: { color: C.signal, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  heroName: { color: C.text, fontSize: 30, fontWeight: "700", marginTop: 4 },
  heroMeta: { color: C.textMuted, fontSize: 13, marginTop: 4, marginBottom: 16 },
  heroBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.accent, borderRadius: 12, paddingVertical: 15,
  },
  heroBtnText: { color: C.onAccent, fontSize: 16, fontWeight: "600" },
  weekStrip: { marginTop: 16 },
  resumeCard: {
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12,
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.signal, padding: 14,
  },
  resumeText: { flex: 1 },
  resumeLabel: { color: C.signal, fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  resumeName: { color: C.text, fontSize: 15, fontWeight: "500", marginTop: 2 },
  resumeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9,
  },
  resumeBtnText: { color: C.onAccent, fontSize: 14, fontWeight: "600" },
  emptyWorkout: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12,
    borderWidth: 1, borderColor: C.raised, borderRadius: 14, paddingVertical: 14,
  },
  emptyWorkoutText: { color: C.accent, fontSize: 15, fontWeight: "500" },
  levelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  levelText: { ...T.num, fontSize: 26 },
  xpText: { ...T.num, color: C.textMuted, fontSize: 16 },
  xpBarBg: { height: 10, backgroundColor: C.raised, borderRadius: 5, overflow: "hidden" },
  xpBarFill: { height: 10, backgroundColor: C.accent, borderRadius: 5 },
  miniRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  miniStat: { color: C.textSoft, fontSize: 13 },
  goalLink: { flexDirection: "row", alignItems: "center", gap: 6 },
  achievementsLink: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 24,
  },
  achievementsText: { color: C.text, fontSize: 15, fontWeight: "500" },
  achievementsLabel: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle: { color: C.textMuted, fontSize: 13, marginBottom: 12, textTransform: "uppercase" },
  sectionSpacer: { marginTop: 28 },
  list: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  empty: { color: C.textMuted, fontSize: 15, textAlign: "center", marginTop: 20, marginBottom: 8 },
  card: {
    width: "48%", minHeight: 140, backgroundColor: C.card,
    borderRadius: 24, borderWidth: 1, borderColor: C.raised, padding: 16,
  },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: "600", marginBottom: 8 },
  cardPreview: { color: C.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 12 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: "auto" },
  cardMetaText: { color: C.textMuted, fontSize: 12 },
  createButton: {
    backgroundColor: C.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
  },
  createButtonText: { color: C.onAccent, fontSize: 16, fontWeight: "500" },
});
