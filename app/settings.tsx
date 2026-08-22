import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  getBodyGender,
  getDefaultRest,
  getDefaultUnit,
  getWeeklyGoal,
  setBodyGender,
  setDefaultRest,
  setDefaultUnit,
  setWeeklyGoal,
} from "../lib/storage";

export default function Settings() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [unit, setUnitState] = useState<"kg" | "lb">("kg");
  const [rest, setRestState] = useState("90");
  const [goal, setGoalState] = useState(3);
  const [gender, setGenderState] = useState<"male" | "female">("male");

  useFocusEffect(
    useCallback(() => {
      getDefaultUnit().then(setUnitState);
      getDefaultRest().then((r) => setRestState(String(r)));
      getWeeklyGoal().then(setGoalState);
      getBodyGender().then(setGenderState);
    }, [])
  );

  const chooseUnit = (u: "kg" | "lb") => { setUnitState(u); setDefaultUnit(u); };
  const chooseGoal = (g: number) => { setGoalState(g); setWeeklyGoal(g); };
  const chooseGender = (g: "male" | "female") => { setGenderState(g); setBodyGender(g); };
  const saveRest = (v: string) => { setRestState(v); setDefaultRest(Number(v) || 90); };

  const handleLogout = async () => {
    await logout();
    router.replace("/welcome");
  };

  const exportData = async () => {
    const keys = [
      "user", "registeredUsers", "templates", "workouts",
      "weeklyGoal", "bodyGender", "defaultUnit", "defaultRest", "premadeSeeded",
    ];
    const dump: Record<string, string | null> = {};
    for (const k of keys) dump[k] = await AsyncStorage.getItem(k);
    await Clipboard.setStringAsync(JSON.stringify(dump));
    if (Platform.OS === "web") window.alert("Backup copied to clipboard.");
    else Alert.alert("Backup copied", "Your data is on the clipboard. Paste it somewhere safe.");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Account</Text>
      <View style={styles.card}>
        <Text style={styles.email}>{user?.email ?? "—"}</Text>
        <Pressable onPress={handleLogout}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Default weight unit</Text>
      <View style={styles.segment}>
        {(["kg", "lb"] as const).map((u) => (
          <Pressable
            key={u}
            style={[styles.segBtn, unit === u && styles.segActive]}
            onPress={() => chooseUnit(u)}
          >
            <Text style={styles.segText}>{u}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Default rest between sets</Text>
      <View style={styles.restRow}>
        <TextInput
          style={styles.restInput}
          keyboardType="numeric"
          value={rest}
          onChangeText={saveRest}
        />
        <Text style={styles.restUnit}>seconds</Text>
      </View>

      <Text style={styles.section}>Weekly workout goal</Text>
      <View style={styles.grid}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Pressable
            key={n}
            style={[styles.goalBtn, goal === n && styles.segActive]}
            onPress={() => chooseGoal(n)}
          >
            <Text style={styles.segText}>{n}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Recovery body</Text>
      <View style={styles.segment}>
        {(["male", "female"] as const).map((g) => (
          <Pressable
            key={g}
            style={[styles.segBtn, gender === g && styles.segActive]}
            onPress={() => chooseGender(g)}
          >
            <Text style={styles.segText}>{g === "male" ? "Male" : "Female"}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Data</Text>
      <Pressable style={styles.card} onPress={exportData}>
        <Text style={styles.action}>Copy backup to clipboard</Text>
        <Text style={styles.hint}>Saves all your templates, workouts, and settings as text.</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111" },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  section: { color: "#8a8a8e", fontSize: 13, textTransform: "uppercase", marginBottom: 10, marginTop: 20 },
  card: { backgroundColor: "#1c1c1e", borderRadius: 12, padding: 16 },
  email: { color: "white", fontSize: 16, marginBottom: 10 },
  logout: { color: "#e24b4a", fontSize: 15 },
  segment: { flexDirection: "row", gap: 8 },
  segBtn: { flex: 1, backgroundColor: "#1c1c1e", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  segActive: { backgroundColor: "#007AFF" },
  segText: { color: "white", fontSize: 15, fontWeight: "500" },
  restRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  restInput: {
    backgroundColor: "#1c1c1e", color: "white", fontSize: 16, textAlign: "center",
    paddingVertical: 12, width: 80, borderRadius: 10,
  },
  restUnit: { color: "#8a8a8e", fontSize: 15 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  goalBtn: { width: 44, height: 44, backgroundColor: "#1c1c1e", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  action: { color: "#007AFF", fontSize: 15, marginBottom: 4 },
  hint: { color: "#8a8a8e", fontSize: 12 },
});
