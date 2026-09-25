import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Anchor, DropdownMenu, measureAnchor, MenuItem } from "../components/DropdownMenu";
import { C, R, T } from "../constants/theme";
import { plural } from "../lib/format";
import { dayKey, MonthDay, monthGrid, prCount, workoutRecords, workoutsByDay } from "../lib/stats";
import { getWorkoutsForStats } from "../lib/storage";
import { Workout } from "../types/workout";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

type Month = { year: number; month: number };

// This month and every month before it, back to the one with your first workout.
function monthsBack(workouts: Workout[], now: Date): Month[] {
  const first = new Date(workouts.reduce((min, w) => Math.min(min, new Date(w.date).getTime()), now.getTime()));
  const stop = new Date(first.getFullYear(), first.getMonth(), 1).getTime();
  const months: Month[] = [];
  for (const d = new Date(now.getFullYear(), now.getMonth(), 1); d.getTime() >= stop; d.setMonth(d.getMonth() - 1)) {
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

function DayCell({
  day,
  workouts,
  pr,
  onOpen,
}: {
  day: MonthDay | null;
  workouts: Workout[];
  pr: boolean;
  onOpen: (workouts: Workout[], anchor: Anchor) => void;
}) {
  const ref = useRef<View>(null);
  if (!day) return <View style={styles.cell} />;

  const trained = workouts.length > 0;
  const circle = (
    <View style={[styles.circle, trained && styles.trained, day.today && styles.today]}>
      <Text style={[styles.dayText, trained && styles.trainedText, day.future && styles.future]}>{day.day}</Text>
    </View>
  );
  const [y, m, d] = day.date.split("-").map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "long" });

  return (
    <View style={styles.cell}>
      {trained ? (
        <Pressable
          ref={ref}
          onPress={() => measureAnchor(ref.current, (anchor) => onOpen(workouts, anchor))}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${plural(workouts.length, "workout")}${pr ? ", PR" : ""}`}
        >
          {circle}
        </Pressable>
      ) : (
        circle
      )}
      {pr && <View style={styles.prDot} />}
    </View>
  );
}

function MonthCard({
  year,
  month,
  byDay,
  prDays,
  now,
  onOpen,
}: Month & {
  byDay: Map<string, Workout[]>;
  prDays: Set<string>;
  now: number;
  onOpen: (workouts: Workout[], anchor: Anchor) => void;
}) {
  const weeks = monthGrid(year, month, now);
  const count = weeks.flat().reduce((n, day) => n + (day ? (byDay.get(day.date)?.length ?? 0) : 0), 0);
  return (
    <View style={styles.month}>
      <View style={styles.monthHead}>
        <Text style={styles.monthTitle}>
          {new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </Text>
        <Text style={styles.monthMeta}>{plural(count, "workout")}</Text>
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={[styles.cell, styles.weekday]}>
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week, i) => (
        <View key={i} style={styles.week}>
          {week.map((day, j) => (
            <DayCell
              key={j}
              day={day}
              workouts={day ? (byDay.get(day.date) ?? []) : []}
              pr={day ? prDays.has(day.date) : false}
              onOpen={onOpen}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// Every day you trained, month by month. Gold dots mark days with a PR.
export default function CalendarScreen() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [now, setNow] = useState(Date.now());
  const [menu, setMenu] = useState<{ anchor: Anchor; items: MenuItem[] } | null>(null);

  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      getWorkoutsForStats().then(setWorkouts);
    }, [])
  );

  const { byDay, prDays, months, tiles } = useMemo(() => {
    const today = new Date(now);
    const records = workoutRecords(workouts);
    const prs = (list: Workout[]) => list.reduce((n, w) => n + prCount(records.get(w.id)), 0);
    const thisYear = workouts.filter((w) => new Date(w.date).getFullYear() === today.getFullYear());
    const thisMonth = thisYear.filter((w) => new Date(w.date).getMonth() === today.getMonth());
    return {
      byDay: workoutsByDay(workouts),
      prDays: new Set(workouts.filter((w) => prs([w]) > 0).map((w) => dayKey(new Date(w.date)))),
      months: monthsBack(workouts, today),
      tiles: [
        { label: "This month", value: thisMonth.length, gold: false },
        { label: "This year", value: thisYear.length, gold: false },
        { label: "PRs this year", value: prs(thisYear), gold: true },
      ],
    };
  }, [workouts, now]);

  // One workout that day opens it; two or more ask which.
  const open = (dayWorkouts: Workout[], anchor: Anchor) => {
    if (dayWorkouts.length === 1) {
      router.push(`/workout-log/${dayWorkouts[0].id}`);
      return;
    }
    setMenu({
      anchor,
      items: dayWorkouts.map((w) => ({
        key: w.id,
        label: w.name,
        detail: new Date(w.date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
        onPress: () => router.push(`/workout-log/${w.id}`),
      })),
    });
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={months}
        keyExtractor={(m) => `${m.year}-${m.month}`}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.tiles}>
            {tiles.map((t) => (
              <View key={t.label} style={styles.tile}>
                <Text style={[styles.tileValue, t.gold && styles.gold]}>{t.value}</Text>
                <Text style={styles.tileLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
        }
        renderItem={({ item }) => (
          <MonthCard {...item} byDay={byDay} prDays={prDays} now={now} onOpen={open} />
        )}
      />
      <DropdownMenu
        anchor={menu?.anchor ?? null}
        title="Which workout?"
        items={menu?.items ?? []}
        onClose={() => setMenu(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 12, gap: 12 },
  tiles: { flexDirection: "row", gap: 8 },
  tile: { flex: 1, backgroundColor: C.card, borderRadius: R.lg, paddingVertical: 12, alignItems: "center" },
  tileValue: { ...T.num, fontSize: 28 },
  tileLabel: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  gold: { color: C.signal },

  month: { backgroundColor: C.card, borderRadius: R.lg, padding: 14 },
  monthHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  monthTitle: { color: C.text, fontSize: 16, fontWeight: "600" },
  monthMeta: { color: C.textMuted, fontSize: 13 },
  week: { flexDirection: "row" },
  weekday: { color: C.textFaint, fontSize: 12, textAlign: "center", height: 22 },
  cell: { flex: 1, height: 46, alignItems: "center", justifyContent: "center" },
  circle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  trained: { backgroundColor: C.accent },
  today: { borderWidth: 1.5, borderColor: C.signal },
  dayText: { ...T.num, fontSize: 16, color: C.textMuted },
  trainedText: { color: C.onAccent },
  future: { opacity: 0.4 },
  prDot: { position: "absolute", bottom: 0, width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.signal },
});
