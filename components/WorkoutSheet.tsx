import { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, PanResponder, Platform, Pressable, StyleSheet, useWindowDimensions, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { C } from "../constants/theme";
import { useWorkoutSheet } from "../context/WorkoutSheet";
import { NumberPadArea } from "./NumberPad";
import { grabbable, SheetGripContext } from "./SheetGrip";
import { WorkoutInProgress } from "./WorkoutInProgress";

// The workout in progress, in a sheet over the whole app (see
// context/WorkoutSheet.tsx): a card just below the status bar, with the app
// dimmed behind it. Pull it down by its top (the handle and the workout's
// title row) and it follows your finger; let go far enough down, or flick it,
// and it drops into the bar above the tabs. Tapping the handle does the same.
// Tucked away it's only out of sight: it stays mounted, so the clock and the
// rest timer keep going, and its rest-up sound still plays.

const native = Platform.OS !== "web";
export const SLIDE = { duration: 280, easing: Easing.out(Easing.cubic) };
const GAP = 10; // a strip of the app, dimmed, above the open sheet
const PULL = 110; // how far to pull before letting go tucks it away...
const FLICK = 0.6; // ...or how fast (px/ms) a shorter pull has to be

// A mouse pull that outruns the sheet drags across its text; don't leave that
// selected.
function clearSelection() {
  if (!native) window.getSelection?.()?.removeAllRanges();
}

// On the web, hidden for real once it's out of sight: no taps, no screen
// reader, no tab stops. (Native gets the same from pointerEvents and aria-hidden.)
const gone = (Platform.OS === "web" ? { visibility: "hidden" } : {}) as ViewStyle;

export function WorkoutSheet() {
  const { workout, open, hide, close, y, dock, peeking } = useWorkoutSheet();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const top = insets.top + GAP; // where its top edge sits when it's open
  // How far down from its top edge a pull can start: the handle's strip, and
  // the title row under it (which reports where it ends).
  const strip = useRef(0);
  const gripBottom = useRef(60);
  // A pull that ends back on the handle is still a pull, not a tap.
  const pulled = useRef(false);

  // Out of sight once it has finished sliding away (not while it slides), and
  // in sight while the bar is being pulled up.
  const [lastOpen, setLastOpen] = useState(open);
  const [leaving, setLeaving] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    setLeaving(!open);
  }
  const hidden = !open && !leaving && !peeking;

  // Open: up to the top. Tucked away: down into the bar, so it looks like it
  // turns into it (off the bottom of the screen if the bar hasn't shown yet).
  useEffect(() => {
    y.set(
      withTiming(open ? top : (dock.current ?? height), SLIDE, (finished) => {
        if (finished && !open) scheduleOnRN(setLeaving, false);
      })
    );
  }, [open, top, height, y, dock]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const dim = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), [top, height], [0.6, 0], Extrapolation.CLAMP),
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
        // Only a mostly-downward pull that starts at the top: taps (the handle,
        // the workout's name) stay what they are, and so does scrolling the
        // sets below. It's the whole sheet that asks, because a pull that starts
        // on the handle and runs onto the title row is only offered to what
        // holds them both.
        onMoveShouldSetPanResponderCapture: (_, g) =>
          g.y0 - top < strip.current + gripBottom.current + 6 && g.dy > 6 && g.dy > Math.abs(g.dx) * 1.2,
        onPanResponderGrant: () => {
          pulled.current = true;
          clearSelection();
        },
        onPanResponderMove: (_, g) => y.set(top + Math.max(0, g.dy)),
        // In the browser, text getting selected (or anything scrolling)
        // under the pull would otherwise cut it short.
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, g) => {
          clearSelection();
          if (g.dy > PULL || g.vy > FLICK) hide();
          else y.set(withTiming(top, SLIDE));
        },
        onPanResponderTerminate: () => y.set(withTiming(top, SLIDE)),
      }),
    [top, hide, y]
  );

  if (!workout) return null;
  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.shade, dim, hidden && gone]} />
      <Animated.View
        {...pull.panHandlers}
        pointerEvents={open ? "auto" : "none"}
        aria-hidden={!open}
        style={[styles.sheet, { height: height - top }, slide, hidden && gone]}
      >
        <View onLayout={(e) => (strip.current = e.nativeEvent.layout.height)} style={[styles.grip, grabbable]}>
          <Pressable
            style={styles.handleHit}
            onPressIn={() => (pulled.current = false)}
            onPress={() => !pulled.current && hide()}
            accessibilityRole="button"
            accessibilityLabel="Minimize workout"
          >
            <View style={styles.handle} />
          </Pressable>
        </View>
        <SheetGripContext.Provider value={(bottom) => (gripBottom.current = bottom)}>
          <NumberPadArea>
            <WorkoutInProgress key={workout.key} id={workout.id} onClose={close} />
          </NumberPadArea>
        </SheetGripContext.Provider>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  shade: { backgroundColor: "#000" },
  sheet: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: C.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: C.raised,
    overflow: "hidden",
  },
  grip: { alignItems: "center" },
  handleHit: { paddingHorizontal: 40, paddingTop: 8, paddingBottom: 10 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.selected },
});
