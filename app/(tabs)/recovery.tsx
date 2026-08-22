import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Body from "react-native-body-highlighter";
import {
  COLOR_PARTIAL,
  COLOR_RECOVERED,
  COLOR_TRAINED,
  computeRecovery,
  MuscleRecovery,
  slugLabel,
} from "../../lib/recovery";
import { getBodyGender, getWorkouts, setBodyGender } from "../../lib/storage";

export default function Recovery() {
  const { width } = useWindowDimensions();
  const [recovery, setRecovery] = useState<MuscleRecovery[]>([]);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [side, setSide] = useState<"front" | "back">("front");

  const flip = () => setSide((s) => (s === "front" ? "back" : "front"));

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then((w) => setRecovery(computeRecovery(w)));
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

  const pageWidth = width - 40;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Recovery</Text>

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

      <View style={[styles.bodyWrap, { width: pageWidth }]}>
        <Body side={side} gender={gender} scale={1.05} data={colored} />
      </View>

      <Pressable style={styles.turnBtn} onPress={flip}>
        <Text style={styles.turnText}>⟳ Turn around · showing {side}</Text>
      </Pressable>

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
        <Text style={styles.empty}>Everything's recovered — go train! 💪</Text>
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
  container: { flex: 1, backgroundColor: "#111" },
  content: { padding: 20, paddingTop: 60 },
  title: { color: "white", fontSize: 28, fontWeight: "bold", marginBottom: 16 },
  genderRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  genderBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, backgroundColor: "#1c1c1e" },
  genderActive: { backgroundColor: "#007AFF" },
  genderText: { color: "white", fontSize: 14 },
  hint: { color: "#8a8a8e", fontSize: 12, textAlign: "center", marginBottom: 6 },
  bodyWrap: { height: 340, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  turnBtn: {
    alignSelf: "center", backgroundColor: "#1c1c1e", borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 18, marginTop: 8,
  },
  turnText: { color: "#007AFF", fontSize: 14, fontWeight: "500" },
  legend: { flexDirection: "row", justifyContent: "center", gap: 18, marginTop: 8, marginBottom: 24 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { color: "#d0d0d0", fontSize: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  section: { color: "#8a8a8e", fontSize: 13, textTransform: "uppercase", marginBottom: 12 },
  empty: { color: "#8a8a8e", fontSize: 15, textAlign: "center", marginTop: 10 },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderBottomWidth: 0.5, borderBottomColor: "#2c2c2e", paddingVertical: 12,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowName: { color: "white", fontSize: 15 },
  rowStat: { color: "#8a8a8e", fontSize: 14 },
});
