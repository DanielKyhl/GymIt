import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { getTemplates } from "../../lib/storage";
import { Template } from "../../types/workout";

export default function TemplateDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);

  useEffect(() => {
    getTemplates().then((templates) => {
      const found = templates.find((t) => t.id === id);
      setTemplate(found ?? null);
    });
  }, [id]);

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
      <Text style={styles.subtitle}>{template.exercises.length} exercises</Text>

      <FlatList
        data={template.exercises}
        keyExtractor={(item, index) => item.name + index}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>{item.name}</Text>
          </View>
        )}
      />

      <Pressable style={styles.startButton} onPress={() => {}}>
        <Text style={styles.startText}>Start workout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", padding: 20, paddingTop: 60 },
  title: { color: "white", fontSize: 28, fontWeight: "bold", marginBottom: 4 },
  subtitle: { color: "#8a8a8e", fontSize: 14, marginBottom: 24 },
  list: { gap: 10 },
  row: { backgroundColor: "#1c1c1e", borderRadius: 12, padding: 16 },
  rowText: { color: "white", fontSize: 16 },
  startButton: {
    backgroundColor: "#007AFF", borderRadius: 12, padding: 16,
    alignItems: "center", marginTop: 12,
  },
  startText: { color: "white", fontSize: 16, fontWeight: "500" },
});