import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { searchExercises } from "../lib/exercises";
import { getTemplates, saveTemplate, updateTemplate } from "../lib/storage";

export default function CreateTemplate() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [rest, setRest] = useState("90");

  const results = searchExercises(query).slice(0, 30);

  useEffect(() => {
    if (!id) return;
    getTemplates().then((templates) => {
      const found = templates.find((t) => t.id === id);
      if (found) {
        setName(found.name);
        setSelected(found.exercises.map((e) => e.name));
        setRest(String(found.restSeconds ?? 90));
      }
    });
  }, [id]);

  const addExercise = (exerciseName: string) => {
    if (!selected.includes(exerciseName)) {
      setSelected([...selected, exerciseName]);
    }
  };

  const removeExercise = (exerciseName: string) => {
    setSelected(selected.filter((n) => n !== exerciseName));
  };

  const handleSave = async () => {
    if (!name.trim() || selected.length === 0) return;
    const exercises = selected.map((n) => ({ name: n }));
    const restSeconds = Number(rest) || 90;
    if (isEditing) {
      await updateTemplate({ id: id!, name: name.trim(), exercises, restSeconds });
    } else {
      await saveTemplate({ id: Date.now().toString(), name: name.trim(), exercises, restSeconds });
    }
    router.back();
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.nameInput}
        placeholder="Template name"
        placeholderTextColor="#8a8a8e"
        value={name}
        onChangeText={setName}
      />

      <View style={styles.restRow}>
        <Text style={styles.restLabel}>Rest between sets</Text>
        <TextInput
          style={styles.restInput}
          keyboardType="numeric"
          value={rest}
          onChangeText={setRest}
        />
        <Text style={styles.restUnit}>sec</Text>
      </View>

      {selected.length > 0 && (
        <View style={styles.selectedBox}>
          {selected.map((n) => (
            <Pressable key={n} style={styles.chip} onPress={() => removeExercise(n)}>
              <Text style={styles.chipText}>{n}  ✕</Text>
            </Pressable>
          ))}
        </View>
      )}

      <TextInput
        style={styles.search}
        placeholder="Search exercises to add"
        placeholderTextColor="#8a8a8e"
        value={query}
        onChangeText={setQuery}
      />

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => addExercise(item.name)}>
            <Text style={styles.rowText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>{isEditing ? "Save changes" : "Save template"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", padding: 20, paddingTop: 16 },
  nameInput: {
    backgroundColor: "#1c1c1e", color: "white", fontSize: 18,
    padding: 14, borderRadius: 10, marginBottom: 14,
  },
  restRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  restLabel: { color: "white", fontSize: 15, flex: 1 },
  restInput: {
    backgroundColor: "#1c1c1e", color: "white", fontSize: 16, textAlign: "center",
    paddingVertical: 8, width: 64, borderRadius: 8,
  },
  restUnit: { color: "#8a8a8e", fontSize: 14 },
  selectedBox: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: { backgroundColor: "#0a3d62", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  chipText: { color: "#9fd3ff", fontSize: 13 },
  search: {
    backgroundColor: "#1c1c1e", color: "white",
    padding: 12, borderRadius: 8, marginBottom: 12,
  },
  row: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "#2c2c2e" },
  rowText: { color: "white", fontSize: 15 },
  saveButton: {
    backgroundColor: "#007AFF", borderRadius: 12, padding: 16,
    alignItems: "center", marginTop: 12,
  },
  saveText: { color: "white", fontSize: 16, fontWeight: "500" },
});