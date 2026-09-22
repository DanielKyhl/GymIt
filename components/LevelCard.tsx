import { Flame, Pencil, Shield } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { C, HIT, T } from "../constants/theme";
import { formatNumber } from "../lib/format";
import { rankFor } from "../lib/ranks";
import { HeatCell } from "../lib/stats";
import { MAX_SHIELDS, StreakState } from "../lib/streak";
import { RankBadge, rankColor } from "./RankBadge";
import { WeekStrip } from "./WeekStrip";

const SHIELD_BLUE = "#60a5fa";

type Props = {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  isMax: boolean;
  week: HeatCell[];
  weekCount: number;
  weeklyGoal: number;
  streak: StreakState;
  onEditGoal?: () => void;
};

// Home's level card: the rank-framed level badge, the rank, XP to the
// next level, this week, and the weekly-goal streak with its shields.
export function LevelCard({ level, xpIntoLevel, xpForNext, isMax, week, weekCount, weeklyGoal, streak, onEditGoal }: Props) {
  const color = rankColor(level);
  const progress = isMax ? 1 : Math.min(1, xpIntoLevel / Math.max(1, xpForNext));

  // The XP bar fills up to its value instead of appearing full.
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(withTiming(progress, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [fill, progress]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <RankBadge level={level} size={72} />
        <View style={styles.who}>
          <Text style={styles.level}>Level {level}</Text>
          <Text style={[styles.rank, { color }]} numberOfLines={1}>
            {rankFor(level).name.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.xp}>{isMax ? "MAX" : `${formatNumber(xpIntoLevel)} / ${formatNumber(xpForNext)} XP`}</Text>
      </View>

      <View style={styles.bar}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
      </View>

      <View style={styles.week}>
        <WeekStrip days={week} />
      </View>

      <View style={styles.meta}>
        <Pressable style={styles.goal} onPress={onEditGoal} hitSlop={HIT} accessibilityRole="button">
          <Text style={styles.metaText}>
            This week {weekCount}/{weeklyGoal}
          </Text>
          <Pencil size={12} color={C.textSoft} />
        </Pressable>
        <View style={styles.streak} accessibilityLabel={`${streak.weeks}-week streak, ${streak.shields} shields`}>
          <Flame size={14} color={streak.weeks > 0 ? C.signal : C.textFaint} />
          <Text style={[styles.metaText, streak.weeks === 0 && styles.faint]}>
            {streak.weeks > 0 ? `${streak.weeks} wk streak` : "No streak"}
          </Text>
          <View style={styles.shields}>
            {Array.from({ length: MAX_SHIELDS }, (_, i) => (
              <Shield
                key={i}
                size={15}
                color={i < streak.shields ? SHIELD_BLUE : C.textFaint}
                fill={i < streak.shields ? SHIELD_BLUE : "transparent"}
                strokeWidth={i < streak.shields ? 1.5 : 1.8}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 12 },
  top: { flexDirection: "row", alignItems: "center", gap: 14 },
  who: { flex: 1 },
  level: { ...T.num, fontSize: 26, lineHeight: 30 },
  rank: { fontSize: 13, fontWeight: "700", letterSpacing: 0.8, marginTop: 2 },
  xp: { ...T.num, color: C.textMuted, fontSize: 15, alignSelf: "flex-start", marginTop: 8 },
  bar: { height: 10, backgroundColor: C.raised, borderRadius: 5, overflow: "hidden", marginTop: 16 },
  fill: { height: 10, borderRadius: 5 },
  week: { marginTop: 16 },
  meta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  goal: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: C.textSoft, fontSize: 13 },
  faint: { color: C.textFaint },
  streak: { flexDirection: "row", alignItems: "center", gap: 6 },
  shields: { flexDirection: "row", gap: 3, marginLeft: 4 },
});
