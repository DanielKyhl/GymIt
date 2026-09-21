import { useEffect, useState } from "react";
import { TextInput, TextInputProps } from "react-native";
import { parseNumber } from "../lib/units";

type Props = Omit<TextInputProps, "value" | "onChangeText" | "keyboardType"> & {
  value: number; // 0 shows as empty
  onChangeValue: (value: number) => void;
  decimals?: boolean; // weights: yes; reps and seconds: whole numbers
};

// A number field you can actually type decimals into. A plain controlled input
// re-renders from the stored number, so typing "32." or "32," immediately
// snaps back to "32" and the separator is lost. This keeps the text you typed
// while you're editing and only reports the parsed number. Comma or dot both
// work, since a Danish keypad types a comma.
export function NumberInput({ value, onChangeValue, decimals = true, ...rest }: Props) {
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
      {...rest}
      keyboardType={decimals ? "decimal-pad" : "number-pad"}
      value={text}
      onChangeText={(t) => {
        setText(t);
        onChangeValue(parseNumber(t) ?? 0);
      }}
    />
  );
}
