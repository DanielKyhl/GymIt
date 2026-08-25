import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { searchExercises } from "../lib/exercises";
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
  const [addQuery, setAddQuery] = useState("");

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
    setAddQuery("");
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
        placeholderTextColor="#8a8a8e"
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
              <TextInput
                style={styles.cell}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#8a8a8e"
                value={set.weight ? String(set.weight) : ""}
                onChangeText={(v) => updateSet(exIndex, setIndex, "weight", Number(v) || 0)}
              />
              <TextInput
                style={styles.cell}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#8a8a8e"
                value={set.reps ? String(set.reps) : ""}
                onChangeText={(v) => updateSet(exIndex, setIndex, "reps", Number(v) || 0)}
              />
              <TextInput
                style={styles.cell}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#8a8a8e"
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

      {showAdd ? (
        <View style={styles.addBox}>
          <TextInput
            style={styles.addSearch}
            placeholder="Search exercise to add"
            placeholderTextColor="#8a8a8e"
            value={addQuery}
            onChangeText={setAddQuery}
          />
          {searchExercises(addQuery).slice(0, 8).map((e) => (
            <Pressable key={e.id} style={styles.addResult} onPress={() => addExercise(e.name)}>
              <Text style={styles.addResultText}>{e.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Pressable style={styles.addExerciseBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addExerciseText}>+ Add exercise</Text>
        </Pressable>
      )}

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>{isEditing ? "Save changes" : "Save template"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111" },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  nameInput: {
    backgroundColor: "#1c1c1e", color: "white", fontSize: 18,
    padding: 14, borderRadius: 10, marginBottom: 16,
  },
  exerciseCard: { backgroundColor: "#1c1c1e", borderRadius: 12, padding: 14, marginBottom: 12 },
  exHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  exerciseName: { color: "white", fontSize: 16, fontWeight: "500", flex: 1 },
  remove: { color: "#e24b4a", fontSize: 13 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  setNum: { color: "#8a8a8e", fontSize: 14, width: 28, textAlign: "center" },
  colHead: { color: "#6a6a6e", fontSize: 11 },
  colCell: { width: 60, textAlign: "center" },
  cell: {
    width: 60, backgroundColor: "#2c2c2e", color: "white", textAlign: "center",
    padding: 8, borderRadius: 6,
  },
  removeSet: { color: "#6a6a6e", fontSize: 16, width: 24, textAlign: "center" },
  addSet: { color: "#007AFF", fontSize: 14, marginTop: 4 },
  addExerciseBtn: {
    alignItems: "center", paddingVertical: 12, borderWidth: 0.5, borderColor: "#48484a",
    borderRadius: 10, borderStyle: "dashed", marginBottom: 12,
  },
  addExerciseText: { color: "#007AFF", fontSize: 15 },
  addBox: { backgroundColor: "#1c1c1e", borderRadius: 12, padding: 12, marginBottom: 12 },
  addSearch: { backgroundColor: "#2c2c2e", color: "white", padding: 10, borderRadius: 8, marginBottom: 8 },
  addResult: { paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: "#2c2c2e" },
  addResultText: { color: "white", fontSize: 14 },
  saveButton: {
    backgroundColor: "#007AFF", borderRadius: 12, padding: 16,
    alignItems: "center", marginTop: 4,
  },
  saveText: { color: "white", fontSize: 16, fontWeight: "500" },
});
