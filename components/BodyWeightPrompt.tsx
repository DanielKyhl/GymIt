import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { parseWeight } from "../lib/units";
import { C } from "../constants/theme";

type Props = {
  visible: boolean;
  unit: "kg" | "lb";
  onSave: (value: number) => void;
  onLater: () => void;
};

export function BodyWeightPrompt({ visible, unit, onSave, onLater }: Props) {
  const [text, setText] = useState("");
  const value = parseWeight(text);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <Text style={styles.title}>What do you weigh?</Text>
          <Text style={styles.body}>
            Bodyweight exercises like pull-ups and push-ups use it as their weight, so
            they count toward your progress and PRs. You can change it any time in
            Settings.
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={C.textFaint}
              value={text}
              onChangeText={setText}
              autoFocus
            />
            <Text style={styles.unit}>{unit}</Text>
          </View>

          <Pressable
            style={[styles.save, !value && styles.saveDisabled]}
            disabled={!value}
            onPress={() => value && onSave(value)}
          >
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
          <Pressable style={styles.later} onPress={onLater} hitSlop={8}>
            <Text style={styles.laterText}>Later</Text>
          </Pressable>
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.raised,
    padding: 20,
  },
  title: { color: C.text, fontSize: 20, fontWeight: "600", marginBottom: 8 },
  body: { color: C.textSoft, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  input: {
    flex: 1,
    backgroundColor: C.raised,
    color: C.text,
    fontSize: 22,
    textAlign: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  unit: { color: C.textMuted, fontSize: 18, width: 30 },
  save: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: C.onAccent, fontSize: 16, fontWeight: "600" },
  later: { alignItems: "center", paddingTop: 14 },
  laterText: { color: C.textMuted, fontSize: 15 },
});
