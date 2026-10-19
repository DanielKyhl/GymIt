import { Trash2 } from "lucide-react-native";
import { ReactNode, useEffect, useMemo, useRef } from "react";
import { PanResponder, Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { C } from "../constants/theme";

// A row you can swipe left to delete, like a set in Strong: a red Delete
// slides out from under it, and letting go far enough along (or flicking it)
// deletes it; a shorter swipe springs back. Only a clearly sideways swipe
// counts, so scrolling past stays scrolling, and one that starts on a button
// or a number in the row still swipes it.

const DELETE_AT = 0.4; // of the row's width
const FLICK = 0.5; // px/ms, leftwards
const SLIDE = { duration: 180 };

// In the browser, sideways drags on the row are the app's to handle; up and
// down stay the page's, to scroll. And no text gets selected by a mouse drag.
const swipeable = (Platform.OS === "web" ? { touchAction: "pan-y", userSelect: "none" } : {}) as ViewStyle;

export function SwipeToDelete({
  onDelete,
  background,
  style,
  children,
}: {
  onDelete: () => void;
  background: string; // what the row sits on, to cover the Delete until it's swiped
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const x = useSharedValue(0);
  const width = useRef(0);
  const deleteRef = useRef(onDelete);
  useEffect(() => {
    deleteRef.current = onDelete;
  });

  const swipe = useMemo(() => {
    const back = () => x.set(withTiming(0, SLIDE));
    // Gone: delete it, then put the row back for whatever moves up into its place.
    const remove = () => {
      deleteRef.current();
      x.set(0);
    };
    return PanResponder.create({
      // Capture, so a swipe that starts on the row's buttons still counts.
      onMoveShouldSetPanResponderCapture: (_, g) => g.dx < -10 && -g.dx > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => x.set(Math.min(0, g.dx)),
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        const w = width.current || 1;
        if (-g.dx > w * DELETE_AT || g.vx < -FLICK) {
          x.set(
            withTiming(-w, SLIDE, (finished) => {
              if (finished) scheduleOnRN(remove);
            })
          );
        } else back();
      },
      onPanResponderTerminate: back,
    });
  }, [x]);

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  // The red is only as wide as the gap the row leaves, so none of it shows
  // round the row's corners.
  const reveal = useAnimatedStyle(() => ({
    width: Math.max(0, -x.get()),
    opacity: interpolate(-x.get(), [0, 24, 60], [0, 0.6, 1], Extrapolation.CLAMP),
  }));

  return (
    <View
      {...swipe.panHandlers}
      onLayout={(e) => (width.current = e.nativeEvent.layout.width)}
      style={[styles.wrap, swipeable, style]}
    >
      <Animated.View style={[styles.behind, reveal]} pointerEvents="none">
        <Trash2 size={18} color={C.text} />
        <Text style={styles.label} numberOfLines={1}>
          Delete
        </Text>
      </Animated.View>
      <Animated.View style={[{ backgroundColor: background }, slide]}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
  behind: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    overflow: "hidden",
    backgroundColor: C.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    paddingRight: 16,
  },
  label: { color: C.text, fontSize: 14, fontWeight: "600", flexShrink: 0 },
});
