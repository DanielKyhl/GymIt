import * as Haptics from "expo-haptics";
import { GripVertical } from "lucide-react-native";
import {
  createContext,
  ReactNode,
  Ref,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { GestureResponderEvent, Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, { SharedValue, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { C, HIT, R } from "../constants/theme";

// Moving exercises around mid-workout (components/WorkoutInProgress.tsx).
// Hold an exercise's name and the workout folds down to a list of its
// exercises, with the one you're holding lifted: drag it, and it goes where
// you let go. Let go without dragging and the list stays up, so you can drag
// any of them by its row; Done (or a tap beside the rows) puts the workout
// back.
//
//   <ReorderArea rows={…} onMove={…}>  around the exercise list
//   <HoldToMove index={i}>             around each exercise's name

const ROW = 56; // the most room a row takes, with the gap under it
const GAP = 6;
const HEAD = 44; // the list's title row, with Done
const PAD = 12;

export type ReorderRow = { key: string; name: string; detail: string };
export type ReorderHandle = { openList: () => void }; // the list, nothing lifted

type Drag = { from: number; to: number; startY: number }; // startY: the finger on screen when it started
type Place = { top: number; pitch: number }; // where the first row sits, and the room each row takes
type Hold = {
  pickUp: (index: number, pageY: number) => void;
  follow: (e: GestureResponderEvent) => void;
  letGo: (moved: boolean) => void; // moved: dragged, so it goes where it's let go
  cancel: () => void;
};

const HOLD_MS = 350; // how long a name is held before the exercise lifts
const SLOP = 10; // a finger that moves this far first is scrolling, not holding

const HoldContext = createContext<Hold | null>(null);

const native = Platform.OS !== "web";
function buzz(pickUp = false) {
  if (!native) return;
  (pickUp ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) : Haptics.selectionAsync()).catch(() => undefined);
}

// In the browser, a finger that's moving an exercise mustn't scroll the sets
// underneath too: iPhone Safari would take the touch over and cancel it.
function stopScroll(e: TouchEvent) {
  if (e.cancelable) e.preventDefault();
}
// And with a mouse, moving a held name drags a text selection across the page,
// and a selection ends the hold (react-native-web ends a touch once text is
// selected). So clear it the moment it starts: the window hears of it before
// react-native-web's listener on the document does.
function unselect() {
  window.getSelection?.()?.removeAllRanges();
}
function holdStill(on: boolean) {
  if (native) return;
  if (on) {
    document.addEventListener("touchmove", stopScroll, { passive: false });
    window.addEventListener("selectionchange", unselect, true);
  } else {
    document.removeEventListener("touchmove", stopScroll);
    window.removeEventListener("selectionchange", unselect, true);
  }
}

// A row in the browser: no text selection or page panning under a drag.
const draggable = (native ? {} : { userSelect: "none", touchAction: "none", cursor: "grab" }) as ViewStyle;
// A name to hold: never selectable text, or holding it starts selecting it
// (the magnifier and Copy on an iPhone; with a mouse, a selection that ends
// the hold). It still scrolls like the rest.
const holdable = (native ? {} : { userSelect: "none", WebkitTouchCallout: "none" }) as ViewStyle;

function clearSelection() {
  if (!native) window.getSelection?.()?.removeAllRanges();
}

// An exercise's name: hold it to pick the exercise up. It keeps the touch from
// the moment it's pressed until it's let go, lifted or not: react-native-web
// can't hand a touch from one view to another that isn't as deep in the page
// (its common-ancestor search skips a step), so the drag can't be passed on
// to the list once it has folded down over the name. A finger that moves
// before the exercise lifts is scrolling: the page scrolls, and the hold is off.
export function HoldToMove({
  index,
  onPickUp,
  style,
  children,
}: {
  index: number;
  onPickUp?: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const hold = useContext(HoldContext);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const touch = useRef({ startY: 0, lifted: false, moved: false });
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!hold) return <View style={style}>{children}</View>;

  const end = () => {
    clearTimeout(timer.current);
    const t = touch.current;
    touch.current = { startY: 0, lifted: false, moved: false };
    return t;
  };
  return (
    <View
      style={[style, holdable]}
      accessibilityHint="Hold to move this exercise"
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        const pageY = e.nativeEvent.pageY;
        touch.current = { startY: pageY, lifted: false, moved: false };
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          touch.current.lifted = true;
          onPickUp?.();
          hold.pickUp(index, pageY);
        }, HOLD_MS);
      }}
      onResponderMove={(e) => {
        const t = touch.current;
        const moved = Math.abs(e.nativeEvent.pageY - t.startY);
        if (!t.lifted) {
          if (moved > SLOP) clearTimeout(timer.current);
          return;
        }
        if (moved > 4) t.moved = true;
        hold.follow(e);
      }}
      // Scrolling may have it until the exercise lifts; after that it's the drag's.
      onResponderTerminationRequest={() => !touch.current.lifted}
      onResponderRelease={() => {
        const t = end();
        if (t.lifted) hold.letGo(t.moved);
      }}
      onResponderTerminate={() => {
        if (end().lifted) hold.cancel();
      }}
    >
      {children}
    </View>
  );
}

