import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { C, T } from "../constants/theme";

export function readinessColor(score: number): string {
  if (score >= 80) return C.success;
  return score >= 50 ? C.warning : C.danger;
}

// A ring that fills with how recovered you are, the score in the middle.
export function ReadinessRing({ score, size = 88 }: { score: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.raised} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={readinessColor(score)}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - score / 100)}
          // Start at 12 o'clock instead of 3.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.score}>{score}</Text>
        <Text style={styles.pct}>%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  score: { ...T.num, fontSize: 30 },
  pct: { ...T.num, color: C.textMuted, fontSize: 16, marginTop: 6 },
});
