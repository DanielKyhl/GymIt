import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { Award, Share2, Sparkles, Trophy } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";
import { ShareCard } from "../components/ShareCard";
import { C, T } from "../constants/theme";
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
    achievements?: string;
    records?: string;
  }>();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  const xp = Number(params.xp ?? 0);
  const level = Number(params.level ?? 1);
  const leveledUp = params.leveledUp === "1";
  const achievements = parseList<string>(params.achievements);
  const records = parseList<{ name: string; weight: number; reps: number }>(params.records);
  const celebrate = records.length > 0 || leveledUp;

  useEffect(() => {
    getWorkoutsForStats().then((all) => setWorkout(all.find((w) => w.id === params.id) ?? null));
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
      <Animated.View entering={ZoomIn.springify().damping(11)} style={styles.hero}>
        <Trophy size={44} color={C.signal} />
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(120)} style={styles.title}>
        {records.length > 0 ? "New personal best!" : "Workout complete!"}
      </Animated.Text>

      {workout && (
        <Animated.View entering={FadeInDown.delay(220)} style={styles.full}>
          <ShareCard ref={cardRef} workout={workout} volume={workoutVolume(workout)} records={records} />
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
      </Animated.View>

      {leveledUp && (
        <Animated.View entering={ZoomIn.delay(480).springify().damping(10)} style={styles.levelCard}>
          <Sparkles size={18} color={C.rest} />
          <Text style={styles.levelText}>Level up! You reached Level {level}</Text>
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
        <Pressable style={styles.doneBtn} onPress={() => router.replace("/(tabs)")} accessibilityRole="button">
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
  hero: { marginBottom: 10 },
  title: { color: C.text, fontSize: 26, fontWeight: "bold", marginBottom: 22 },
  xpRow: { flexDirection: "row", gap: 12, width: "100%", marginTop: 12 },
  xpBox: { flex: 1, backgroundColor: C.card, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  xpValue: { ...T.num, fontSize: 32, color: C.accent },
  xpLabel: { color: C.textMuted, fontSize: 13, marginTop: 2 },
  levelCard: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.rest,
    padding: 16, marginTop: 12, width: "100%",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  levelText: { color: C.rest, fontSize: 16, fontWeight: "500", textAlign: "center" },
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
