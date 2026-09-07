import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { plural } from "../../lib/format";
import { deleteTemplate, getTemplates } from "../../lib/storage";
import { Template } from "../../types/workout";

export default function TemplateDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);

  useFocusEffect(
    useCallback(() => {
      getTemplates().then((templates) => {
        setTemplate(templates.find((t) => t.id === id) ?? null);
      });
    }, [id])
  );

  const doDelete = async () => {
    await deleteTemplate(id);
    router.back();
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Delete this template?")) doDelete();
      return;
    }
    Alert.alert(
      "Delete template",
      "Are you sure you want to delete this template?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]
    );
  };

  if (!template) {
    return (
      <View style={styles.container}>
        <Text style={styles.subtitle}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{template.name}</Text>
      <Text style={styles.subtitle}>{plural(template.exercises.length, "exercise")}</Text>

      <FlatList
        data={template.exercises}
        keyExtractor={(item, index) => item.name + index}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>{item.name}</Text>
            <Text style={styles.rowSub}>
              {item.sets && item.sets.length > 0
                ? item.sets.map((s) => `${s.weight}×${s.reps}`).join("   ")
                : "No sets planned"}
            </Text>
          </View>
        )}
      />

      <Pressable style={styles.startButton} onPress={() => router.push(`/workout/${template.id}`)}>
        <Text style={styles.startText}>Start workout</Text>
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable
          style={styles.editButton}
          onPress={() => router.push({ pathname: "/create-template", params: { id: template.id } })}
        >
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#131313", padding: 20, paddingTop: 16 },
  title: { color: "#F2F0EC", fontSize: 28, fontWeight: "bold", marginBottom: 4 },
  subtitle: { color: "#8C8A86", fontSize: 14, marginBottom: 24 },
  list: { gap: 10 },
  row: { backgroundColor: "#1C1C1C", borderRadius: 12, padding: 16 },
  rowText: { color: "#F2F0EC", fontSize: 16 },
  rowSub: { color: "#8C8A86", fontSize: 13, marginTop: 4 },
  startButton: {
    backgroundColor: "#D9D5CE", borderRadius: 12, padding: 16,
    alignItems: "center", marginTop: 12,
  },
  startText: { color: "#171614", fontSize: 16, fontWeight: "500" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  editButton: {
    flex: 1, backgroundColor: "#1C1C1C", borderRadius: 12, padding: 14, alignItems: "center",
  },
  editText: { color: "#F2F0EC", fontSize: 15, fontWeight: "500" },
  deleteButton: {
    flex: 1, backgroundColor: "#1C1C1C", borderRadius: 12, padding: 14, alignItems: "center",
  },
  deleteText: { color: "#E5544B", fontSize: 15, fontWeight: "500" },
});
