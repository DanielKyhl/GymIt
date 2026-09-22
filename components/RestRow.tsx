import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Timer } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, R, T } from "../constants/theme";
import { elapsedSeconds, formatClock, formatRest, RestTimer } from "../lib/activeWorkout";
import { Anchor, measureAnchor } from "./DropdownMenu";

// The rest between two sets. Idle, it's a thin divider showing the rest
// length (tap to change it). Once the set above is ticked it lights up and
// counts up, past the target too, so you see how long you really rested.
export function RestRow({
  seconds,
  running,
  onEdit,
  onStop,
}: {
  seconds: number;
  running: RestTimer | null; // this row's rest, while it runs
  onEdit: (anchor: Anchor) => void;
  onStop: () => void;
}) {
  return running ? <ActiveRest rest={running} onStop={onStop} /> : <IdleRest seconds={seconds} onEdit={onEdit} />;
}

function IdleRest({ seconds, onEdit }: { seconds: number; onEdit: (anchor: Anchor) => void }) {
  const ref = useRef<View>(null);
  return (
    <View style={styles.idleRow}>
      <View style={styles.line} />
      <Pressable
        ref={ref}
        style={({ pressed }) => [styles.idlePill, pressed && styles.idlePressed]}
        onPress={() => measureAnchor(ref.current, onEdit)}
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

function ActiveRest({ rest, onStop }: { rest: RestTimer; onStop: () => void }) {
  const [now, setNow] = useState(Date.now());
  const beep = useAudioPlayer(require("../assets/sounds/rest-done.wav"));
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

  // Reaching the target: one vibration and a short beep.
  useEffect(() => {
    if (!over || alerted.current) return;
    alerted.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    try {
      beep.seekTo(0);
      beep.play();
    } catch {
      // Sound is a nice-to-have; the vibration and colour change still happen.
    }
  }, [over, beep]);

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
      <Text style={styles.target}>{over ? "Rest's up" : `of ${formatRest(rest.target)}`}</Text>
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
  target: { flex: 1, color: C.textMuted, fontSize: 13 },
  stop: { color: C.accent, fontSize: 14, fontWeight: "600" },
});
