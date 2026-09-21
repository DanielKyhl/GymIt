import { Check } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { C } from "../constants/theme";
import { HeatCell } from "../lib/stats";

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

// This week, Monday to Sunday: a filled circle for each day you trained.
export function WeekStrip({ days }: { days: HeatCell[] }) {
  return (
    <View style={styles.row}>
      {days.map((d, i) => (
        <View key={d.date} style={styles.day}>
          <Text style={[styles.letter, d.today && styles.letterToday]}>{LETTERS[i]}</Text>
          <View
            style={[
              styles.dot,
              d.count > 0 ? styles.trained : d.future ? styles.future : styles.missed,
              d.today && d.count === 0 && styles.today,
            ]}
          >
            {d.count > 0 && <Check size={14} color={C.onAccent} strokeWidth={3} />}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between" },
  day: { alignItems: "center", gap: 6 },
  letter: { color: C.textFaint, fontSize: 11, fontWeight: "500" },
  letterToday: { color: C.signal },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  trained: { backgroundColor: C.accent },
  missed: { backgroundColor: C.raised },
  future: { borderWidth: 1, borderColor: C.raised },
  today: { borderWidth: 1.5, borderColor: C.signal },
});
