import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { Award, Share2, Sparkles } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";
import { LifetimeCard } from "../components/LifetimeCard";
import { RankBadge, rankColor } from "../components/RankBadge";
import { RpeHelpButton } from "../components/Rpe";
import { ShareCard } from "../components/ShareCard";
import { C, T } from "../constants/theme";
import { compareVolume, Comparison } from "../lib/funFacts";
import { lifetimeKg, lifetimeMilestone } from "../lib/milestones";
import { rankFor } from "../lib/ranks";
import { formatRPE, workoutRPE } from "../lib/rpe";
import { convertWeight } from "../lib/units";
import { workoutVolume } from "../lib/stats";
import { getWorkoutsForStats } from "../lib/storage";
import { Workout } from "../types/workout";

function parseList<T>(json: string | undefined): T[] {
  try {
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export default function WorkoutSummary() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    xp?: string;
    level?: string;
    leveledUp?: string;
    levelBefore?: string;
    achievements?: string;
    records?: string;
  }>();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [lifetime, setLifetime] = useState<{ totalKg: number; newMilestone: boolean } | null>(null);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  const xp = Number(params.xp ?? 0);
  const level = Number(params.level ?? 1);
  const leveledUp = params.leveledUp === "1";
  const levelBefore = Number(params.levelBefore ?? level);
  const newRank = rankFor(level).id !== rankFor(levelBefore).id;
  const achievements = parseList<string>(params.achievements);
  const records = parseList<{ name: string; weight: number; reps: number }>(params.records);
  const celebrate = records.length > 0 || leveledUp;
  const rpe = workout ? workoutRPE(workout) : null;

  useEffect(() => {
    getWorkoutsForStats().then((all) => {
      const w = all.find((x) => x.id === params.id) ?? null;
      setWorkout(w);
      // Seeded by how many workouts came before, so each new workout gets a
      // different animal even when the total barely changed.
      if (w) setComparison(compareVolume(workoutVolume(w), w.unit, all.filter((x) => x.date < w.date).length));
      // Did this workout take the lifetime total past a new landmark?
      const totalKg = lifetimeKg(all);
      const beforeKg = w ? totalKg - convertWeight(workoutVolume(w), w.unit, "kg") : totalKg;
      setLifetime({
        totalKg,
        newMilestone: lifetimeMilestone(totalKg).passed?.id !== lifetimeMilestone(beforeKg).passed?.id,
      });
    });
  }, [params.id]);

  useEffect(() => {
    if (celebrate) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [celebrate]);

  const share = async () => {
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle: "Share your workout" });
    } catch {
      // Closing the share sheet without sharing lands here too; nothing to do.
    }
    setSharing(false);
  };

  // Saving an image of a view isn't supported in the browser.
  const canShare = Platform.OS !== "web" && workout !== null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.Text entering={ZoomIn.springify().damping(12)} style={styles.title}>
        {records.length > 0 ? "New personal best!" : "Workout complete!"}
      </Animated.Text>

      {workout && (
        <Animated.View entering={FadeInDown.delay(220)} style={styles.full}>
          <ShareCard
            ref={cardRef}
            workout={workout}
            volume={workoutVolume(workout)}
            records={records}
            comparison={comparison}
            level={level}
          />
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(320)} style={styles.xpRow}>
        <View style={styles.xpBox}>
          <Text style={styles.xpValue}>+{xp}</Text>
          <Text style={styles.xpLabel}>XP earned</Text>
        </View>
        <View style={styles.xpBox}>
          <Text style={styles.xpValue}>{level}</Text>
          <Text style={styles.xpLabel}>Level</Text>
        </View>
        {rpe !== null && (
          <View style={styles.xpBox}>
            <Text style={styles.xpValue}>{formatRPE(rpe)}</Text>
            <View style={styles.rpeLabel}>
              <Text style={styles.xpLabel}>Avg RPE</Text>
              <RpeHelpButton size={13} />
            </View>
          </View>
        )}
      </Animated.View>

      {lifetime && workout && (
        <Animated.View entering={FadeInDown.delay(400)} style={[styles.full, styles.lifetime]}>
          <LifetimeCard totalKg={lifetime.totalKg} unit={workout.unit} newMilestone={lifetime.newMilestone} />
        </Animated.View>
      )}

      {leveledUp && (
        <Animated.View
          entering={ZoomIn.delay(480).springify().damping(10)}
          style={[styles.levelCard, { borderColor: rankColor(level) }]}
        >
          <RankBadge level={level} size={52} />
          <View style={styles.levelBody}>
            <View style={styles.levelHead}>
              <Sparkles size={16} color={C.rest} />
              <Text style={styles.levelText}>Level up! Level {level}</Text>
            </View>
            <Text style={[styles.levelSub, { color: rankColor(level) }]}>
              {newRank ? `New rank: ${rankFor(level).name}` : rankFor(level).name}
            </Text>
          </View>
        </Animated.View>
      )}

      {achievements.length > 0 && (
        <View style={styles.achBlock}>
          <Text style={styles.achHeader}>Achievement{achievements.length > 1 ? "s" : ""} unlocked</Text>
          {achievements.map((a, i) => (
            <Animated.View key={a} entering={FadeInDown.delay(560 + i * 90)} style={styles.achCard}>
              <Award size={22} color={C.signal} />
              <Text style={styles.achName}>{a}</Text>
            </Animated.View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        {canShare && (
          <Pressable style={styles.shareBtn} onPress={share} disabled={sharing} accessibilityRole="button">
            {sharing ? (
              <ActivityIndicator color={C.accent} />
            ) : (
              <>
                <Share2 size={18} color={C.accent} />
                <Text style={styles.shareText}>Share</Text>
              </>
            )}
          </Pressable>
        )}
        <Pressable style={styles.doneBtn} onPress={() => router.dismissTo("/(tabs)")} accessibilityRole="button">
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 24, paddingTop: 64, paddingBottom: 40, alignItems: "center" },
  full: { width: "100%" },
  lifetime: { marginTop: 12 },
  title: { color: C.text, fontSize: 26, fontWeight: "bold", marginBottom: 22 },
  xpRow: { flexDirection: "row", gap: 12, width: "100%", marginTop: 12 },
  xpBox: { flex: 1, backgroundColor: C.card, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  xpValue: { ...T.num, fontSize: 32, color: C.accent },
  xpLabel: { color: C.textMuted, fontSize: 13, marginTop: 2 },
  rpeLabel: { flexDirection: "row", alignItems: "center", gap: 4 },
  levelCard: {
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
    padding: 14, marginTop: 12, width: "100%",
    flexDirection: "row", alignItems: "center", gap: 14,
  },
  levelBody: { flex: 1 },
  levelHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  levelText: { color: C.rest, fontSize: 16, fontWeight: "600" },
  levelSub: { fontSize: 14, fontWeight: "600", marginTop: 3 },
  achBlock: { width: "100%", marginTop: 20 },
  achHeader: { color: C.textMuted, fontSize: 13, textTransform: "uppercase", marginBottom: 10, textAlign: "center" },
  achCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8,
  },
  achName: { color: C.text, fontSize: 16, fontWeight: "500" },
  actions: { flexDirection: "row", gap: 12, width: "100%", marginTop: 24 },
  shareBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: C.raised, borderRadius: 12, paddingVertical: 16, minHeight: 54,
  },
  shareText: { color: C.accent, fontSize: 16, fontWeight: "500" },
  doneBtn: { flex: 1, backgroundColor: C.accent, borderRadius: 12, paddingVertical: 16, alignItems: "center", minHeight: 54 },
  doneText: { color: C.onAccent, fontSize: 16, fontWeight: "600" },
});
