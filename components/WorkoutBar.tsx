import { Timer } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { C, R, T } from "../constants/theme";
import { useWorkoutSheet, WorkoutGlance } from "../context/WorkoutSheet";
import { elapsedSeconds, formatClock, formatRest } from "../lib/activeWorkout";
import { grabbable, SLIDE } from "./WorkoutSheet";

const OPEN = 70; // how far up to pull before letting go opens it...
const FLICK = 0.5; // ...or how fast (px/ms) a shorter pull has to be

// The workout while it's tucked away (components/WorkoutSheet.tsx), just above
// the tabs: its name, how long it's been going, and the rest timer. Pull it up
// and the workout comes up with your finger; let go high enough, or flick it,
// and it opens (a tap opens it too), otherwise it drops back into the bar.
export function WorkoutBar() {
  const { workout, open, glance, show, y, dock, setPeeking } = useWorkoutSheet();
  const box = useRef<View>(null);
  // A pull that ends back on the bar is still a pull, not a tap.
  const pulled = useRef(false);
  // Where the bar is on screen: where the sheet drops to, and comes up from.
  const measure = useCallback(() => box.current?.measureInWindow((_x, top) => (dock.current = top)), [dock]);

  const pull = useMemo(() => {
    const dropBack = () =>
      y.set(
        withTiming(dock.current ?? 0, SLIDE, (finished) => {
          if (finished) scheduleOnRN(setPeeking, false);
        })
      );
    return PanResponder.create({
      // Capture, so a pull that starts on the bar's button still counts.
      onMoveShouldSetPanResponderCapture: (_, g) => g.dy < -6 && -g.dy > Math.abs(g.dx),
      onPanResponderGrant: () => {
        pulled.current = true;
        measure();
        setPeeking(true);
      },
      onPanResponderMove: (_, g) => {
        if (dock.current !== null) y.set(Math.max(0, dock.current + Math.min(0, g.dy)));
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        if (g.dy < -OPEN || g.vy < -FLICK) {
          show();
          setPeeking(false);
        } else dropBack();
      },
      onPanResponderTerminate: dropBack,
    });
  }, [show, y, dock, setPeeking, measure]);

  if (!workout || open || !glance) return null;
  return (
    <View ref={box} onLayout={measure} {...pull.panHandlers} style={[styles.wrap, grabbable]}>
      <Pressable
        style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
        onPressIn={() => (pulled.current = false)}
        onPress={() => !pulled.current && show()}
        accessibilityRole="button"
        accessibilityLabel={`Open workout, ${glance.name}`}
      >
        <View style={styles.handle} />
        <Text style={styles.name} numberOfLines={1}>
          {glance.name}
        </Text>
        <Ticking glance={glance} />
      </Pressable>
    </View>
  );
}

// The clock and the rest countdown, ticking on their own so the tabs don't
// re-render every second.
function Ticking({ glance }: { glance: WorkoutGlance }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(tick);
  }, []);

  const rest = glance.rest;
  const left = rest ? rest.target - elapsedSeconds(rest.startedAt, now) : 0;
  return (
    <View style={styles.line}>
      <Text style={styles.clock}>{formatClock(elapsedSeconds(glance.startedAt, now))}</Text>
      {rest && (
        <View style={[styles.rest, left <= 0 && styles.restUp]}>
          <Timer size={13} color={left > 0 ? C.accent : C.onAccent} />
          <Text style={[styles.restText, left <= 0 && styles.restUpText]}>
            {left > 0 ? `Rest ${formatRest(left)}` : "Rest's up"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // The screen's colour behind the bar's rounded corners, whatever sits behind the tabs.
  wrap: { backgroundColor: C.bg },
  bar: {
    alignItems: "center",
    paddingTop: 7,
    paddingBottom: 9,
    paddingHorizontal: 16,
    backgroundColor: C.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: C.raised,
  },
  pressed: { backgroundColor: C.raised },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.selected, marginBottom: 7 },
  name: { color: C.text, fontSize: 16, fontWeight: "600" },
  line: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  clock: { ...T.num, color: C.textMuted, fontSize: 16 },
  rest: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: R.pill,
    backgroundColor: C.raised,
  },
  restUp: { backgroundColor: C.signal },
  restText: { ...T.num, color: C.accent, fontSize: 15 },
  restUpText: { color: C.onAccent },
});
