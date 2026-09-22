import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { authErrorMessage } from "../lib/authErrors";
import { convertWeight, parseWeight } from "../lib/units";
import {
  exportAll,
  getBodyGender,
  getBodyWeight,
  getDefaultRest,
  getDefaultUnit,
  getWeeklyGoal,
  setBodyGender,
  setBodyWeight,
  setDefaultRest,
  setDefaultUnit,
  setWeeklyGoal,
} from "../lib/storage";
import { C } from "../constants/theme";

export default function Settings() {
  const router = useRouter();
  const { user, logout, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [unit, setUnitState] = useState<"kg" | "lb">("kg");
  const [rest, setRestState] = useState("90");
  const [goal, setGoalState] = useState(3);
  const [gender, setGenderState] = useState<"male" | "female">("male");
  const [weight, setWeightState] = useState("");

  useFocusEffect(
    useCallback(() => {
      getDefaultUnit().then(setUnitState);
      getDefaultRest().then((r) => setRestState(String(r)));
      getWeeklyGoal().then(setGoalState);
      getBodyGender().then(setGenderState);
      // Shown in the current unit, even if it was entered in the other one.
      Promise.all([getBodyWeight(), getDefaultUnit()]).then(([bw, u]) => {
        setWeightState(bw ? String(convertWeight(bw.value, bw.unit, u)) : "");
      });
    }, [])
  );

  const chooseUnit = (u: "kg" | "lb") => {
    // Keep showing the same body weight, just expressed in the new unit.
    const current = parseWeight(weight);
    if (current && u !== unit) setWeightState(String(convertWeight(current, unit, u)));
    setUnitState(u);
    setDefaultUnit(u);
  };
  const chooseGoal = (g: number) => { setGoalState(g); setWeeklyGoal(g); };
  const chooseGender = (g: "male" | "female") => { setGenderState(g); setBodyGender(g); };
  const saveRest = (v: string) => { setRestState(v); setDefaultRest(Number(v) || 90); };
  const saveWeight = (v: string) => {
    setWeightState(v);
    const value = parseWeight(v);
    if (value) setBodyWeight(value, unit);
  };

  const handleDelete = async () => {
    if (!deletePassword) {
      setDeleteError("Enter your password to confirm.");
      return;
    }
    setDeleteError("");
    setDeleteBusy(true);
    try {
      await deleteAccount(deletePassword);
      setDeleting(false);
      router.replace("/welcome");
    } catch (e) {
      // The email is already known here, so only the password can be wrong.
      const code = (e as { code?: string })?.code;
      setDeleteError(
        code === "auth/invalid-credential" || code === "auth/wrong-password"
          ? "That password isn't right."
          : authErrorMessage(e)
      );
      setDeleteBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/welcome");
  };

  const exportData = async () => {
    await Clipboard.setStringAsync(await exportAll());
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

      <Text style={styles.section}>Body weight</Text>
      <View style={styles.restRow}>
        <TextInput
          style={styles.restInput}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={C.textFaint}
          value={weight}
          onChangeText={saveWeight}
        />
        <Text style={styles.restUnit}>{unit}</Text>
      </View>
      <Text style={[styles.hint, styles.fieldHint]}>Used as the weight for bodyweight exercises like pull-ups.</Text>

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
        {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
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

      <Text style={styles.section}>Danger zone</Text>
      <Pressable
        style={[styles.card, styles.dangerCard]}
        onPress={() => {
          setDeletePassword("");
          setDeleteError("");
          setDeleting(true);
        }}
      >
        <Text style={styles.dangerAction}>Delete account</Text>
        <Text style={styles.hint}>Permanently deletes your account and every workout, template and setting.</Text>
      </Pressable>

      <Modal visible={deleting} transparent animationType="fade" onRequestClose={() => setDeleting(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Delete your account?</Text>
            <Text style={styles.dialogBody}>
              This permanently deletes {user?.email ?? "your account"} and all your workouts, templates and
              settings, on this phone and in the cloud. It can't be undone. Copy a backup first if you might want
              your data later.
            </Text>
            <TextInput
              style={styles.dialogInput}
              placeholder="Your password"
              placeholderTextColor={C.textFaint}
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              autoFocus
            />
            {deleteError ? <Text style={styles.dialogError}>{deleteError}</Text> : null}
            <Pressable style={styles.deleteBtn} onPress={handleDelete} disabled={deleteBusy}>
              {deleteBusy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.deleteBtnText}>Delete account</Text>}
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setDeleting(false)} disabled={deleteBusy}>
              <Text style={styles.cancelText}>Keep my account</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  section: { color: C.textMuted, fontSize: 13, textTransform: "uppercase", marginBottom: 10, marginTop: 20 },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 16 },
  email: { color: C.text, fontSize: 16, marginBottom: 10 },
  logout: { color: C.accent, fontSize: 15 },
  segment: { flexDirection: "row", gap: 8 },
  segBtn: { flex: 1, backgroundColor: C.card, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  segActive: { backgroundColor: C.selected },
  segText: { color: C.text, fontSize: 15, fontWeight: "500" },
  restRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  restInput: {
    backgroundColor: C.card, color: C.text, fontSize: 16, textAlign: "center",
    paddingVertical: 12, width: 80, borderRadius: 10,
  },
  restUnit: { color: C.textMuted, fontSize: 15 },
  grid: { flexDirection: "row", gap: 6 },
  goalBtn: { flex: 1, height: 44, backgroundColor: C.card, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  action: { color: C.accent, fontSize: 15, marginBottom: 4 },
  hint: { color: C.textMuted, fontSize: 12 },
  dangerCard: { borderWidth: 1, borderColor: C.restOver },
  dangerAction: { color: C.danger, fontSize: 15, fontWeight: "500", marginBottom: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 },
  dialog: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.raised, padding: 20 },
  dialogTitle: { color: C.text, fontSize: 20, fontWeight: "600", marginBottom: 8 },
  dialogBody: { color: C.textSoft, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  dialogInput: {
    backgroundColor: C.raised, color: C.text, fontSize: 16,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  dialogError: { color: C.danger, fontSize: 13, marginBottom: 12, lineHeight: 18 },
  deleteBtn: { backgroundColor: C.danger, borderRadius: 12, paddingVertical: 14, alignItems: "center", minHeight: 50, justifyContent: "center" },
  deleteBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelText: { color: C.textMuted, fontSize: 15 },
  fieldHint: { marginTop: 8 },
});
