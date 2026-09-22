import { useRouter } from "expo-router";
import { Check, ChevronLeft } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PrimaryButton, SecondaryButton } from "../components/AuthUI";
import { C, HIT, T } from "../constants/theme";
import {
  EXPERIENCE,
  Experience,
  Goal,
  GOALS,
  restForGoal,
  starterPlan,
  suggestedWeeklyGoal,
  WEEKLY_OPTIONS,
} from "../lib/onboarding";
import { completeOnboarding, getDefaultUnit, getTemplates, skipOnboarding } from "../lib/storage";
import { parseWeight, Unit } from "../lib/units";
import { Template } from "../types/workout";

const QUESTIONS = 4; // then the plan

function Option({
  title,
  detail,
  selected,
  onPress,
}: {
  title: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
    >
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDetail}>{detail}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <Check size={14} color={C.onAccent} strokeWidth={3} />}
      </View>
    </Pressable>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [unit, setUnit] = useState<Unit>("kg");
  const [weightText, setWeightText] = useState("");
  const [weekly, setWeekly] = useState<number | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDefaultUnit().then(setUnit);
  }, []);

  // Read again on reaching the plan: on a slow first sign-in the example
  // templates may only have arrived while the questions were answered.
  const atPlan = step >= QUESTIONS;
  useEffect(() => {
    getTemplates().then(setTemplates);
  }, [atPlan]);

  const suggested = suggestedWeeklyGoal(experience ?? "new");
  const weeklyGoal = weekly ?? suggested;
  const plan = starterPlan(experience ?? "new", weeklyGoal);
  const template = templates.find((t) => t.id === plan.templateId);
  const goalTitle = GOALS.find((g) => g.id === goal)?.title;

  const canContinue = (step === 0 && goal !== null) || (step === 1 && experience !== null) || step >= 2;

  const skip = async () => {
    await skipOnboarding();
    router.replace("/(tabs)");
  };

  const finish = async (startWorkout: boolean) => {
    if (!goal || !experience) return;
    setBusy(true);
    await completeOnboarding({
      goal,
      experience,
      unit,
      weeklyGoal,
      bodyWeight: parseWeight(weightText),
      planTemplates: plan.rotation,
    });
    router.replace("/(tabs)");
    if (startWorkout && template) router.push(`/workout/${template.id}`);
  };

  const content = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Text style={styles.title}>What's your main goal?</Text>
            <Text style={styles.subtitle}>It sets your rest timer. You can change that any time.</Text>
            {GOALS.map((g) => (
              <Option key={g.id} {...g} selected={goal === g.id} onPress={() => setGoal(g.id)} />
            ))}
          </>
        );
      case 1:
        return (
          <>
            <Text style={styles.title}>How long have you been lifting?</Text>
            <Text style={styles.subtitle}>So the first plan fits where you are.</Text>
            {EXPERIENCE.map((e) => (
              <Option key={e.id} {...e} selected={experience === e.id} onPress={() => setExperience(e.id)} />
            ))}
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.title}>Kilograms or pounds?</Text>
            <Text style={styles.subtitle}>Used for every weight in the app. You can switch in Settings.</Text>
            <View style={styles.segment}>
              {(["kg", "lb"] as const).map((u) => (
                <Pressable
                  key={u}
                  style={[styles.segBtn, unit === u && styles.segActive]}
                  onPress={() => setUnit(u)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: unit === u }}
                >
                  <Text style={[styles.segText, unit === u && styles.segTextActive]}>
                    {u === "kg" ? "Kilograms" : "Pounds"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Your body weight (optional)</Text>
            <View style={styles.weightRow}>
              <TextInput
                style={styles.weightInput}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={C.textFaint}
                value={weightText}
                onChangeText={setWeightText}
              />
              <Text style={styles.weightUnit}>{unit}</Text>
            </View>
            <Text style={styles.hint}>
              Pull-ups, push-ups and other bodyweight exercises use it as their weight, so they count toward your
              progress and records.
            </Text>
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.title}>How often will you train?</Text>
            <Text style={styles.subtitle}>
              Workouts per week. Pick what you can keep up: hitting it earns bonus XP.
            </Text>
            <View style={styles.weekRow}>
              {WEEKLY_OPTIONS.map((n) => (
                <View key={n} style={styles.weekCol}>
                  <Pressable
                    style={[styles.weekBtn, weeklyGoal === n && styles.weekBtnActive]}
                    onPress={() => setWeekly(n)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: weeklyGoal === n }}
                    accessibilityLabel={`${n} workouts a week`}
                  >
                    <Text style={[styles.weekNum, weeklyGoal === n && styles.weekNumActive]}>{n}</Text>
                  </Pressable>
                  {n === suggested && <Text style={styles.suggested}>Suggested</Text>}
                </View>
              ))}
            </View>
          </>
        );
      default:
        return (
          <>
            <Text style={styles.title}>You're set up</Text>
            <Text style={styles.subtitle}>Here's a good place to start. Change or swap it whenever you like.</Text>

            <View style={styles.planCard}>
              <Text style={styles.planLabel}>Start with · {plan.split}</Text>
              <Text style={styles.planName}>{template?.name ?? plan.split}</Text>
              {template && (
                <View style={styles.planList}>
                  {template.exercises.map((e, i) => (
                    <Text key={e.name} style={styles.planExercise} numberOfLines={1}>
                      <Text style={styles.planIndex}>{i + 1}  </Text>
                      {e.name}
                    </Text>
                  ))}
                </View>
              )}
              <Text style={styles.planWhy}>{plan.why}</Text>
            </View>

            <View style={styles.summary}>
              {[
                ["Goal", goalTitle ?? "—"],
                ["Rest timer", goal ? `${restForGoal(goal)} s` : "—"],
                ["Weekly goal", `${weeklyGoal} workouts`],
                ["Units", unit],
              ].map(([k, v]) => (
                <View key={k} style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>{k}</Text>
                  <Text style={styles.summaryValue}>{v}</Text>
                </View>
              ))}
            </View>
          </>
        );
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.top}>
        <Pressable
          onPress={() => setStep(step - 1)}
          hitSlop={HIT}
          disabled={step === 0}
          style={[styles.topSide, step === 0 && styles.hidden]}
          accessibilityLabel="Back"
        >
          <ChevronLeft size={26} color={C.text} />
        </Pressable>
        <View style={styles.progress}>
          {Array.from({ length: QUESTIONS }, (_, i) => (
            <View key={i} style={[styles.progressSeg, i <= step && styles.progressDone]} />
          ))}
        </View>
        <Pressable
          onPress={skip}
          hitSlop={HIT}
          disabled={step >= QUESTIONS}
          style={[styles.topSide, styles.skip, step >= QUESTIONS && styles.hidden]}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {content()}
      </ScrollView>

      <View style={styles.footer}>
        {step < QUESTIONS ? (
          <PrimaryButton label="Continue" onPress={() => setStep(step + 1)} disabled={!canContinue} />
        ) : (
          <>
            {template && <PrimaryButton label="Start first workout" onPress={() => finish(true)} busy={busy} />}
            <SecondaryButton label="Go to Home" onPress={() => finish(false)} />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  top: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  topSide: { width: 44, height: 32, justifyContent: "center" },
  skip: { alignItems: "flex-end" },
  hidden: { opacity: 0 },
  skipText: { color: C.textMuted, fontSize: 15 },
  progress: { flex: 1, flexDirection: "row", gap: 6 },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.raised },
  progressDone: { backgroundColor: C.accent },
  content: { padding: 24, paddingTop: 24, paddingBottom: 24 },
  title: { ...T.title, marginBottom: 8 },
  subtitle: { color: C.textMuted, fontSize: 15, lineHeight: 21, marginBottom: 24 },

  option: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1.5, borderColor: C.raised,
    padding: 16, marginBottom: 12,
  },
  optionSelected: { borderColor: C.accent, backgroundColor: C.raised },
  optionText: { flex: 1 },
  optionTitle: { color: C.text, fontSize: 17, fontWeight: "600" },
  optionDetail: { color: C.textMuted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  radio: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.textFaint,
    alignItems: "center", justifyContent: "center",
  },
  radioSelected: { backgroundColor: C.accent, borderColor: C.accent },

  segment: { flexDirection: "row", backgroundColor: C.card, borderRadius: 14, padding: 4, marginBottom: 28 },
  segBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  segActive: { backgroundColor: C.selected },
  segText: { color: C.textMuted, fontSize: 16, fontWeight: "500" },
  segTextActive: { color: C.text },
  fieldLabel: { color: C.textSoft, fontSize: 14, fontWeight: "500", marginBottom: 8 },
  weightRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  weightInput: {
    ...T.num, flex: 1, minWidth: 0, fontSize: 28, textAlign: "center",
    backgroundColor: C.card, borderRadius: 12, paddingVertical: 12,
  },
  weightUnit: { ...T.num, color: C.textMuted, fontSize: 22, width: 30 },
  hint: { color: C.textFaint, fontSize: 13, lineHeight: 18, marginTop: 10 },

  weekRow: { flexDirection: "row", gap: 6 },
  weekCol: { flex: 1, alignItems: "center", gap: 8 },
  weekBtn: {
    width: "100%", height: 56, borderRadius: 12, backgroundColor: C.card,
    borderWidth: 1.5, borderColor: C.raised, alignItems: "center", justifyContent: "center",
  },
  weekBtnActive: { borderColor: C.accent, backgroundColor: C.raised },
  weekNum: { ...T.num, color: C.textSoft, fontSize: 24 },
  weekNumActive: { color: C.text },
  suggested: { color: C.signal, fontSize: 10, fontWeight: "600", width: 70, textAlign: "center" },

  planCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.raised, padding: 20 },
  planLabel: { color: C.signal, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  planName: { color: C.text, fontSize: 28, fontWeight: "700", marginTop: 4, marginBottom: 12 },
  planList: { gap: 6, marginBottom: 14 },
  planExercise: { color: C.textSoft, fontSize: 14 },
  planIndex: { ...T.num, color: C.textFaint, fontSize: 14 },
  planWhy: { color: C.textMuted, fontSize: 13, lineHeight: 19 },
  summary: { marginTop: 16, backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 16 },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: C.raised,
  },
  summaryKey: { color: C.textMuted, fontSize: 14 },
  summaryValue: { color: C.text, fontSize: 14, fontWeight: "500" },

  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 36, gap: 12 },
});
