import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Body, { Slug } from "react-native-body-highlighter";
import {
  COLOR_PARTIAL,
  COLOR_RECOVERED,
  COLOR_TRAINED,
  computeRecovery,
  MuscleRecovery,
  readinessScore,
  slugLabel,
} from "../../lib/recovery";
import { getBodyGender, getPlanTemplates, getTemplates, getWorkouts, setBodyGender } from "../../lib/storage";
import { suggestTemplate } from "../../lib/suggest";
import { ReadinessRing } from "../../components/ReadinessRing";
import { Template, Workout } from "../../types/workout";
import { C } from "../../constants/theme";
import { ChevronRight, CircleCheck, RotateCw } from "lucide-react-native";

function headline(score: number): string {
  if (score >= 80) return "Good to go";
  return score >= 50 ? "Partly recovered" : "Take it easy today";
}

export default function Recovery() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [recovery, setRecovery] = useState<MuscleRecovery[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [planIds, setPlanIds] = useState<string[]>([]);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [side, setSide] = useState<"front" | "back">("front");
  const [selected, setSelected] = useState<Slug | null>(null);

  const flip = () => setSide((s) => (s === "front" ? "back" : "front"));

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then((w) => {
        setWorkouts(w);
        setRecovery(computeRecovery(w));
      });
      getTemplates().then(setTemplates);
      getPlanTemplates().then(setPlanIds);
      getBodyGender().then(setGender);
    }, [])
  );

  const chooseGender = async (g: "male" | "female") => {
    setGender(g);
    await setBodyGender(g);
  };

  // Color every tracked muscle: green when recovered, yellow recovering, red
  // just trained. Non-muscle parts keep the body's neutral fill.
  const colored = recovery.map((m) => ({ slug: m.slug, color: m.color }));

  const recovering = recovery
    .filter((m) => m.fraction < 1)
    .sort((a, b) => a.fraction - b.fraction);
    const sel = recovery.find((m) => m.slug === selected);
  const score = readinessScore(recovery);
  const suggestion = suggestTemplate(templates, workouts, recovery, planIds);

  const pageWidth = width - 40;
  // The body library draws the figure 400 × scale tall and 200 × scale wide.
  // Fit it to the space we actually have and give its box exactly that height;
  // a fixed scale made it taller than the box on phones, spilling over the
  // buttons above and below.
  const bodyScale = Math.min(pageWidth / 200, (height * 0.55) / 400, 1.3);
  const bodyHeight = 400 * bodyScale;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Recovery</Text>

      {recovery.length > 0 && (
        <View style={styles.readyCard}>
          <ReadinessRing score={score} />
          <View style={styles.readyText}>
            <Text style={styles.readyLabel}>Readiness</Text>
            <Text style={styles.readyHeadline}>{headline(score)}</Text>
            {suggestion && (
              <Pressable
                style={styles.readyFor}
                onPress={() => router.push(`/template/${suggestion.template.id}`)}
                accessibilityRole="button"
              >
                <Text style={styles.readyForText} numberOfLines={1}>
                  Ready for <Text style={styles.readyForName}>{suggestion.template.name}</Text>
                </Text>
                <ChevronRight size={16} color={C.textMuted} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      <View style={styles.genderRow}>
        <Pressable
          style={[styles.genderBtn, gender === "male" && styles.genderActive]}
          onPress={() => chooseGender("male")}
        >
          <Text style={styles.genderText}>Male</Text>
        </Pressable>
        <Pressable
          style={[styles.genderBtn, gender === "female" && styles.genderActive]}
          onPress={() => chooseGender("female")}
        >
          <Text style={styles.genderText}>Female</Text>
        </Pressable>
      </View>
      
      
      <View style={[styles.bodyWrap, { width: pageWidth, height: bodyHeight }]}>
        <Body onBodyPartPress={(part) => setSelected(part.slug ?? null)} side={side} gender={gender} scale={bodyScale} data={colored} />
      </View>


      <Pressable style={styles.turnBtn} onPress={flip}>
        <RotateCw size={15} color={C.accent} />
        <Text style={styles.turnText}>Turn around · showing {side}</Text>
      </Pressable>

{sel && (
  <View style={styles.selCard}>
    <Text style={styles.selName}>{slugLabel(sel.slug)}</Text>
    {sel.fraction >= 1 ? (
      <View style={styles.selRecovered}>
        <CircleCheck size={16} color={C.success} />
        <Text style={styles.selStat}>Recovered</Text>
      </View>
    ) : (
      <Text style={styles.selStat}>~{sel.hoursLeft}h until recovered</Text>
    )}
  </View>
)}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: COLOR_RECOVERED }]} />
          <Text style={styles.legendText}>Recovered</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: COLOR_PARTIAL }]} />
          <Text style={styles.legendText}>Recovering</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: COLOR_TRAINED }]} />
          <Text style={styles.legendText}>Just trained</Text>
        </View>
      </View>

      <Text style={styles.section}>Still recovering</Text>
      {recovering.length === 0 ? (
        <Text style={styles.empty}>Everything's recovered</Text>
      ) : (
        recovering.map((m) => (
          <View key={m.slug} style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.dot, { backgroundColor: m.color }]} />
              <Text style={styles.rowName}>{slugLabel(m.slug)}</Text>
            </View>
            <Text style={styles.rowStat}>~{m.hoursLeft}h left</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 60 },
  title: { color: C.text, fontSize: 28, fontWeight: "bold", marginBottom: 16 },
  readyCard: {
    flexDirection: "row", alignItems: "center", gap: 16,
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16,
  },
  readyText: { flex: 1 },
  readyLabel: { color: C.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  readyHeadline: { color: C.text, fontSize: 19, fontWeight: "600", marginTop: 2 },
  readyFor: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 4, marginTop: 10,
    backgroundColor: C.raised, borderRadius: 999, paddingVertical: 7, paddingLeft: 12, paddingRight: 8, maxWidth: "100%",
  },
  readyForText: { color: C.textSoft, fontSize: 13, flexShrink: 1 },
  readyForName: { color: C.text, fontWeight: "600" },
  genderRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  genderBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, backgroundColor: C.card },
  genderActive: { backgroundColor: C.selected },
  genderText: { color: C.text, fontSize: 14 },
  hint: { color: C.textMuted, fontSize: 12, textAlign: "center", marginBottom: 6 },
  // overflow hidden: even if the figure ever outgrows the box, it can't cover
  // the gender toggle or the turn-around button.
  bodyWrap: { alignItems: "center", justifyContent: "center", alignSelf: "center", overflow: "hidden" },
  turnBtn: {
    alignSelf: "center", backgroundColor: C.card, borderRadius: 10,
    paddingVertical: 11, paddingHorizontal: 18, marginTop: 8,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  turnText: { color: C.accent, fontSize: 14, fontWeight: "500" },
  legend: { flexDirection: "row", justifyContent: "center", gap: 18, marginTop: 8, marginBottom: 24 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { color: C.textSoft, fontSize: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  section: { color: C.textMuted, fontSize: 13, textTransform: "uppercase", marginBottom: 12 },
  empty: { color: C.textMuted, fontSize: 15, textAlign: "center", marginTop: 10 },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderBottomWidth: 0.5, borderBottomColor: C.raised, paddingVertical: 12,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowName: { color: C.text, fontSize: 15 },
  rowStat: { color: C.textMuted, fontSize: 14 },
    selCard: { backgroundColor: C.card, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 14 },
  selName: { color: C.text, fontSize: 18, fontWeight: "500", marginBottom: 4 },
  selStat: { color: C.textMuted, fontSize: 15 },
  selRecovered: { flexDirection: "row", alignItems: "center", gap: 6 },
});
