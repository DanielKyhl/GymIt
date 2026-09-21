import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ExercisePicker } from "../components/ExercisePicker";
import { isBodyweight } from "../lib/exercises";
import { getDefaultRest, getDefaultUnit, getTemplates, saveTemplate, updateTemplate } from "../lib/storage";
import { TemplateExercise } from "../types/workout";

export default function CreateTemplate() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [defaultRest, setDefaultRest] = useState(120);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    getDefaultUnit().then(setUnit);
    getDefaultRest().then(setDefaultRest);
  }, []);

  useEffect(() => {
    if (!id) return;
    getTemplates().then((templates) => {
      const found = templates.find((t) => t.id === id);
      if (found) {
        setName(found.name);
        setExercises(found.exercises.map((e) => ({ name: e.name, sets: e.sets ?? [] })));
      }
    });
  }, [id]);

  const addExercise = (exName: string) => {
    setExercises((prev) => [
      ...prev,
      { name: exName, sets: [{ weight: 0, reps: 0, restSeconds: defaultRest }] },
    ]);
    setShowAdd(false);
  };
  const removeExercise = (exIndex: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIndex));
  };
  const addSet = (exIndex: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? { ...ex, sets: [...(ex.sets ?? []), { weight: 0, reps: 0, restSeconds: defaultRest }] }
          : ex
      )
    );
  };
  const removeSet = (exIndex: number, setIndex: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex ? { ...ex, sets: (ex.sets ?? []).filter((_, j) => j !== setIndex) } : ex
      )
    );
  };
  const updateSet = (exIndex: number, setIndex: number, field: "weight" | "reps", value: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? { ...ex, sets: (ex.sets ?? []).map((s, j) => (j === setIndex ? { ...s, [field]: value } : s)) }
          : ex
      )
    );
  };
  const setRestForSet = (exIndex: number, setIndex: number, seconds: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? { ...ex, sets: (ex.sets ?? []).map((s, j) => (j === setIndex ? { ...s, restSeconds: seconds } : s)) }
          : ex
      )
    );
  };

  const handleSave = async () => {
    if (!name.trim() || exercises.length === 0) return;
    const template = { id: isEditing ? id! : Date.now().toString(), name: name.trim(), exercises };
    if (isEditing) await updateTemplate(template);
    else await saveTemplate(template);
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextInput
        style={styles.nameInput}
        placeholder="Template name"
        placeholderTextColor="#8C8A86"
        value={name}
        onChangeText={setName}
      />

      {exercises.map((ex, exIndex) => (
        <View style={styles.exerciseCard} key={ex.name + exIndex}>
          <View style={styles.exHeader}>
            <Text style={styles.exerciseName}>{ex.name}</Text>
            <Pressable onPress={() => removeExercise(exIndex)}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>

          <View style={styles.setRow}>
            <Text style={[styles.setNum, styles.colHead]}>Set</Text>
            <Text style={[styles.colHead, styles.colCell]}>{unit}</Text>
            <Text style={[styles.colHead, styles.colCell]}>Reps</Text>
            <Text style={[styles.colHead, styles.colCell]}>Rest s</Text>
            <Text style={[styles.colHead, { width: 24 }]}></Text>
          </View>

          {(ex.sets ?? []).map((set, setIndex) => (
            <View style={styles.setRow} key={setIndex}>
              <Text style={styles.setNum}>{setIndex + 1}</Text>
              {isBodyweight(ex.name) ? (
                // Filled in with your body weight when the workout starts.
                <View style={styles.bwCell}>
                  <Text style={styles.bwText}>BW</Text>
                </View>
              ) : (
                <TextInput
                  style={styles.cell}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#8C8A86"
                  value={set.weight ? String(set.weight) : ""}
                  onChangeText={(v) => updateSet(exIndex, setIndex, "weight", Number(v) || 0)}
                />
              )}
              <TextInput
                style={styles.cell}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#8C8A86"
                value={set.reps ? String(set.reps) : ""}
                onChangeText={(v) => updateSet(exIndex, setIndex, "reps", Number(v) || 0)}
              />
              <TextInput
                style={styles.cell}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#8C8A86"
                value={set.restSeconds ? String(set.restSeconds) : ""}
                onChangeText={(v) => setRestForSet(exIndex, setIndex, Number(v) || 0)}
              />
              <Pressable onPress={() => removeSet(exIndex, setIndex)}>
                <Text style={styles.removeSet}>✕</Text>
              </Pressable>
            </View>
          ))}

          <Pressable onPress={() => addSet(exIndex)}>
            <Text style={styles.addSet}>+ Add set</Text>
          </Pressable>
        </View>
      ))}

      <Pressable style={styles.addExerciseBtn} onPress={() => setShowAdd(true)}>
        <Text style={styles.addExerciseText}>+ Add exercise</Text>
      </Pressable>

      <ExercisePicker
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSelect={addExercise}
      />

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>{isEditing ? "Save changes" : "Save template"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#131313" },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  nameInput: {
    backgroundColor: "#1C1C1C", color: "#F2F0EC", fontSize: 18,
    padding: 14, borderRadius: 10, marginBottom: 16,
  },
  exerciseCard: { backgroundColor: "#1C1C1C", borderRadius: 12, padding: 14, marginBottom: 12 },
  exHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  exerciseName: { color: "#F2F0EC", fontSize: 16, fontWeight: "500", flex: 1 },
  remove: { color: "#E5544B", fontSize: 13 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  setNum: { color: "#8C8A86", fontSize: 14, width: 28, textAlign: "center" },
  colHead: { color: "#6E6C68", fontSize: 11 },
  colCell: { width: 60, textAlign: "center" },
  cell: {
    width: 60, backgroundColor: "#272727", color: "#F2F0EC", textAlign: "center",
    padding: 8, borderRadius: 6,
  },
  bwCell: {
    width: 60, paddingVertical: 8, borderRadius: 6, alignItems: "center",
    borderWidth: 1, borderColor: "#272727",
  },
  bwText: { color: "#8C8A86", fontSize: 14 },
  removeSet: { color: "#6E6C68", fontSize: 16, width: 24, textAlign: "center" },
  addSet: { color: "#D9D5CE", fontSize: 14, marginTop: 4 },
  addExerciseBtn: {
    alignItems: "center", paddingVertical: 12, borderWidth: 0.5, borderColor: "#272727",
    borderRadius: 10, borderStyle: "dashed", marginBottom: 12,
  },
  addExerciseText: { color: "#D9D5CE", fontSize: 15 },
  saveButton: {
    backgroundColor: "#D9D5CE", borderRadius: 12, padding: 16,
    alignItems: "center", marginTop: 4,
  },
  saveText: { color: "#171614", fontSize: 16, fontWeight: "500" },
});
