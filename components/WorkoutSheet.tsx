import { ChevronDown } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { BackHandler, PanResponder, Platform, Pressable, StyleSheet, useWindowDimensions, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { C, HIT } from "../constants/theme";
import { useWorkoutSheet } from "../context/WorkoutSheet";
import { WorkoutInProgress } from "./WorkoutInProgress";

// The workout in progress, in a sheet over the whole app (see
// context/WorkoutSheet.tsx). Pull it down by its top (the handle and the
// workout's title row) and the app shows through behind it; let go far
// enough down, or flick it, and it tucks away into the bar above the tabs.
// Tucked away it's only out of sight: it stays mounted, so the clock and the
// rest timer keep going, and its rest-up sound still plays.

const native = Platform.OS !== "web";
const SLIDE = { duration: 260, easing: Easing.out(Easing.cubic) };
const GRIP = 100; // how far down from the top a pull can start
const PULL = 120; // how far to pull before letting go tucks it away...
const FLICK = 0.8; // ...or how fast (px/ms) a shorter pull has to be

// A mouse pull that outruns the sheet drags across its text; don't leave that
// selected.
function clearSelection() {
  if (!native) window.getSelection?.()?.removeAllRanges();
}

// On the web, hidden for real once it's out of sight: no taps, no screen
// reader, no tab stops. (Native gets the same from pointerEvents and aria-hidden.)
const gone = (Platform.OS === "web" ? { visibility: "hidden" } : {}) as ViewStyle;

export function WorkoutSheet() {
  const { workout, open, hide, close } = useWorkoutSheet();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(height); // 0: covering the screen

  // Out of sight once it has finished sliding away (not while it slides).
  const [lastOpen, setLastOpen] = useState(open);
  const [leaving, setLeaving] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    setLeaving(!open);
  }
  const hidden = !open && !leaving;

  useEffect(() => {
    y.set(
      withTiming(open ? 0 : height, SLIDE, (finished) => {
        if (finished && !open) scheduleOnRN(setLeaving, false);
      })
    );
  }, [open, height, y]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const dim = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), [0, height], [0.55, 0], Extrapolation.CLAMP),
  }));

  // Android's back button tucks it away rather than leaving the app.
  useEffect(() => {
    if (!open || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      hide();
      return true;
    });
    return () => sub.remove();
  }, [open, hide]);

  const pull = useMemo(
    () =>
      PanResponder.create({
        // Only a mostly-downward pull that starts at the top: taps, and
        // scrolling the sets below, stay the workout's.
        onMoveShouldSetPanResponderCapture: (_, g) =>
          g.y0 < insets.top + GRIP && g.dy > 8 && g.dy > Math.abs(g.dx) * 1.5,
        onPanResponderGrant: clearSelection,
        onPanResponderMove: (_, g) => y.set(Math.max(0, g.dy)),
        // In the browser, text getting selected (or anything scrolling)
        // under the pull would otherwise cut it short.
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, g) => {
          clearSelection();
          if (g.dy > PULL || g.vy > FLICK) hide();
          else y.set(withTiming(0, SLIDE));
        },
        onPanResponderTerminate: () => y.set(withTiming(0, SLIDE)),
      }),
    [insets.top, hide, y]
  );

  if (!workout) return null;
  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.shade, dim, hidden && gone]} />
      <Animated.View
        {...pull.panHandlers}
        pointerEvents={open ? "auto" : "none"}
        aria-hidden={!open}
        style={[styles.sheet, { paddingTop: insets.top }, slide, hidden && gone]}
      >
        <View style={styles.grip}>
          <Pressable
            style={styles.down}
            onPress={hide}
            hitSlop={HIT}
            accessibilityRole="button"
            accessibilityLabel="Minimize workout"
          >
            <ChevronDown size={26} color={C.textSoft} />
          </Pressable>
          <View style={styles.handle} />
        </View>
        <WorkoutInProgress key={workout.key} id={workout.id} onClose={close} />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  shade: { backgroundColor: "#000" },
  sheet: { ...StyleSheet.absoluteFill, backgroundColor: C.bg },
  // The browser leaves a pull that starts here to the sheet: no panning, and
  // no text selection starting under it.
  grip: {
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    ...(native ? {} : { touchAction: "none", userSelect: "none" }),
  } as ViewStyle,
  handle: { width: 38, height: 5, borderRadius: 3, backgroundColor: C.selected },
  down: { position: "absolute", left: 14, top: 3 },
});
