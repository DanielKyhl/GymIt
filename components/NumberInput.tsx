import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { C } from "../constants/theme";
import { applyKey, draftFor, draftValue, PadDraft, PadKey } from "../lib/numberPad";
import { parseNumber } from "../lib/units";
import { usePad } from "./NumberPad";

type Props = {
  value: number; // 0 shows as empty
  onChangeValue: (value: number) => void;
  decimals?: boolean; // weights: yes; reps and seconds: whole numbers
  // For the number pad (components/NumberPad.tsx):
  step?: number; // what its minus and plus keys take off or add
  label?: string; // what's being typed, shown on the pad
  hint?: string; // shown beside it, e.g. last time's numbers
  order?: number; // Next goes to the next field up in order
  autoOpen?: boolean; // open the pad on this field as soon as it shows
  style?: StyleProp<TextStyle>;
  placeholder?: string;
  placeholderTextColor?: string;
  accessibilityLabel?: string;
};

// A number field. Inside a <NumberPadArea> it's typed into with the app's own
// number pad, never the phone's keyboard. Anywhere else it's a plain text box.
export function NumberInput(props: Props) {
  return usePad() ? <PadInput {...props} /> : <KeyboardInput {...props} />;
}

// Typed into with the number pad: a tap picks it, and it shows what's being
// typed, with the whole value highlighted until the first key replaces it.
function PadInput({
  value,
  onChangeValue,
  decimals = true,
  step = 1,
  label,
  hint,
  order = 0,
  autoOpen = false,
  style,
  placeholder,
  placeholderTextColor,
  accessibilityLabel,
}: Props) {
  const pad = usePad()!;
  const id = useId();
  const active = pad.active === id;
  const box = useRef<View>(null);
  const [draft, setDraft] = useState<PadDraft>(() => draftFor(value));
  // The draft again, for keys pressed before the next render.
  const typing = useRef(draft);
  const latest = useRef({ value, onChangeValue, decimals, step });
  useEffect(() => {
    latest.current = { value, onChangeValue, decimals, step };
  });

  const start = useCallback(() => {
    const d = draftFor(latest.current.value);
    typing.current = d;
    setDraft(d);
  }, []);
  const press = useCallback((key: PadKey) => {
    const { decimals, step, onChangeValue } = latest.current;
    const d = applyKey(typing.current, key, { decimals, step });
    typing.current = d;
    setDraft(d);
    onChangeValue(draftValue(d));
  }, []);
  const { register, unregister, reveal: revealIn, open } = pad;
  const reveal = useCallback(() => box.current?.measureInWindow((_x, y, _w, h) => revealIn(y, y + h)), [revealIn]);

  useEffect(() => {
    register(id, { order, label, hint, decimals, step, start, press, reveal });
  }, [register, id, order, label, hint, decimals, step, start, press, reveal]);
  useEffect(() => () => unregister(id), [unregister, id]);
  useEffect(() => {
    if (autoOpen) open(id); // its draft starts out as its value, all selected
  }, [autoOpen, open, id]);

  const text = active ? draft.text : value ? String(value) : "";
  const { boxStyle, textStyle, align } = split(style);
  return (
    <Pressable
      ref={box}
      style={[boxStyle, styles.box, { alignItems: align }, active && styles.active]}
      onPress={() => {
        start();
        open(id);
        requestAnimationFrame(reveal);
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text }}
    >
      <View style={styles.line}>
        {text === "" ? (
          <Text style={[textStyle, { color: placeholderTextColor ?? C.textFaint }]}>{placeholder ?? ""}</Text>
        ) : (
          <Text style={[textStyle, active && draft.fresh && styles.selected]}>{text}</Text>
        )}
        {active && (text === "" || !draft.fresh) && <Caret size={(textStyle.fontSize ?? 16) * 1.1} />}
      </View>
    </Pressable>
  );
}

// Where the field is being typed, blinking.
function Caret({ size }: { size: number }) {
  const on = useSharedValue(1);
  useEffect(() => {
    on.set(
      withRepeat(withSequence(withDelay(530, withTiming(0, { duration: 0 })), withDelay(530, withTiming(1, { duration: 0 }))), -1)
    );
  }, [on]);
  const blink = useAnimatedStyle(() => ({ opacity: on.get() }));
  return <Animated.View style={[styles.caret, { height: size }, blink]} />;
}

// The field's style is written for a text box; split it into the box and the
// number inside it.
const TEXT_KEYS = ["color", "fontFamily", "fontSize", "fontStyle", "fontVariant", "fontWeight", "letterSpacing", "lineHeight"];
function split(style: StyleProp<TextStyle>) {
  const flat = StyleSheet.flatten(style) ?? {};
  const boxStyle: Record<string, unknown> = {};
  const textStyle: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    if (TEXT_KEYS.includes(k)) textStyle[k] = v;
    else if (k !== "textAlign") boxStyle[k] = v;
  }
  const align: ViewStyle["alignItems"] =
    flat.textAlign === "center" ? "center" : flat.textAlign === "right" ? "flex-end" : "flex-start";
  return { boxStyle: boxStyle as ViewStyle, textStyle: textStyle as TextStyle, align };
}

// A text box with the phone's keyboard: for a field outside any number pad
// area. It keeps the text you typed while you're editing and only reports the
// parsed number: a plain controlled input would re-render "32." or "32," as
// "32" and lose the separator. Comma or dot both work, since a Danish keypad
// types a comma.
function KeyboardInput({ value, onChangeValue, decimals = true, style, placeholder, placeholderTextColor, accessibilityLabel }: Props) {
  const [text, setText] = useState(value ? String(value) : "");

  // Follow changes made from outside (a set pre-filled with your body weight,
  // a warm-up generated for you), but not our own edits: only resync when the
  // number actually differs from what's typed.
  useEffect(() => {
    if ((parseNumber(text) ?? 0) !== value) setText(value ? String(value) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextInput
      style={style}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      accessibilityLabel={accessibilityLabel}
      keyboardType={decimals ? "decimal-pad" : "number-pad"}
      value={text}
      onChangeText={(t) => {
        setText(t);
        onChangeValue(parseNumber(t) ?? 0);
      }}
    />
  );
}

const styles = StyleSheet.create({
  // Same size picked or not: the border is always there, just not always seen.
  box: { justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  active: { borderColor: C.accent },
  line: { flexDirection: "row", alignItems: "center" },
  selected: { backgroundColor: "rgba(217, 213, 206, 0.28)", borderRadius: 3 },
  caret: { width: 2, marginLeft: 1, borderRadius: 1, backgroundColor: C.accent },
});
