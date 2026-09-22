import { CircleQuestionMark } from "lucide-react-native";
import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { C, HIT, R, T } from "../constants/theme";
import { formatRPE, RPE_OPTIONS } from "../lib/rpe";
import { Anchor, measureAnchor, MenuItem } from "./DropdownMenu";

const SCALE: [string, string][] = [
  ["10", "Max effort. You couldn't do another rep."],
  ["9", "Hard. One more rep was possible."],
  ["8", "Two reps left in the tank."],
  ["7", "Three reps left. Challenging but smooth."],
  ["5–6", "Moderate to easy, like a warm-up."],
];

// A small "?" that explains RPE. Put it next to anything showing RPE.
export function RpeHelpButton({ size = 14 }: { size?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={HIT} accessibilityRole="button" accessibilityLabel="What is RPE?">
        <CircleQuestionMark size={size} color={C.textMuted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Taps on the card itself don't close it. */}
          <Pressable style={styles.card} onPress={() => undefined}>
            <Text style={styles.title}>What's RPE?</Text>
            <Text style={styles.body}>
              RPE means Rate of Perceived Exertion: how hard a set felt, from 1 to 10. It's optional. Logging it
              shows whether you're pushing hard enough, or too hard, as the weeks go by.
            </Text>
            <View style={styles.scale}>
              {SCALE.map(([value, meaning]) => (
                <View key={value} style={styles.row}>
                  <Text style={styles.value}>{value}</Text>
                  <Text style={styles.meaning}>{meaning}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.tip}>Most working sets land around 7–9.</Text>
            <Pressable style={styles.button} onPress={() => setOpen(false)} accessibilityRole="button">
              <Text style={styles.buttonText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// A set's RPE in the set row: the value, or a faint dash when not rated.
// Tapping it opens the RPE menu (see rpeItems) next to it.
export function RpeCell({ value, onOpen }: { value?: number; onOpen: (anchor: Anchor) => void }) {
  const ref = useRef<View>(null);
  return (
    <Pressable
      ref={ref}
      style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
      onPress={() => measureAnchor(ref.current, onOpen)}
      hitSlop={{ top: 8, bottom: 8 }}
      accessibilityRole="button"
      accessibilityLabel={value ? `RPE ${formatRPE(value)}. Change` : "Add RPE"}
    >
      <Text style={[styles.cellText, !value && styles.cellEmpty]}>{value ? formatRPE(value) : "–"}</Text>
    </Pressable>
  );
}

// The RPE menu for a set: each value with what it means, plus clearing it.
export function rpeItems(current: number | undefined, onPick: (value: number | undefined) => void): MenuItem[] {
  return [
    ...RPE_OPTIONS.map((o) => ({
      key: String(o.value),
      badge: formatRPE(o.value),
      label: `RPE ${formatRPE(o.value)}`,
      detail: o.detail,
      selected: current === o.value,
      onPress: () => onPick(o.value),
    })),
    { key: "none", label: "No RPE", selected: !current, onPress: () => onPick(undefined) },
  ];
}

const styles = StyleSheet.create({
  cell: { width: 40, height: 38, borderRadius: R.sm, backgroundColor: C.raised, alignItems: "center", justifyContent: "center" },
  cellPressed: { backgroundColor: C.selected },
  cellText: { ...T.num, fontSize: 16, color: C.text },
  cellEmpty: { color: C.textFaint },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 },
  card: { backgroundColor: C.card, borderRadius: R.xl, borderWidth: 1, borderColor: C.raised, padding: 20 },
  title: { ...T.heading, marginBottom: 8 },
  body: { color: C.textSoft, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  scale: { backgroundColor: C.raised, borderRadius: R.md, paddingVertical: 4, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 7 },
  value: { ...T.num, width: 34, fontSize: 18, color: C.accent },
  meaning: { flex: 1, color: C.text, fontSize: 13 },
  tip: { color: C.textMuted, fontSize: 13, marginBottom: 16 },
  button: { backgroundColor: C.accent, borderRadius: R.md, paddingVertical: 13, alignItems: "center" },
  buttonText: { color: C.onAccent, fontSize: 15, fontWeight: "600" },
});
