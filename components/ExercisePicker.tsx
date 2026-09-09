import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { exerciseImageUrl, muscleList, searchExercises } from "../lib/exercises";
import { Exercise } from "../types/workout";

// Fixed row height lets FlatList skip measuring 873 rows while scrolling.
const ROW_HEIGHT = 76;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
};

export function ExercisePicker({ visible, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [details, setDetails] = useState<Exercise | null>(null);

  const results = useMemo(() => searchExercises(query), [query]);

  // Reset on open rather than on close, so the list doesn't visibly snap back
  // to all 873 exercises while the modal is still fading out.
  useEffect(() => {
    if (visible) {
      setQuery("");
      setDetails(null);
    }
  }, [visible]);

  const choose = (name: string) => {
    onSelect(name);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Add exercise</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <TextInput
              style={styles.search}
              placeholder="Search exercises"
              placeholderTextColor="#6E6C68"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={12}
            windowSize={7}
            removeClippedSubviews
            getItemLayout={(_, index) => ({
              length: ROW_HEIGHT,
              offset: ROW_HEIGHT * index,
              index,
            })}
            ListEmptyComponent={
              <Text style={styles.empty}>No exercises match “{query}”.</Text>
            }
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => choose(item.name)}>
                <Thumb exercise={item} />
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {muscleList(item.primaryMuscles)}
                    {item.equipment ? ` · ${item.equipment}` : ""}
                  </Text>
                </View>
                <Pressable
                  style={styles.detailsBtn}
                  hitSlop={8}
                  onPress={() => setDetails(item)}
                >
                  <Text style={styles.detailsText}>Details</Text>
                </Pressable>
              </Pressable>
            )}
          />
        </View>
      </View>

      <ExerciseDetails
        exercise={details}
        onClose={() => setDetails(null)}
        onAdd={choose}
      />
    </Modal>
  );
}

// Small square photo, with the exercise's initial as a fallback.
function Thumb({ exercise }: { exercise: Exercise }) {
  const url = exerciseImageUrl(exercise);
  if (!url) {
    return (
      <View style={[styles.thumb, styles.thumbFallback]}>
        <Text style={styles.thumbLetter}>{exercise.name[0]}</Text>
      </View>
    );
  }
  return (
    <Image
      source={url}
      style={styles.thumb}
      contentFit="cover"
      transition={120}
      cachePolicy="disk"
    />
  );
}

function ExerciseDetails({
  exercise,
  onClose,
  onAdd,
}: {
  exercise: Exercise | null;
  onClose: () => void;
  onAdd: (name: string) => void;
}) {
  if (!exercise) return null;

  const start = exerciseImageUrl(exercise, 0);
  const finish = exerciseImageUrl(exercise, 1);
  const tags = [exercise.equipment, exercise.level, exercise.mechanic].filter(
    (t): t is string => Boolean(t)
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle} numberOfLines={1}>
              {exercise.name}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.detailsContent}>
            {start && (
              <Image
                source={start}
                style={styles.bigImage}
                contentFit="cover"
                transition={150}
                cachePolicy="disk"
              />
            )}
            {finish && (
              <Image
                source={finish}
                style={styles.bigImage}
                contentFit="cover"
                transition={150}
                cachePolicy="disk"
              />
            )}

            {tags.length > 0 && (
              <View style={styles.tagRow}>
                {tags.map((t) => (
                  <View key={t} style={styles.tag}>
                    <Text style={styles.tagText}>{t}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>Muscles worked</Text>
            <Text style={styles.body}>
              {muscleList(exercise.primaryMuscles) || "—"}
            </Text>
            {exercise.secondaryMuscles.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Also works</Text>
                <Text style={styles.body}>
                  {muscleList(exercise.secondaryMuscles)}
                </Text>
              </>
            )}

            {exercise.instructions.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>How to do it</Text>
                {exercise.instructions.map((step, i) => (
                  <View key={i} style={styles.step}>
                    <Text style={styles.stepNum}>{i + 1}</Text>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          <Pressable style={styles.addBtn} onPress={() => onAdd(exercise.name)}>
            <Text style={styles.addBtnText}>Add exercise</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  panel: {
    width: "100%",
    maxHeight: "85%",
    flexShrink: 1,
    backgroundColor: "#1C1C1C",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#272727",
    overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#272727",
    gap: 12,
  },
  panelTitle: { color: "#F2F0EC", fontSize: 17, fontWeight: "600", flex: 1 },
  close: { color: "#8C8A86", fontSize: 18 },

  searchWrap: { padding: 12, paddingBottom: 8 },
  search: {
    backgroundColor: "#272727",
    color: "#F2F0EC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 15,
  },

  row: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#272727",
  },
  thumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: "#272727" },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  thumbLetter: { color: "#6E6C68", fontSize: 20, fontWeight: "600" },
  rowText: { flex: 1 },
  rowName: { color: "#F2F0EC", fontSize: 15, fontWeight: "500" },
  rowMeta: {
    color: "#8C8A86",
    fontSize: 12,
    marginTop: 3,
    textTransform: "capitalize",
  },
  detailsBtn: {
    backgroundColor: "#272727",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  detailsText: { color: "#D9D5CE", fontSize: 13 },
  empty: {
    color: "#8C8A86",
    fontSize: 15,
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 16,
  },

  detailsContent: { padding: 16, paddingBottom: 8, gap: 4 },
  bigImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: "#272727",
    marginBottom: 10,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  tag: {
    backgroundColor: "#272727",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagText: { color: "#B5B1AA", fontSize: 12, textTransform: "capitalize" },
  sectionLabel: {
    color: "#6E6C68",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 4,
  },
  body: { color: "#F2F0EC", fontSize: 15, textTransform: "capitalize" },
  step: { flexDirection: "row", gap: 10, marginBottom: 10 },
  stepNum: { color: "#6E6C68", fontSize: 13, width: 16, marginTop: 2 },
  stepText: { color: "#B5B1AA", fontSize: 14, lineHeight: 20, flex: 1 },

  addBtn: {
    backgroundColor: "#D9D5CE",
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  addBtnText: { color: "#171614", fontSize: 15, fontWeight: "600" },
});
