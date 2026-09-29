import * as Haptics from "expo-haptics";
import { Pencil, Timer } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, R, T } from "../constants/theme";
import { elapsedSeconds, formatClock, formatRest, restJustEnded, RestTimer } from "../lib/activeWorkout";
import { playSound } from "../lib/sound";
import { TimerSoundId } from "../lib/timerSounds";

// The rest after a set: before the next set, or after an exercise's last set,
// before the next exercise. Idle, it's a thin divider showing the rest length
// (tap to change it). Once the set above is ticked it lights up and counts
// up, past the target too, so you see how long you really rested; its length
// can still be changed while it runs.
export function RestRow({
  seconds,
  running,
  sound,
  onEdit,
  onStop,
}: {
  seconds: number;
  running: RestTimer | null; // this row's rest, while it runs
  sound: TimerSoundId; // played when the rest is up
  onEdit: () => void;
  onStop: () => void;
}) {
  return running ? (
    <ActiveRest rest={running} sound={sound} onEdit={onEdit} onStop={onStop} />
  ) : (
    <IdleRest seconds={seconds} onEdit={onEdit} />
  );
}

function IdleRest({ seconds, onEdit }: { seconds: number; onEdit: () => void }) {
  return (
    <View style={styles.idleRow}>
      <View style={styles.line} />
      <Pressable
        style={({ pressed }) => [styles.idlePill, pressed && styles.idlePressed]}
        onPress={onEdit}
        hitSlop={{ top: 8, bottom: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`Rest ${formatRest(seconds)}. Change rest time`}
      >
        <Timer size={12} color={C.textFaint} />
        <Text style={styles.idleText}>{formatRest(seconds)}</Text>
      </Pressable>
      <View style={styles.line} />
    </View>
  );
}

function ActiveRest({
  rest,
  sound,
  onEdit,
  onStop,
}: {
  rest: RestTimer;
  sound: TimerSoundId;
  onEdit: () => void;
  onStop: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const alerted = useRef(false);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, []);

  // A new rest, or a changed target, can alert again. One that already ran
  // out while the app was closed doesn't beep late on reopening.
  useEffect(() => {
    alerted.current = elapsedSeconds(rest.startedAt, Date.now()) >= rest.target;
  }, [rest.startedAt, rest.target]);

  const elapsed = elapsedSeconds(rest.startedAt, now);
  const over = elapsed >= rest.target;

  // Reaching the target: one vibration and the sound picked in Settings. Only
  // on time, though: coming back to the app after the rest ran out, it's too
  // late to ring (see restJustEnded).
  useEffect(() => {
    if (!over || alerted.current) return;
    alerted.current = true;
    if (!restJustEnded(rest, Date.now())) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    playSound(sound);
  }, [over, sound, rest]);

  const progress = Math.min(1, elapsed / Math.max(1, rest.target));

  return (
    <Pressable
      style={[styles.active, over && styles.activeOver]}
      onPress={onStop}
      accessibilityRole="button"
      accessibilityLabel={`Resting ${formatClock(elapsed)} of ${formatRest(rest.target)}. Tap when you're done resting`}
    >
      <View style={[styles.fill, over && styles.fillOver, { width: `${progress * 100}%` }]} />
      <Timer size={16} color={over ? C.signal : C.accent} />
      <Text style={[styles.time, over && styles.timeOver]}>{formatClock(elapsed)}</Text>
      {/* Its own button inside the row: the rest of the row still ends the rest. */}
      <Pressable
        style={({ pressed }) => [styles.targetPill, pressed && styles.targetPressed]}
        onPress={onEdit}
        hitSlop={{ top: 8, bottom: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`Rest ${formatRest(rest.target)}. Change rest time`}
      >
        <Text style={styles.target}>of {formatRest(rest.target)}</Text>
        <Pencil size={11} color={C.textMuted} />
      </Pressable>
      <Text style={styles.status} numberOfLines={1}>
        {over ? "Rest's up" : ""}
      </Text>
      <Text style={[styles.stop, over && styles.timeOver]}>{over ? "Done" : "Skip"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  idleRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 },
  line: { flex: 1, height: 1, backgroundColor: C.raised },
  idlePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.pill },
  idlePressed: { backgroundColor: C.raised },
  idleText: { ...T.num, color: C.textFaint, fontSize: 13 },

  active: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.accentDim,
    backgroundColor: C.bg,
    overflow: "hidden",
  },
  activeOver: { borderColor: C.signal },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "rgba(217, 213, 206, 0.12)" },
  fillOver: { backgroundColor: "rgba(233, 162, 59, 0.16)" },
  time: { ...T.num, fontSize: 20, color: C.accent },
  timeOver: { color: C.signal },
  targetPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.pill, backgroundColor: C.raised },
  targetPressed: { backgroundColor: C.selected },
  target: { color: C.textSoft, fontSize: 13 },
  status: { flex: 1, color: C.textMuted, fontSize: 13 },
  stop: { color: C.accent, fontSize: 14, fontWeight: "600" },
});
