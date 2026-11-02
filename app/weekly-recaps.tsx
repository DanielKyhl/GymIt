import { useFocusEffect } from "expo-router";
import { Check, ChevronRight, Sparkles, Trophy } from "lucide-react-native";
import { type ReactNode, useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { weekRange, WeeklyRecap } from "../components/WeeklyRecap";
import { C } from "../constants/theme";
import { formatNumber, plural } from "../lib/format";
import { pastWeeks, WeekRecap, weekRecap, WeekSummary } from "../lib/recap";
import { getDefaultUnit, getWeeklyGoal, getWorkoutsForStats } from "../lib/storage";
import { Unit } from "../lib/units";
import { Workout } from "../types/workout";

// Every finished week you trained, newest first, each opening its recap: the
// same card Home shows when a new week starts. Reached from the Progress tab.
// Nothing is stored for them: they're worked out from your workouts, so weeks
// from before the recap existed are here too, and an edited workout shows.
export default function WeeklyRecaps() {
  const [history, setHistory] = useState<{
    workouts: Workout[];
    goal: number;
    unit: Unit;
    weeks: WeekSummary[];
    year: number; // this year: older weeks show theirs
  } | null>(null);
  const [open, setOpen] = useState<WeekRecap | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getWorkoutsForStats(), getWeeklyGoal(), getDefaultUnit()]).then(([workouts, goal, unit]) => {
        const now = Date.now();
        setHistory({ workouts, goal, unit, weeks: pastWeeks(workouts, goal, now), year: new Date(now).getFullYear() });
      });
    }, [])
  );

  return (
    <>
      <FlatList
        style={styles.container}
        data={history?.weeks ?? []}
        keyExtractor={(item) => item.week}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          history ? <Text style={styles.empty}>{"Each week you train gets a recap here once it's over."}</Text> : null
        }
        renderItem={({ item }) => {
          const sunday = new Date(item.start + 6 * 24 * 60 * 60 * 1000);
          const dates = weekRange(item.start, sunday.getFullYear() !== history?.year);
          const stats = `${plural(item.workouts, "workout")} · ${formatNumber(Math.round(item.volume), 0)} ${history?.unit} · +${formatNumber(item.xp, 0)} XP`;
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => history && setOpen(weekRecap(history.workouts, history.goal, item.start))}
              accessibilityRole="button"
              accessibilityLabel={`${dates}: ${stats}`}
            >
              <View style={styles.main}>
                <Text style={styles.dates}>{dates}</Text>
                <Text style={styles.stats}>{stats}</Text>
                {(item.goalHit || item.prs > 0 || item.levelUp) && (
                  <View style={styles.marks}>
                    {item.goalHit && <Mark icon={<Check size={13} color={C.signal} />} text="Goal hit" />}
                    {item.prs > 0 && <Mark icon={<Trophy size={13} color={C.signal} />} text={plural(item.prs, "PR")} />}
                    {item.levelUp && <Mark icon={<Sparkles size={13} color={C.signal} />} text="Level up" />}
                  </View>
                )}
              </View>
              <ChevronRight size={20} color={C.textMuted} />
            </Pressable>
          );
        }}
      />
      <WeeklyRecap recap={open} unit={history?.unit ?? "kg"} onClose={() => setOpen(null)} closeLabel="Close" />
    </>
  );
}

function Mark({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={styles.mark}>
      {icon}
      <Text style={styles.markText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  list: { gap: 10, padding: 20, paddingBottom: 40 },
  empty: { color: C.textMuted, fontSize: 15, textAlign: "center", marginTop: 20 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 12, padding: 16 },
  cardPressed: { backgroundColor: C.raised },
  main: { flex: 1, minWidth: 0 },
  dates: { color: C.text, fontSize: 16, fontWeight: "500", marginBottom: 4 },
  stats: { color: C.textMuted, fontSize: 13 },
  marks: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  mark: { flexDirection: "row", alignItems: "center", gap: 4 },
  markText: { color: C.signal, fontSize: 13, fontWeight: "500" },
});
