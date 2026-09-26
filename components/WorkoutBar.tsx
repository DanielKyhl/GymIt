import { ChevronUp, Timer } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { C, R, T } from "../constants/theme";
import { useWorkoutSheet, WorkoutGlance } from "../context/WorkoutSheet";
import { elapsedSeconds, formatClock, formatRest } from "../lib/activeWorkout";

// The workout while it's tucked away (components/WorkoutSheet.tsx), just above
// the tabs: its name, how long it's been going, and the rest timer. Tap it or
// swipe it up to bring the workout back.
export function WorkoutBar() {
  const { workout, open, glance, show } = useWorkoutSheet();
  const swipe = useMemo(
    () =>
      PanResponder.create({
        // Capture, so a swipe that starts on the button still counts.
        onMoveShouldSetPanResponderCapture: (_, g) => g.dy < -8 && -g.dy > Math.abs(g.dx),
        onPanResponderRelease: (_, g) => {
          if (g.dy < -20 || g.vy < -0.3) show();
        },
      }),
    [show]
  );

  if (!workout || open || !glance) return null;
  return (
    <View {...swipe.panHandlers} style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
        onPress={show}
        accessibilityRole="button"
        accessibilityLabel={`Open workout, ${glance.name}`}
      >
        <ChevronUp size={22} color={C.textSoft} />
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
    <>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {glance.name}
        </Text>
        <Text style={styles.clock}>{formatClock(elapsedSeconds(glance.startedAt, now))}</Text>
      </View>
      {rest && (
        <View style={[styles.rest, left <= 0 && styles.restUp]}>
          <Timer size={14} color={left > 0 ? C.accent : C.onAccent} />
          <Text style={[styles.restText, left <= 0 && styles.restUpText]}>
            {left > 0 ? `Rest ${formatRest(left)}` : "Rest's up"}
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.raised },
  bar: { flexDirection: "row", alignItems: "center", gap: 12, height: 56, paddingHorizontal: 14 },
  pressed: { backgroundColor: C.raised },
  text: { flex: 1 },
  name: { color: C.text, fontSize: 15, fontWeight: "600" },
  clock: { ...T.num, color: C.textMuted, fontSize: 15, marginTop: 1 },
  rest: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: R.pill,
    backgroundColor: C.raised,
  },
  restUp: { backgroundColor: C.signal },
  restText: { ...T.num, color: C.accent, fontSize: 16 },
  restUpText: { color: C.onAccent },
});
