import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { BodyWeightPrompt } from "../../components/BodyWeightPrompt";
import { ConsistencyHeatmap } from "../../components/ConsistencyHeatmap";
import { MuscleSetBars } from "../../components/MuscleSetBars";
import { VolumeChart } from "../../components/VolumeChart";
import { weighInsIn } from "../../lib/bodyweight";
import { plural } from "../../lib/format";
import {
  getBodyWeight,
  getBodyWeightLog,
  getDefaultUnit,
  getWorkoutsForStats,
  setBodyWeight,
} from "../../lib/storage";
import {
  consistencyGrid,
  ExerciseSummary,
  getTrainedExercises,
  getVolumeByTemplate,
  HeatCell,
  MuscleSets,
  weeklyMuscleSets,
} from "../../lib/stats";
import { convertWeight, Unit } from "../../lib/units";
import { C, HIT, T } from "../../constants/theme";
import { ChevronRight, Plus, X } from "lucide-react-native";

const HEATMAP_WEEKS = 16;

export default function Progress() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [byTemplate, setByTemplate] = useState<
    { name: string; points: { date: string; volume: number }[] }[]
  >([]);
  const [grid, setGrid] = useState<HeatCell[][]>([]);
  const [muscles, setMuscles] = useState<MuscleSets[]>([]);
  const [unit, setUnit] = useState<Unit>("kg");
  const [weighIns, setWeighIns] = useState<{ date: string; value: number }[]>([]);
  const [bodyWeight, setBodyWeightState] = useState<number | null>(null);
  const [showVolume, setShowVolume] = useState(false);
  const [logging, setLogging] = useState(false);

  const loadBodyWeight = useCallback(() => {
    Promise.all([getBodyWeightLog(), getBodyWeight(), getDefaultUnit()]).then(([log, bw, u]) => {
      setUnit(u);
      setWeighIns(weighInsIn(log, u));
      setBodyWeightState(bw ? Math.round(convertWeight(bw.value, bw.unit, u) * 10) / 10 : null);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      getWorkoutsForStats().then((workouts) => {
        setExercises(getTrainedExercises(workouts));
        setByTemplate(getVolumeByTemplate(workouts));
        setGrid(consistencyGrid(workouts, HEATMAP_WEEKS));
        setMuscles(weeklyMuscleSets(workouts));
      });
      loadBodyWeight();
    }, [loadBodyWeight])
  );

  // Cards are inset 20 each side, and their content adds 16 padding.
  const chartWidth = width - 40 - 32;

  // The chart shows the last 8 weigh-ins; the change is across that window.
  const recent = weighIns.slice(-8);
  const change = recent.length >= 2 ? Math.round((recent[recent.length - 1].value - recent[0].value) * 10) / 10 : null;
  const since = recent.length >= 2 ? shortDay(recent[0].date) : "";

  const header = (
    <View>
      <Text style={styles.section}>Consistency</Text>
      <View style={styles.panelCard}>
        {grid.length > 0 && <ConsistencyHeatmap grid={grid} width={chartWidth} />}
      </View>

      <Text style={styles.section}>Sets per muscle · last 7 days</Text>
      <View style={styles.panelCard}>
        <MuscleSetBars data={muscles} />
        <Text style={styles.caption}>
          Finished working sets. The green band is 10–20 sets a week, a common target for building muscle.
        </Text>
      </View>

      <Text style={styles.section}>Body weight</Text>
      <View style={styles.panelCard}>
        <View style={styles.bwTop}>
          <View>
            <Text style={styles.bwValue}>
              {bodyWeight ?? "—"}
              <Text style={styles.bwUnit}> {unit}</Text>
            </Text>
            {change !== null && (
              <Text style={styles.bwChange}>
                {change > 0 ? "+" : change < 0 ? "−" : "±"}
                {Math.abs(change)} {unit} since {since}
              </Text>
            )}
          </View>
          <Pressable style={styles.logBtn} onPress={() => setLogging(true)} accessibilityRole="button">
            <Plus size={16} color={C.accent} />
            <Text style={styles.logBtnText}>Log weight</Text>
          </Pressable>
        </View>
        {recent.length >= 2 ? (
          <VolumeChart
            // Noon, so the date can't slip to the day before in any time zone.
            data={recent.map((e) => ({ date: `${e.date}T12:00:00`, volume: e.value }))}
            width={chartWidth}
            zeroBased={false}
          />
        ) : (
          <Text style={styles.caption}>Log your weight every now and then to see the trend here.</Text>
        )}
      </View>

      <Pressable style={styles.volumeLink} onPress={() => setShowVolume(true)}>
        <Text style={styles.volumeLinkText}>Volume per template</Text>
        <ChevronRight size={20} color={C.textMuted} />
      </Pressable>
      <Text style={styles.section}>Exercises</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Progress</Text>
            {header}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Log some sets in a workout and your progress shows up here.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: "/exercise-progress/[name]", params: { name: item.name } })}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>
              Best {item.bestWeight} · est. 1RM {item.best1RM} · {plural(item.sessionCount, "session")}
            </Text>
          </TouchableOpacity>
        )}
      />

      <BodyWeightPrompt
        visible={logging}
        unit={unit}
        title="Log your weight"
        body="Saved as today's weigh-in. Bodyweight exercises use it too."
        dismissLabel="Cancel"
        onSave={async (value, entered) => {
          setLogging(false);
          await setBodyWeight(value, entered);
          loadBodyWeight();
        }}
        onLater={() => setLogging(false)}
      />

      <Modal
        visible={showVolume}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVolume(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Volume per template</Text>
              <Pressable onPress={() => setShowVolume(false)} hitSlop={HIT} accessibilityLabel="Close">
                <X size={22} color={C.textMuted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.panelContent}>
              {byTemplate.length === 0 ? (
                <Text style={styles.empty}>Finish a workout to see your volume trend.</Text>
              ) : (
                byTemplate.map((g) => (
                  <View key={g.name} style={styles.templateSection}>
                    <Text style={styles.templateName}>{g.name}</Text>
                    <Text style={styles.templateMeta}>{plural(g.points.length, "workout")}</Text>
                    <VolumeChart data={g.points.slice(-8)} width={chartWidth} />
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// "2026-09-03" -> "3 Sep", read as a local calendar day.
function shortDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  title: { color: C.text, fontSize: 28, fontWeight: "bold", marginBottom: 4 },
  section: { color: C.textMuted, fontSize: 13, textTransform: "uppercase", marginBottom: 12, marginTop: 20 },
  panelCard: { backgroundColor: C.card, borderRadius: 14, padding: 16 },
  caption: { color: C.textFaint, fontSize: 12, lineHeight: 17, marginTop: 14 },
  bwTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  bwValue: { ...T.num, fontSize: 34 },
  bwUnit: { ...T.num, color: C.textMuted, fontSize: 18 },
  bwChange: { color: C.textMuted, fontSize: 13, marginTop: 2 },
  logBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.raised, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14,
  },
  logBtnText: { color: C.accent, fontSize: 14, fontWeight: "500" },
  volumeLink: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: C.card, borderRadius: 12, padding: 16, marginTop: 20,
  },
  volumeLinkText: { color: C.text, fontSize: 15, fontWeight: "500" },
  list: { gap: 10, padding: 20, paddingTop: 60, paddingBottom: 40 },
  empty: { color: C.textMuted, fontSize: 15, textAlign: "center", marginTop: 20 },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 16 },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: "500", marginBottom: 4 },
  cardSub: { color: C.textMuted, fontSize: 13 },

  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center", alignItems: "center", padding: 20,
  },
  panel: {
    width: "100%", maxHeight: "80%", backgroundColor: C.card,
    borderRadius: 20, borderWidth: 1, borderColor: C.raised, overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.raised,
  },
  panelTitle: { color: C.text, fontSize: 17, fontWeight: "600" },
  panelContent: { padding: 16, paddingBottom: 24 },
  templateSection: { marginBottom: 24 },
  templateName: { color: C.text, fontSize: 16, fontWeight: "500" },
  templateMeta: { color: C.textMuted, fontSize: 12, marginBottom: 4 },
});
