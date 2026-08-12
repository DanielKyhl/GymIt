import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { getTemplates } from "../../lib/storage";
import { Template } from "../../types/workout";

export default function HomeScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);

  useFocusEffect(
    useCallback(() => {
      getTemplates().then(setTemplates);
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GymIt 💪</Text>
        <Pressable onPress={logout}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Your templates</Text>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No templates yet. Create your first one below.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/template/${item.id}`)}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>{item.exercises.length} exercises</Text>
          </TouchableOpacity>
        )}
      />

      <Pressable
        style={styles.createButton}
        onPress={() => router.push("/create-template")}
      >
        <Text style={styles.createButtonText}>+ Create template</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", padding: 20, paddingTop: 60 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  title: { color: "white", fontSize: 28, fontWeight: "bold" },
  logout: { color: "#8a8a8e", fontSize: 14 },
  sectionTitle: { color: "#8a8a8e", fontSize: 13, marginBottom: 12, textTransform: "uppercase" },
  list: { gap: 10 },
  empty: { color: "#8a8a8e", fontSize: 15, textAlign: "center", marginTop: 40 },
  card: { backgroundColor: "#1c1c1e", borderRadius: 12, padding: 16 },
  cardTitle: { color: "white", fontSize: 17, fontWeight: "500", marginBottom: 4 },
  cardSub: { color: "#8a8a8e", fontSize: 13 },
  createButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
  },
  createButtonText: { color: "white", fontSize: 16, fontWeight: "500" },
});
