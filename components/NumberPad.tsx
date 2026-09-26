import * as Haptics from "expo-haptics";
import { ArrowRight, ChevronDown, Delete } from "lucide-react-native";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, FONT, R } from "../constants/theme";
import { formatStep, PadKey } from "../lib/numberPad";

// The app's own number pad, used for every number instead of the phone's
// keyboard (which, in the home-screen app, shoves the page about and jumps the
// tab bar). A screen, sheet or dialog wraps its content in <NumberPadArea>;
// every <NumberInput> inside it opens the pad at the bottom of that area when
// tapped. The pad edits whichever field is picked, steps it with minus and
// plus, and Next moves on to the next field (kg, then reps, then the next set).
// A scroll view in the area takes useNumberPadScroll(), so the field being
// typed into can be scrolled up out from under the pad, and ends with a
// <NumberPadSpacer /> so the last fields can scroll that far. On a computer,
// the keyboard types into it too.

// What a field tells the pad about itself.
export type PadField = {
  order: number; // Next goes to the next field up in order
  label?: string; // what's being typed, e.g. "Set 2 · weight"
  hint?: string; // beside it, e.g. "Last time 60 × 8"
  decimals: boolean;
  step: number;
  start: () => void; // becomes the field being typed into
  press: (key: PadKey) => void;
  reveal: () => void; // asks to be scrolled into view
};

type Scroller = {
  scrollTo?: (options: { y: number; animated?: boolean }) => void;
  scrollToOffset?: (options: { offset: number; animated?: boolean }) => void;
};

type Pad = {
  active: string | null;
  padHeight: number;
  open: (id: string) => void;
  close: () => void;
  register: (id: string, field: PadField) => void;
  unregister: (id: string) => void;
  reveal: (top: number, bottom: number) => void;
  scrollProps: {
    ref: (scroller: Scroller | null) => void;
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
    scrollEventThrottle: number;
  };
};

const PadContext = createContext<Pad | null>(null);

export const usePad = () => useContext(PadContext);

// For the scroll view holding the area's fields.
export function useNumberPadScroll() {
  return useContext(PadContext)?.scrollProps ?? {};
}

// Room at the end of a scroll view, while the pad's up, for its last fields.
export function NumberPadSpacer() {
  const pad = useContext(PadContext);
  return <View style={{ height: pad?.active ? pad.padHeight : 0 }} />;
}

// A scroll view that does both of the above for itself.
export function NumberPadScrollView({ children, ...props }: ScrollViewProps) {
  const scroll = useNumberPadScroll();
  return (
    <ScrollView {...props} {...scroll}>
      {children}
      <NumberPadSpacer />
    </ScrollView>
  );
}

type Press = PadKey | "next" | "hide";

// Keys from a computer's keyboard. Not while it's typing into a real text box.
function keyFor(e: KeyboardEvent): Press | null {
  const target = e.target as HTMLElement | null;
  if (e.metaKey || e.ctrlKey || e.altKey || target?.closest?.("input, textarea, [contenteditable]")) return null;
  if (/^[0-9]$/.test(e.key)) return e.key as PadKey;
  const keys: Record<string, Press> = {
    ".": ".",
    ",": ".",
    Backspace: "back",
    Enter: "next",
    Tab: "next",
    Escape: "hide",
    ArrowUp: "plus",
    ArrowDown: "minus",
  };
  return keys[e.key] ?? null;
}

export function NumberPadArea({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [fields, setFields] = useState<ReadonlyMap<string, PadField>>(() => new Map());
  const [active, setActive] = useState<string | null>(null);
  const [padHeight, setPadHeight] = useState(0);
  const area = useRef<View>(null);
  const scroller = useRef<Scroller | null>(null);
  const measured = useRef({ padHeight: 0, offset: 0 });

  const register = useCallback((id: string, field: PadField) => setFields((m) => new Map(m).set(id, field)), []);
  const unregister = useCallback((id: string) => {
    setFields((m) => {
      const next = new Map(m);
      next.delete(id);
      return next;
    });
    setActive((a) => (a === id ? null : a));
  }, []);
  const open = useCallback((id: string) => setActive(id), []);
  const close = useCallback(() => setActive(null), []);

  // A field's top and bottom, on screen: scroll it up clear of the pad.
  const reveal = useCallback((_top: number, bottom: number) => {
    area.current?.measureInWindow((_x, y, _w, height) => {
      const { padHeight, offset } = measured.current;
      const overlap = bottom + 12 - (y + height - padHeight);
      if (!padHeight || overlap <= 0 || !scroller.current) return;
      if (scroller.current.scrollToOffset) scroller.current.scrollToOffset({ offset: offset + overlap, animated: true });
      else scroller.current.scrollTo?.({ y: offset + overlap, animated: true });
    });
  }, []);

  const scrollProps = useMemo(
    () => ({
      ref: (s: Scroller | null) => {
        scroller.current = s;
      },
      onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        measured.current.offset = e.nativeEvent.contentOffset.y;
      },
      scrollEventThrottle: 16,
    }),
    []
  );

  const field = active ? fields.get(active) : undefined;
  let after: [string, PadField] | undefined;
  for (const entry of fields) {
    if (field && entry[1].order > field.order && (!after || entry[1].order < after[1].order)) after = entry;
  }

  const press = useCallback(
    (key: Press) => {
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => undefined);
      if (key === "hide" || (key === "next" && !after)) return setActive(null);
      if (key === "next" && after) {
        const [id, next] = after;
        next.start();
        setActive(id);
        requestAnimationFrame(next.reveal);
        return;
      }
      if (key !== "next") field?.press(key);
    },
    [field, after]
  );

  useEffect(() => {
    if (Platform.OS !== "web" || !active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const key = keyFor(e);
      if (!key) return;
      e.preventDefault();
      press(key);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, press]);

  const value = useMemo(
    () => ({ active, padHeight, open, close, register, unregister, reveal, scrollProps }),
    [active, padHeight, open, close, register, unregister, reveal, scrollProps]
  );

  return (
    <PadContext.Provider value={value}>
      <View ref={area} style={styles.area}>
        {children}
        {field && (
          <Keys
            field={field}
            hasNext={Boolean(after)}
            bottomInset={insets.bottom}
            onPress={press}
            onLayout={(e) => {
              const height = e.nativeEvent.layout.height;
              measured.current.padHeight = height;
              setPadHeight(height);
              field.reveal(); // now that it's known what the pad covers
            }}
          />
        )}
      </View>
    </PadContext.Provider>
  );
}

