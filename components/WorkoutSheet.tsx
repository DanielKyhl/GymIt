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
import { C } from "../constants/theme";
import { useWorkoutSheet } from "../context/WorkoutSheet";
import { NumberPadArea } from "./NumberPad";
import { useTipTarget } from "./Tips";
import { WorkoutInProgress } from "./WorkoutInProgress";

// The workout in progress, in a sheet over the whole app (see
// context/WorkoutSheet.tsx): a card just below the status bar, with the app
// dimmed behind it. Pull it down by the strip with the handle along its top
// and it follows your finger; let go far enough down, or flick it, and it
// drops into the bar above the tabs. Tapping the handle does the same. Only
// that strip pulls it: dragging anywhere else scrolls the sets, or does
// nothing. Tucked away it's only out of sight: it stays mounted, so the clock
// and the rest timer keep going, and its rest-up sound still plays.

const native = Platform.OS !== "web";
export const SLIDE = { duration: 280, easing: Easing.out(Easing.cubic) };
const GAP = 10; // a strip of the app, dimmed, above the open sheet
const PULL = 110; // how far to pull before letting go tucks it away...
const FLICK = 0.6; // ...or how fast (px/ms) a shorter pull has to be

// In the browser, a drag that starts on a grip is the app's alone: iPhone
// Safari would otherwise take it for scrolling the page and cancel it halfway.
export const grabbable = (Platform.OS === "web" ? { touchAction: "none", userSelect: "none" } : {}) as ViewStyle;

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
  const gripRef = useTipTarget("workout.handle");
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const top = insets.top + GAP; // where its top edge sits when it's open
  // A pull that ends back on the handle is still a pull, not a tap.
  const pulled = useSharedValue(false);

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

  // The grip: a drag that starts on it moves the sheet, from wherever the
  // sheet is (so one that's been left part-way down can always be put right),
  // and where it's let go decides where it ends up; a tap tucks it away. It
  // takes the touch as it starts, so the drag stays its own when the finger
  // (or a mouse) runs off it onto the title. (The handle's button underneath
  // is for keyboards and screen readers.)
  const from = useSharedValue(0); // where the sheet was when the pull started
  const pull = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          pulled.set(false);
          from.set(y.get());
          clearSelection();
        },
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dy) > 4) pulled.set(true);
          y.set(Math.max(top, from.get() + g.dy));
        },
        // In the browser, text getting selected under the pull would otherwise
        // cut it short.
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, g) => {
          clearSelection();
          if (!pulled.get() || y.get() - top > PULL || g.vy > FLICK) hide();
          else y.set(withTiming(top, SLIDE));
        },
        onPanResponderTerminate: () => y.set(withTiming(top, SLIDE)),
      }),
    [top, hide, y, from, pulled]
  );

  if (!workout) return null;
  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.shade, dim, hidden && gone]} />
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        aria-hidden={!open}
        style={[styles.sheet, { height: height - top }, slide, hidden && gone]}
      >
        <View {...pull.panHandlers} style={grabbable}>
          <Pressable
            style={styles.grip}
            onPress={() => !pulled.get() && hide()}
            accessibilityRole="button"
            accessibilityLabel="Minimize workout"
          >
            <View ref={gripRef} style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
          </Pressable>
        </View>
        <NumberPadArea>
          <WorkoutInProgress key={workout.key} id={workout.id} onClose={close} />
        </NumberPadArea>
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
  grip: { alignItems: "center", paddingTop: 4, paddingBottom: 8 },
  // Around the handle, for the welcome tip that points at it.
  handleArea: { paddingVertical: 6, paddingHorizontal: 16 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.selected },
});
