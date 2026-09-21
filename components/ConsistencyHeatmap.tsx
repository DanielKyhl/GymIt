import { StyleSheet, Text, View } from "react-native";
import { C } from "../constants/theme";
import { HeatCell } from "../lib/stats";

const LABEL_W = 18;
const GAP = 4;
const DAY_LABELS = ["M", "", "W", "", "F", "", ""];

function cellColor(cell: HeatCell): string {
  if (cell.future) return "transparent";
  if (cell.count === 0) return C.raised;
  return cell.count === 1 ? C.accentDim : C.accent;
}

// GitHub-style grid: one column per week, one row per weekday.
export function ConsistencyHeatmap({ grid, width }: { grid: HeatCell[][]; width: number }) {
  const cell = Math.floor((width - LABEL_W - GAP * grid.length) / grid.length);
  const total = grid.flat().reduce((sum, c) => sum + c.count, 0);

  return (
    <View>
      <View style={styles.grid}>
        <View style={{ width: LABEL_W, gap: GAP }}>
          {DAY_LABELS.map((d, i) => (
            <Text key={i} style={[styles.dayLabel, { height: cell, lineHeight: cell }]}>
              {d}
            </Text>
          ))}
        </View>
        {grid.map((week) => (
          <View key={week[0].date} style={{ gap: GAP, marginLeft: GAP }}>
            {week.map((c) => (
              <View
                key={c.date}
                style={[
                  { width: cell, height: cell, borderRadius: Math.max(2, cell / 5), backgroundColor: cellColor(c) },
                  c.today && styles.today,
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.caption}>
          {total} workout{total === 1 ? "" : "s"} in {grid.length} weeks
        </Text>
        <View style={styles.legend}>
          <Text style={styles.caption}>Less</Text>
          {[C.raised, C.accentDim, C.accent].map((color) => (
            <View key={color} style={[styles.legendCell, { backgroundColor: color }]} />
          ))}
          <Text style={styles.caption}>More</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row" },
  dayLabel: { color: C.textFaint, fontSize: 10, textAlign: "left" },
  today: { borderWidth: 1.5, borderColor: C.signal },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  caption: { color: C.textFaint, fontSize: 12 },
  legend: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
});
