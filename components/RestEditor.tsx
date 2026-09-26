import { X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { C, HIT, R, T } from "../constants/theme";
import { formatRest, restFromParts } from "../lib/activeWorkout";

type Props = {
  exercise: string | null; // null = closed
  seconds: number; // the rest as it is now; 0 = no rest timer
  fallback: number; // where to start when there's no rest timer yet
  onSave: (seconds: number) => void; // 0 turns the rest timer off
  onClose: () => void;
};

// Type in any rest length, in minutes and seconds. It sits near the top of the
// screen, so the keyboard doesn't cover it.
export function RestEditor(props: Props) {
  // Mounted afresh each time it opens, so the boxes start from the rest as it
  // is then.
  return props.exercise ? <Editor {...props} exercise={props.exercise} /> : null;
}

function Editor({ exercise, seconds, fallback, onSave, onClose }: Props & { exercise: string }) {
  const start = seconds > 0 ? seconds : fallback;
  const [minutes, setMinutes] = useState(String(Math.floor(start / 60)));
  const [secs, setSecs] = useState(String(start % 60).padStart(2, "0"));
  const total = restFromParts(minutes, secs);
  const save = (value: number) => {
    onClose();
    onSave(value);
  };
  const digits = (text: string) => text.replace(/\D/g, "").slice(0, 2);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>Rest timer</Text>
          <Pressable onPress={onClose} hitSlop={HIT} accessibilityLabel="Close">
            <X size={22} color={C.textMuted} />
          </Pressable>
        </View>
        <Text style={styles.exercise} numberOfLines={1}>
          {exercise}
        </Text>

        <View style={styles.time}>
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              value={minutes}
              onChangeText={(t) => setMinutes(digits(t))}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              autoFocus
              placeholder="0"
              placeholderTextColor={C.textFaint}
              accessibilityLabel="Minutes"
            />
            <Text style={styles.unit}>min</Text>
          </View>
          <Text style={styles.colon}>:</Text>
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              value={secs}
              onChangeText={(t) => setSecs(digits(t))}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              placeholder="00"
              placeholderTextColor={C.textFaint}
              returnKeyType="done"
              onSubmitEditing={() => save(total)}
              accessibilityLabel="Seconds"
            />
            <Text style={styles.unit}>sec</Text>
          </View>
        </View>

        <Pressable style={({ pressed }) => [styles.save, pressed && styles.savePressed]} onPress={() => save(total)} accessibilityRole="button">
          <Text style={styles.saveText}>{total > 0 ? `Set ${formatRest(total)} rest` : "Turn off rest timer"}</Text>
        </Pressable>
        {seconds > 0 && total > 0 && (
          <Pressable style={styles.off} onPress={() => save(0)} hitSlop={HIT} accessibilityRole="button">
            <Text style={styles.offText}>No rest timer</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.7)" },
  panel: {
    marginTop: 96,
    marginHorizontal: 20,
    backgroundColor: C.card,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.raised,
    padding: 18,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: C.text, fontSize: 18, fontWeight: "600" },
  exercise: { color: C.textMuted, fontSize: 13, marginTop: 2, marginBottom: 16 },
  time: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center", gap: 10, marginBottom: 18 },
  field: { alignItems: "center", gap: 4 },
  input: {
    ...T.num,
    fontSize: 34,
    width: 84,
    backgroundColor: C.raised,
    textAlign: "center",
    paddingVertical: 8,
    borderRadius: R.md,
  },
  unit: { color: C.textFaint, fontSize: 12 },
  colon: { ...T.num, fontSize: 34, color: C.textMuted, paddingTop: 8 },
  save: { backgroundColor: C.accent, borderRadius: R.md, paddingVertical: 14, alignItems: "center" },
  savePressed: { opacity: 0.85 },
  saveText: { color: C.onAccent, fontSize: 16, fontWeight: "600" },
  off: { alignItems: "center", paddingTop: 14, paddingBottom: 2 },
  offText: { color: C.textMuted, fontSize: 14 },
});