export function ReorderArea({
  ref,
  rows,
  onMove,
  style,
  children,
}: {
  ref?: Ref<ReorderHandle>;
  rows: ReorderRow[];
  onMove: (from: number, to: number) => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const box = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [place, setPlaceState] = useState<Place | null>(null);
  const [drag, setDragState] = useState<Drag | null>(null);
  const liftY = useSharedValue(0); // where the lifted row is, from the first row's top
  // The same again for the gesture handlers, which run between renders.
  const live = useRef({ drag: null as Drag | null, place: null as Place | null, count: rows.length, onMove });
  useEffect(() => {
    live.current.count = rows.length;
    live.current.onMove = onMove;
  });
  useEffect(() => () => holdStill(false), []);

  const act = useMemo(() => {
    const setDrag = (d: Drag | null) => {
      live.current.drag = d;
      setDragState(d);
    };
    const setPlace = (p: Place | null) => {
      live.current.place = p;
      setPlaceState(p);
    };
    // Rows as big as they fit (up to ROW), laid out so the held one starts
    // under the finger, as near as the list allows.
    const measure = (index: number, pageY: number | null) =>
      box.current?.measureInWindow((_x, y, _w, h) => {
        const n = Math.max(live.current.count, 1);
        const pitch = Math.min(ROW, (h - HEAD - PAD) / n);
        const lowest = Math.max(HEAD, h - PAD - n * pitch);
        const top = pageY === null ? HEAD : Math.min(Math.max(pageY - y - pitch / 2 - index * pitch, HEAD), lowest);
        setPlace({ top, pitch });
        liftY.set(index * pitch);
      });
    const lift = (index: number, pageY: number) => {
      setDrag({ from: index, to: index, startY: pageY });
      const p = live.current.place;
      if (p) liftY.set(index * p.pitch);
      clearSelection();
    };
    const follow = (e: GestureResponderEvent) => {
      const { drag: d, place: p, count: n } = live.current;
      if (!d || !p) return;
      const moved = e.nativeEvent.pageY - d.startY;
      liftY.set(Math.min(Math.max(d.from * p.pitch + moved, 0), (n - 1) * p.pitch));
      const to = Math.min(Math.max(d.from + Math.round(moved / p.pitch), 0), n - 1);
      if (to !== d.to) {
        setDrag({ ...d, to });
        buzz();
      }
    };
    const drop = (commit: boolean) => {
      const d = live.current.drag;
      setDrag(null);
      if (commit && d && d.to !== d.from) live.current.onMove(d.from, d.to);
    };
    const close = () => {
      holdStill(false);
      setDrag(null);
      setPlace(null);
      setOpen(false);
    };
    return {
      hold: {
        // An exercise's name has been held: fold down to the list, that one lifted.
        pickUp: (index: number, pageY: number) => {
          holdStill(true);
          buzz(true);
          lift(index, pageY);
          setOpen(true);
          measure(index, pageY);
        },
        follow,
        // Dragged: it goes where it was let go, and the sets come back. Let go
        // of without being dragged: the list stays up, to drag any of them.
        letGo: (moved: boolean) => {
          if (moved) {
            drop(true);
            close();
          } else setDrag(null);
        },
        cancel: () => {
          drop(false);
          close();
        },
      } satisfies Hold,
      openList: () => {
        holdStill(true);
        setOpen(true);
        measure(0, null);
      },
      close,
      follow,
      drop,
      move: (from: number, to: number) => live.current.onMove(from, to),
      // A row dragged with the list up.
      grab: (index: number, e: GestureResponderEvent) => {
        buzz(true);
        lift(index, e.nativeEvent.pageY);
        return true; // on a phone, the scrolling underneath stays put
      },
    };
  }, [liftY]);

  useImperativeHandle(ref, () => ({ openList: act.openList }), [act]);

  // Where each row goes: the lifted one follows the finger, and the others
  // close up around the place it would drop into.
  const slotOf = (i: number) => {
    if (!drag || i === drag.from) return i;
    const without = i < drag.from ? i : i - 1;
    return without < drag.to ? without : without + 1;
  };

  return (
    <HoldContext.Provider value={act.hold}>
      <View ref={box} style={style}>
        {children}
        {open && (
          <View style={styles.cover}>
            <Pressable style={StyleSheet.absoluteFill} onPress={act.close} accessible={false} />
            <View style={styles.head}>
              <Text style={styles.hint} selectable={false}>
                {drag ? "Let go where it should go" : "Drag an exercise to move it"}
              </Text>
              <Pressable onPress={act.close} hitSlop={HIT} accessibilityRole="button">
                <Text style={styles.done}>Done</Text>
              </Pressable>
            </View>
            {place &&
              rows.map((row, i) => (
                <SortRow
                  key={row.key}
                  row={row}
                  index={i}
                  count={rows.length}
                  slot={slotOf(i)}
                  place={place}
                  lifted={drag?.from === i}
                  liftY={liftY}
                  onGrab={act.grab}
                  onFollow={act.follow}
                  onDrop={act.drop}
                  onMove={act.move}
                />
              ))}
          </View>
        )}
      </View>
    </HoldContext.Provider>
  );
}

function SortRow({
  row,
  index,
  count,
  slot,
  place,
  lifted,
  liftY,
  onGrab,
  onFollow,
  onDrop,
  onMove,
}: {
  row: ReorderRow;
  index: number;
  count: number;
  slot: number;
  place: Place;
  lifted: boolean;
  liftY: SharedValue<number>;
  onGrab: (index: number, e: GestureResponderEvent) => boolean;
  onFollow: (e: GestureResponderEvent) => void;
  onDrop: (commit: boolean) => void;
  onMove: (from: number, to: number) => void;
}) {
  const { pitch } = place;
  const pos = useSharedValue(slot * pitch);
  const wasLifted = useRef(lifted);
  useEffect(() => {
    // Just dropped: carry on from where the finger left it.
    if (wasLifted.current && !lifted) pos.set(liftY.get());
    wasLifted.current = lifted;
    pos.set(withTiming(slot * pitch, { duration: 150 }));
  }, [slot, pitch, lifted, pos, liftY]);
  const move = useAnimatedStyle(() => ({ transform: [{ translateY: lifted ? liftY.get() : pos.get() }] }), [lifted]);

  return (
    <Animated.View
      style={[styles.row, draggable, { top: place.top, height: pitch - GAP }, lifted && styles.lifted, move]}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => onGrab(index, e)}
      onResponderMove={onFollow}
      onResponderTerminationRequest={() => false}
      onResponderRelease={() => onDrop(true)}
      onResponderTerminate={() => onDrop(false)}
      accessible
      accessibilityLabel={`${row.name}, ${index + 1} of ${count}`}
      accessibilityActions={[
        { name: "moveUp", label: "Move up" },
        { name: "moveDown", label: "Move down" },
      ]}
      onAccessibilityAction={(e) => {
        const to = index + (e.nativeEvent.actionName === "moveUp" ? -1 : 1);
        if (to >= 0 && to < count) onMove(index, to);
      }}
    >
      <GripVertical size={18} color={C.textFaint} />
      <Text style={styles.name} numberOfLines={1} selectable={false}>
        {row.name}
      </Text>
      <Text style={styles.detail} selectable={false}>
        {row.detail}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, backgroundColor: C.bg },
  head: {
    height: HEAD - 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  hint: { color: C.textMuted, fontSize: 14 },
  done: { color: C.accent, fontSize: 16, fontWeight: "600" },
  row: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: R.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.raised,
    zIndex: 1,
  },
  lifted: {
    zIndex: 2,
    backgroundColor: C.raised,
    borderColor: C.accentDim,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  name: { flex: 1, color: C.text, fontSize: 16, fontWeight: "600" },
  detail: { color: C.textMuted, fontSize: 13 },
});
