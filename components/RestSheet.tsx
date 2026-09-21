import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { C, HIT, R, T } from "../constants/theme";
import { elapsedSeconds, formatClock, RestTimer } from "../lib/activeWorkout";

type Props = {
  rest: RestTimer;
  nextLabel?: string;
  onAdjust: (deltaSeconds: number) => void;
  onDone: () => void;
};

const SIZE = 84;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// The rest timer. It counts up: the ring fills toward the target, then turns
// red and keeps counting so you can see how long you've actually rested. When
// the target is reached it beeps and vibrates once.
export function RestSheet({ rest, nextLabel, onAdjust, onDone }: Props) {
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
  const ringColor = over ? C.danger : C.accent;

  return (
    <View style={[styles.sheet, over && styles.sheetOver]}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={C.raised} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={ringColor}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View style={styles.ringLabel} pointerEvents="none">
        <Text style={[styles.time, over && styles.timeOver]}>{formatClock(elapsed)}</Text>
        <Text style={styles.target}>of {formatClock(rest.target)}</Text>
      </View>

      <View style={styles.side}>
        <Text style={styles.title}>{over ? "Rest's up" : "Resting"}</Text>
        {nextLabel ? <Text style={styles.next}>{nextLabel}</Text> : null}
        <View style={styles.buttons}>
          <Pressable style={styles.btn} onPress={() => onAdjust(-15)} hitSlop={HIT} accessibilityLabel="15 seconds less">
            <Text style={styles.btnText}>−15s</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={() => onAdjust(15)} hitSlop={HIT} accessibilityLabel="15 seconds more">
            <Text style={styles.btnText}>+15s</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onDone} hitSlop={HIT}>
            <Text style={[styles.btnText, styles.btnPrimaryText]}>{over ? "Done" : "Skip"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.card,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.raised,
    padding: 12,
    marginTop: 10,
  },
  sheetOver: { borderColor: C.danger },
  ringLabel: {
    position: "absolute",
    left: 12,
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  time: { ...T.num, fontSize: 22 },
  timeOver: { color: C.danger },
  target: { color: C.textFaint, fontSize: 11 },
  side: { flex: 1, gap: 6 },
  title: { color: C.text, fontSize: 15, fontWeight: "600" },
  next: { color: C.textMuted, fontSize: 12 },
  buttons: { flexDirection: "row", gap: 6, marginTop: 2 },
  btn: {
    flex: 1,
    backgroundColor: C.raised,
    borderRadius: R.sm,
    paddingVertical: 8,
    alignItems: "center",
  },
  btnText: { color: C.text, fontSize: 13, fontWeight: "500" },
  btnPrimary: { backgroundColor: C.accent },
  btnPrimaryText: { color: C.onAccent },
});
