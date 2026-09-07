import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { VolumeChart } from "../../components/VolumeChart";
import { plural } from "../../lib/format";
import { getWorkouts } from "../../lib/storage";
import { ExerciseSummary, getTrainedExercises, getVolumeByTemplate } from "../../lib/stats";

export default function Progress() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [byTemplate, setByTemplate] = useState<
    { name: string; points: { date: string; volume: number }[] }[]
  >([]);
  const [showVolume, setShowVolume] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then((workouts) => {
        setExercises(getTrainedExercises(workouts));
        setByTemplate(getVolumeByTemplate(workouts));
      });
    }, [])
  );

  // panel is inset 20 each side, and its content adds 16 padding
  const chartWidth = width - 40 - 32;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progress</Text>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Pressable style={styles.volumeLink} onPress={() => setShowVolume(true)}>
              <Text style={styles.volumeLinkText}>Volume per template</Text>
              <Text style={styles.volumeChevron}>›</Text>
            </Pressable>
            <Text style={styles.section}>Exercises</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Log some sets in a workout and your progress shows up here.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: "/exercise-progress/[name]", params: { name: item.name } })}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>
              Best {item.bestWeight} · est. 1RM {item.best1RM} · {plural(item.sessionCount, "session")}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={showVolume}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVolume(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Volume per template</Text>
              <Pressable onPress={() => setShowVolume(false)} hitSlop={12}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.panelContent}>
              {byTemplate.length === 0 ? (
                <Text style={styles.empty}>Finish a workout to see your volume trend.</Text>
              ) : (
                byTemplate.map((g) => (
                  <View key={g.name} style={styles.templateSection}>
                    <Text style={styles.templateName}>{g.name}</Text>
                    <Text style={styles.templateMeta}>{plural(g.points.length, "workout")}</Text>
                    <VolumeChart data={g.points.slice(-8)} width={chartWidth} />
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#131313", padding: 20, paddingTop: 60 },
  title: { color: "#F2F0EC", fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  section: { color: "#8C8A86", fontSize: 13, textTransform: "uppercase", marginBottom: 12, marginTop: 20 },
  volumeLink: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#1C1C1C", borderRadius: 12, padding: 16,
  },
  volumeLinkText: { color: "#F2F0EC", fontSize: 15, fontWeight: "500" },
  volumeChevron: { color: "#8C8A86", fontSize: 20 },
  list: { gap: 10 },
  empty: { color: "#8C8A86", fontSize: 15, textAlign: "center", marginTop: 20 },
  card: { backgroundColor: "#1C1C1C", borderRadius: 12, padding: 16 },
  cardTitle: { color: "#F2F0EC", fontSize: 16, fontWeight: "500", marginBottom: 4 },
  cardSub: { color: "#8C8A86", fontSize: 13 },

  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center", alignItems: "center", padding: 20,
  },
  panel: {
    width: "100%", maxHeight: "80%", backgroundColor: "#1C1C1C",
    borderRadius: 20, borderWidth: 1, borderColor: "#272727", overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#272727",
  },
  panelTitle: { color: "#F2F0EC", fontSize: 17, fontWeight: "600" },
  close: { color: "#8C8A86", fontSize: 18 },
  panelContent: { padding: 16, paddingBottom: 24 },
  templateSection: { marginBottom: 24 },
  templateName: { color: "#F2F0EC", fontSize: 16, fontWeight: "500" },
  templateMeta: { color: "#8C8A86", fontSize: 12, marginBottom: 4 },
});
