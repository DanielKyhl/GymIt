import { useFocusEffect, useRouter } from "expo-router";
import { CalendarDays, Trophy } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { C, FONT, HIT, R } from "../../constants/theme";
import { isBodyweight } from "../../lib/exercises";
import { formatNumber, formatSets, plural, prGain } from "../../lib/format";
import { countedSets, ExerciseRecord, prCount, workoutRecords } from "../../lib/stats";
import { getWorkoutsForStats } from "../../lib/storage";
import { Workout } from "../../types/workout";

// Exercises listed on a card before it says "+2 more".
const MAX_LINES = 8;

type Month = { key: string; title: string; prs: number; data: Workout[] };

// Newest month first, each with its workouts newest first.
function byMonth(workouts: Workout[], records: Map<string, ExerciseRecord[]>): Month[] {
  const months: Month[] = [];
  [...workouts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach((w) => {
      const d = new Date(w.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let month = months[months.length - 1];
      if (month?.key !== key) {
        month = { key, title: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }), prs: 0, data: [] };
        months.push(month);
      }
      month.data.push(w);
      month.prs += prCount(records.get(w.id));
    });
  return months;
}

// A workout at a glance: what you did in each exercise, in small print, with
// its PRs in gold.
function WorkoutCard({ workout, records, onPress }: { workout: Workout; records?: ExerciseRecord[]; onPress: () => void }) {
  const unit = workout.unit;
  const counted = workout.exercises.flatMap((ex) => countedSets(ex.sets));
  const volume = counted.reduce((n, s) => n + s.weight * s.reps, 0);
  const prs = prCount(records);
  const meta = [
    new Date(workout.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
    `${Math.round(workout.durationSeconds / 60)} min`,
    plural(counted.length, "set"),
    volume > 0 ? `${formatNumber(volume, 0)} ${unit}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  // An exercise done twice shows its record on the first line only.
  const noted = new Set<string>();
  const lines = workout.exercises.flatMap((ex) => {
    const sets = formatSets(ex.sets, unit, isBodyweight(ex.name));
    if (!sets) return [];
    const record = noted.has(ex.name) ? undefined : records?.find((r) => r.exercise === ex.name);
    noted.add(ex.name);
    return [{ name: ex.name, sets, record }];
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {workout.name}
        </Text>
        {prs > 0 && (
          <View style={styles.badge}>
            <Trophy size={12} color={C.signal} />
            <Text style={styles.badgeText}>{plural(prs, "PR")}</Text>
          </View>
        )}
      </View>
      <Text style={styles.meta}>{meta}</Text>

      {lines.length > 0 && (
        <View style={styles.lines}>
          {lines.slice(0, MAX_LINES).map(({ name, sets, record }, i) => {
            const pr = record?.pr;
            const milestone = record?.milestone;
            return (
              <View key={i} style={styles.line}>
                <View style={styles.lineName}>
                  {pr && <Trophy size={11} color={C.signal} />}
                  <Text style={[styles.name, pr && styles.gold]} numberOfLines={1}>
                    {name}
                  </Text>
                </View>
                <Text style={[styles.sets, pr && styles.gold]} numberOfLines={1}>
                  {sets}
                  {pr ? ` · ${prGain(pr, unit)}` : ""}
                  {milestone ? (
                    <Text style={styles.milestone}>
                      {" · "}↑ first {formatNumber(milestone.weight)} {unit}
                    </Text>
                  ) : null}
                </Text>
              </View>
            );
          })}
          {lines.length > MAX_LINES && <Text style={styles.more}>+{lines.length - MAX_LINES} more</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function History() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useFocusEffect(
    useCallback(() => {
      // In one unit, so records compare like with like.
      getWorkoutsForStats().then(setWorkouts);
    }, [])
  );

  const records = useMemo(() => workoutRecords(workouts), [workouts]);
  const months = useMemo(() => byMonth(workouts, records), [workouts, records]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Pressable
          style={({ pressed }) => [styles.calendarBtn, pressed && styles.pressed]}
          onPress={() => router.push("/calendar")}
          hitSlop={HIT}
          accessibilityRole="button"
          accessibilityLabel="Calendar"
        >
          <CalendarDays size={20} color={C.accent} />
        </Pressable>
      </View>

      <SectionList
        sections={months}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No workouts yet. Finish one to see it here.</Text>}
        renderSectionHeader={({ section }) => (
          <View style={styles.monthHead}>
            <Text style={styles.monthTitle}>{section.title}</Text>
            <Text style={styles.monthMeta}>
              {plural(section.data.length, "workout")}
              {section.prs > 0 ? ` · ${plural(section.prs, "PR")}` : ""}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            records={records.get(item.id)}
            onPress={() => router.push(`/workout-log/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, padding: 20, paddingTop: 60 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { color: C.text, fontSize: 28, fontWeight: "bold" },
  calendarBtn: {
    width: 40, height: 40, borderRadius: R.md, backgroundColor: C.card,
    alignItems: "center", justifyContent: "center",
  },
  pressed: { backgroundColor: C.raised },
  list: { paddingBottom: 24 },
  empty: { color: C.textMuted, fontSize: 15, textAlign: "center", marginTop: 40 },
  monthHead: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "baseline",
    paddingHorizontal: 2, paddingTop: 10, paddingBottom: 8,
  },
  monthTitle: { color: C.textSoft, fontSize: 13, fontWeight: "600" },
  monthMeta: { color: C.textFaint, fontSize: 12 },

  card: { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, color: C.text, fontSize: 17, fontWeight: "500" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.signalBg, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2,
  },
  badgeText: { color: C.signal, fontSize: 12, fontWeight: "600" },
  meta: { color: C.textMuted, fontSize: 12, marginTop: 3 },
  lines: { marginTop: 8, gap: 2 },
  line: { flexDirection: "row", alignItems: "center", gap: 10 },
  lineName: { flexDirection: "row", alignItems: "center", gap: 4, flexGrow: 1, flexShrink: 1 },
  name: { flexShrink: 1, color: C.textSoft, fontSize: 12 },
  sets: { flexShrink: 0, maxWidth: "72%", textAlign: "right", fontFamily: FONT.num, fontSize: 14, color: C.text },
  gold: { color: C.signal },
  milestone: { color: C.textSoft },
  more: { color: C.textFaint, fontSize: 12, marginTop: 2 },
});