// The pad itself: digits, minus and plus the field's step, delete, hide, Next.
function Keys({
  field,
  hasNext,
  bottomInset,
  onPress,
  onLayout,
}: {
  field: PadField;
  hasNext: boolean;
  bottomInset: number;
  onPress: (key: Press) => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const step = formatStep(field.step);
  // look: "fn" for the quieter keys, "go" for Next; side: the wider fourth column.
  const key = (press: Press, label: string, content: ReactNode, look?: "fn" | "go", disabled = false) => (
    <Pressable
      key={press}
      style={({ pressed }) => [
        styles.key,
        look === "fn" && styles.fn,
        look === "go" && styles.go,
        ["minus", "plus", "back", "next"].includes(press) && styles.side,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={() => onPress(press)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {content}
    </Pressable>
  );
  const digit = (d: PadKey) => key(d, d, <Text style={styles.digit}>{d}</Text>);

  return (
    <View style={[styles.pad, { paddingBottom: 10 + bottomInset }]} onLayout={onLayout} testID="number-pad">
      <View style={styles.context}>
        <Text style={styles.what} numberOfLines={1}>
          {field.label ?? ""}
        </Text>
        {field.hint ? (
          <Text style={styles.hint} numberOfLines={1}>
            {field.hint}
          </Text>
        ) : null}
      </View>
      <View style={styles.rows}>
        <View style={styles.row}>
          {digit("1")}
          {digit("2")}
          {digit("3")}
          {key("minus", `Minus ${step}`, <Text style={styles.fnText}>−{step}</Text>, "fn")}
        </View>
        <View style={styles.row}>
          {digit("4")}
          {digit("5")}
          {digit("6")}
          {key("plus", `Plus ${step}`, <Text style={styles.fnText}>+{step}</Text>, "fn")}
        </View>
        <View style={styles.row}>
          {digit("7")}
          {digit("8")}
          {digit("9")}
          {key("back", "Delete", <Delete size={26} color={C.textSoft} />, "fn")}
        </View>
        <View style={styles.row}>
          {key(".", "Decimal point", <Text style={styles.digit}>.</Text>, undefined, !field.decimals)}
          {digit("0")}
          {key("hide", "Hide keypad", <ChevronDown size={24} color={C.textSoft} />, "fn")}
          {key(
            "next",
            hasNext ? "Next" : "Done",
            <>
              <Text style={styles.goText}>{hasNext ? "Next" : "Done"}</Text>
              {hasNext && <ArrowRight size={18} color={C.onAccent} />}
            </>,
            "go"
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1 },
  pad: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.raised,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 10,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  context: { flexDirection: "row", alignItems: "baseline", gap: 12, paddingHorizontal: 6, paddingBottom: 10 },
  what: {
    flex: 1,
    color: C.textFaint,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  hint: { color: C.textMuted, fontSize: 13 },
  rows: { gap: 7 },
  row: { flexDirection: "row", gap: 7 },
  key: {
    flex: 1,
    height: 52,
    borderRadius: R.md + 1,
    backgroundColor: C.raised,
    alignItems: "center",
    justifyContent: "center",
  },
  fn: { backgroundColor: C.raisedSoft },
  go: { flexDirection: "row", gap: 6, backgroundColor: C.accent },
  side: { flex: 1.15 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.3 },
  digit: { fontFamily: FONT.num, fontSize: 28, color: C.text },
  fnText: { fontFamily: FONT.num, fontSize: 21, color: C.textSoft },
  goText: { color: C.onAccent, fontSize: 17, fontWeight: "600" },
});
