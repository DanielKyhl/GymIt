import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { C, HIT, R, T } from "../constants/theme";
import { platesPerSide } from "../lib/activeWorkout";
import { barWeight } from "../lib/exercises";
import { Unit } from "../lib/units";
import { NumberInput } from "./NumberInput";

type Props = {
  exercise: string | null; // null = closed
  unit: Unit;
  initialWeight: number;
  onClose: () => void;
};

// Plate height relative to the heaviest plate, so the drawing reads at a glance.
const plateHeight = (plate: number, unit: Unit) => 30 + (plate / (unit === "kg" ? 25 : 45)) * 60;

export function PlateCalculator({ exercise, unit, initialWeight, onClose }: Props) {
  const [weight, setWeight] = useState(initialWeight);

  useEffect(() => {
    if (exercise) setWeight(initialWeight);
  }, [exercise, initialWeight]);

  if (!exercise) return null;
  const bar = barWeight(exercise, unit);
  const load = platesPerSide(weight, unit, bar);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Plates per side</Text>
            <Pressable onPress={onClose} hitSlop={HIT} accessibilityLabel="Close">
              <X size={22} color={C.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.exercise} numberOfLines={1}>
            {exercise}
          </Text>

          <View style={styles.inputRow}>
            <NumberInput
              style={styles.input}
              value={weight}
              onChangeValue={setWeight}
              placeholder="0"
              placeholderTextColor={C.textFaint}
            />
            <Text style={styles.unit}>{unit} total</Text>
          </View>

          <View style={styles.bar}>
            <View style={styles.sleeve} />
            {load.perSide.map((plate, i) => (
              <View key={i} style={[styles.plate, { height: plateHeight(plate, unit) }]}>
                <Text style={styles.plateText}>{plate}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.summary}>
            {load.belowBar
              ? `Less than the empty bar (${bar} ${unit}).`
              : load.perSide.length === 0
                ? `Just the bar (${bar} ${unit}).`
                : `${bar} ${unit} bar + ${load.perSide.join(" + ")} each side`}
          </Text>
          {load.leftover > 0 && (
            <Text style={styles.warning}>
              {load.leftover} {unit} can't be made with standard plates.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  panel: {
    width: "100%",
    backgroundColor: C.card,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.raised,
    padding: 18,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: C.text, fontSize: 18, fontWeight: "600" },
  exercise: { color: C.textMuted, fontSize: 13, marginTop: 2, marginBottom: 14 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  input: {
    ...T.num,
    fontSize: 26,
    width: 110,
    backgroundColor: C.raised,
    textAlign: "center",
    paddingVertical: 8,
    borderRadius: R.md,
  },
  unit: { color: C.textMuted, fontSize: 15 },
  bar: { flexDirection: "row", alignItems: "center", minHeight: 96, gap: 3, marginBottom: 14 },
  sleeve: { width: 40, height: 10, backgroundColor: C.textFaint, borderRadius: 3, marginRight: 2 },
  plate: {
    width: 26,
    backgroundColor: C.accent,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  plateText: { ...T.num, color: C.onAccent, fontSize: 12 },
  summary: { color: C.textSoft, fontSize: 14 },
  warning: { color: C.signal, fontSize: 13, marginTop: 6 },
});
