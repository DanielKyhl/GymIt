import * as Haptics from "expo-haptics";
import { Pencil, Timer } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { C, R, T } from "../constants/theme";
import { elapsedSeconds, formatClock, formatRest, RestTimer, shouldRing } from "../lib/activeWorkout";
import { playSound } from "../lib/sound";
import { TimerSoundId } from "../lib/timerSounds";

// The rest after a set: before the next set, or after an exercise's last set,
// before the next exercise. Idle, it's a hairline showing the rest length, or
// once that rest is over, how long you actually rested (tap to change the
// length). Once the set above is ticked it lights up and counts down the time
// left, then up past the target, so you see how long you really rested; its
// length can still be changed while it runs.
export function RestRow({
  seconds,
  rested,
  running,
  sound,
  onEdit,
  onStop,
  onRung,
}: {
  seconds: number;
  rested?: number; // how long the rest after this set ran, once it's over
  running: RestTimer | null; // this row's rest, while it runs
  sound: TimerSoundId; // played when the rest is up
  onEdit: () => void;
  onStop: () => void;
  onRung: () => void; // the rest's bell has rung
}) {
  return running ? (
    <ActiveRest rest={running} sound={sound} onEdit={onEdit} onStop={onStop} onRung={onRung} />
  ) : (
    <IdleRest seconds={seconds} rested={rested} onEdit={onEdit} />
  );
}

function IdleRest({ seconds, rested, onEdit }: { seconds: number; rested?: number; onEdit: () => void }) {
  return (
    <View style={styles.idleRow}>
      <View style={styles.line} />
      <Pressable
        style={({ pressed }) => [styles.idlePill, pressed && styles.idlePressed]}
        onPress={onEdit}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`${rested !== undefined ? `Rested ${formatRest(rested)}. ` : ""}Rest ${formatRest(seconds)}. Change rest time`}
      >
        <Text style={styles.idleText}>{rested !== undefined ? `rested ${formatRest(rested)}` : formatRest(seconds)}</Text>
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
  onRung,
}: {
  rest: RestTimer;
  sound: TimerSoundId;
  onEdit: () => void;
  onStop: () => void;
  onRung: () => void;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, []);

  const elapsed = elapsedSeconds(rest.startedAt, now);
  const over = elapsed >= rest.target;

  // The rest is up: one vibration and the sound picked in Settings, once (see
  // shouldRing). Only with the app on screen, where it can be heard: a rest
  // that ran out while it wasn't rings when you're back.
  const rang = useRef<number | null>(null); // the rest it rang for, until onRung lands
  useEffect(() => {
    if (!shouldRing(rest, now) || rang.current === rest.startedAt) return;
    if (AppState.currentState !== "active") return;
    rang.current = rest.startedAt;
    onRung();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    playSound(sound);
  }, [now, rest, sound, onRung]);

  const progress = Math.min(1, elapsed / Math.max(1, rest.target));
  // Before the target: the time left. Past it: how long you've rested, counting up.
  const left = rest.target - elapsed;

  return (
    <Pressable
      style={[styles.active, over && styles.activeOver]}
      onPress={onStop}
      accessibilityRole="button"
      accessibilityLabel={
        over
          ? `Resting ${formatClock(elapsed)} of ${formatRest(rest.target)}. Tap when you're done resting`
          : `Resting with ${formatClock(left)} left of ${formatRest(rest.target)}. Tap when you're done resting`
      }
    >
      <View style={[styles.fill, over && styles.fillOver, { width: `${progress * 100}%` }]} />
      <Timer size={16} color={over ? C.signal : C.accent} />
      <Text style={[styles.time, over && styles.timeOver]}>{formatClock(over ? elapsed : left)}</Text>
      {!over && <Text style={styles.left}>left</Text>}
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
  idleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.raised },
  idlePill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: R.pill },
  idlePressed: { backgroundColor: C.raised },
  idleText: { ...T.num, color: C.textFaint, fontSize: 12 },

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
  left: { color: C.textSoft, fontSize: 13, marginLeft: -2 },
  targetPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.pill, backgroundColor: C.raised },
  targetPressed: { backgroundColor: C.selected },
  target: { color: C.textSoft, fontSize: 13 },
  status: { flex: 1, color: C.textMuted, fontSize: 13 },
  stop: { color: C.accent, fontSize: 14, fontWeight: "600" },
});
