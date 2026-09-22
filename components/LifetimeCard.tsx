import { StyleSheet, Text, View } from "react-native";
import { C, R, T } from "../constants/theme";
import { lifetimeMilestone } from "../lib/milestones";
import { convertWeight, Unit } from "../lib/units";

// Everything you've ever lifted, next to the heaviest famous thing it beats
// and how far along you are to the next one.
export function LifetimeCard({ totalKg, unit, newMilestone }: { totalKg: number; unit: Unit; newMilestone?: boolean }) {
  const m = lifetimeMilestone(totalKg);
  const shown = Math.round(convertWeight(totalKg, "kg", unit));
  return (
    <View style={[styles.card, newMilestone && styles.cardNew]}>
      <Text style={[styles.caption, newMilestone && styles.captionNew]}>
        {newMilestone ? "New milestone!" : "Lifetime total"}
      </Text>
      <Text style={styles.total}>
        {shown.toLocaleString()}
        <Text style={styles.unit}> {unit}</Text>
      </Text>
      {m.passed && <Text style={styles.passed}>More than {m.passed.name}</Text>}
      {m.next && (
        <>
          <View style={styles.bar}>
            <View style={[styles.fill, { width: `${m.progress * 100}%` }]} />
          </View>
          <View style={styles.nextRow}>
            <Text style={styles.next} numberOfLines={1}>
              Next: {m.next.name}
            </Text>
            <Text style={styles.pct}>{Math.floor(m.progress * 100)}%</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", backgroundColor: C.card, borderRadius: R.lg, padding: 16 },
  cardNew: { borderWidth: 1, borderColor: C.signal },
  caption: { color: C.textFaint, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  captionNew: { color: C.signal },
  total: { ...T.num, fontSize: 36, marginTop: 2 },
  unit: { ...T.num, fontSize: 18, color: C.textMuted },
  passed: { color: C.text, fontSize: 15, fontWeight: "600", marginTop: 2 },
  bar: { height: 8, borderRadius: 4, backgroundColor: C.raised, overflow: "hidden", marginTop: 14 },
  fill: { height: "100%", backgroundColor: C.signal, borderRadius: 4 },
  nextRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 6 },
  next: { flex: 1, color: C.textMuted, fontSize: 13 },
  pct: { ...T.num, color: C.textSoft, fontSize: 15 },
});
