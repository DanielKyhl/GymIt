import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  GestureResponderEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ExerciseRow,
  exerciseImageUrl,
  LETTERS,
  letterPositions,
  muscleList,
  searchExercises,
  withLetterHeaders,
} from "../lib/exercises";
import { Exercise } from "../types/workout";
import { C, HIT } from "../constants/theme";
import { X } from "lucide-react-native";

// Fixed heights let FlatList skip measuring 873 rows while scrolling, and let
// the A-Z rail work out exactly where a letter starts.
const ROW_HEIGHT = 76;
const HEADER_HEIGHT = 30;
const RAIL_WIDTH = 24;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
};

export function ExercisePicker({ visible, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [details, setDetails] = useState<Exercise | null>(null);
  const list = useRef<FlatList<ExerciseRow>>(null);

  const rows = useMemo(() => withLetterHeaders(searchExercises(query)), [query]);
  const positions = useMemo(() => letterPositions(rows), [rows]);

  // Every row's offset, so a jump to a letter lands exactly on its heading.
  const offsets = useMemo(() => {
    let y = 0;
    return rows.map((row) => {
      const at = y;
      y += row.type === "header" ? HEADER_HEIGHT : ROW_HEIGHT;
      return at;
    });
  }, [rows]);

  const jumpTo = useCallback(
    (letter: string) => {
      const index = positions[letter];
      if (index === undefined) return;
      list.current?.scrollToOffset({ offset: offsets[index], animated: false });
    },
    [positions, offsets]
  );

  // The letter at the top of the list, which the rail highlights.
  const [active, setActive] = useState("");
  const onScroll = useCallback(
    (y: number) => {
      let letter = "";
      for (let i = 0; i < rows.length; i++) {
        if (offsets[i] > y + 1) break;
        const row = rows[i];
        if (row.type === "header") letter = row.letter;
      }
      setActive((prev) => (prev === letter ? prev : letter));
    },
    [rows, offsets]
  );

  // Reset on open rather than on close, so the list doesn't visibly snap back
  // to all 873 exercises while the modal is still fading out.
  useEffect(() => {
    if (visible) {
      setQuery("");
      setDetails(null);
      setActive("");
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
            <Pressable onPress={onClose} hitSlop={HIT} accessibilityLabel="Close">
              <X size={22} color={C.textMuted} />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <TextInput
              style={styles.search}
              placeholder="Search exercises"
              placeholderTextColor={C.textFaint}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          </View>

          <View style={styles.listWrap}>
            <FlatList
              ref={list}
              style={styles.list}
              data={rows}
              keyExtractor={(item) => (item.type === "header" ? `#${item.letter}` : item.exercise.id)}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              windowSize={7}
              removeClippedSubviews
              scrollEventThrottle={32}
              onScroll={(e) => onScroll(e.nativeEvent.contentOffset.y)}
              getItemLayout={(_, index) => ({
                length: rows[index]?.type === "header" ? HEADER_HEIGHT : ROW_HEIGHT,
                offset: offsets[index] ?? 0,
                index,
              })}
              ListEmptyComponent={
                <Text style={styles.empty}>No exercises match “{query}”.</Text>
              }
              renderItem={({ item }) =>
                item.type === "header" ? (
                  <View style={styles.letterRow}>
                    <Text style={styles.letterText}>{item.letter}</Text>
                  </View>
                ) : (
                  <Pressable style={styles.row} onPress={() => choose(item.exercise.name)}>
                    <Thumb exercise={item.exercise} />
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {item.exercise.name}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {muscleList(item.exercise.primaryMuscles)}
                        {item.exercise.equipment ? ` · ${item.exercise.equipment}` : ""}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.detailsBtn}
                      hitSlop={8}
                      onPress={() => setDetails(item.exercise)}
                    >
                      <Text style={styles.detailsText}>Details</Text>
                    </Pressable>
                  </Pressable>
                )
              }
            />
            <AlphabetRail active={active} has={positions} onPick={jumpTo} />
          </View>
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

// The A-Z strip down the right edge. Tap a letter or slide down it, the way
// Contacts works; letters with nothing under them are dimmed and do nothing.
function AlphabetRail({
  active,
  has,
  onPick,
}: {
  active: string;
  has: Record<string, number>;
  onPick: (letter: string) => void;
}) {
  const rail = useRef<View>(null);
  const box = useRef({ top: 0, height: 0 });
  const last = useRef("");

  // Where the rail sits on screen. A drag's locationY is relative to whichever
  // letter the finger is over, so the maths uses pageY against this instead.
  const measure = () =>
    rail.current?.measureInWindow((_x, top, _w, height) => {
      box.current = { top, height };
    });

  const pickAt = (e: GestureResponderEvent) => {
    const { top, height } = box.current;
    if (!height) return;
    const i = Math.floor(((e.nativeEvent.pageY - top) / height) * LETTERS.length);
    const letter = LETTERS[Math.min(LETTERS.length - 1, Math.max(0, i))];
    // Only when the finger crosses into a new letter, so a slide doesn't fire
    // dozens of jumps and buzzes on the way past.
    if (letter === last.current || has[letter] === undefined) return;
    last.current = letter;
    onPick(letter);
    Haptics.selectionAsync().catch(() => undefined);
  };

  // A tap is handled by each letter's own Pressable, which works the same on
  // web as on a phone; the container only takes over once a finger moves, so
  // sliding down the rail scrubs through the letters.
  return (
    <View
      ref={rail}
      style={styles.rail}
      onLayout={measure}
      onStartShouldSetResponder={() => false}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        measure(); // the panel may have moved since layout, e.g. for the keyboard
        pickAt(e);
      }}
      onResponderMove={pickAt}
      onResponderRelease={() => {
        last.current = "";
      }}
    >
      {LETTERS.map((letter) => (
        <Pressable
          key={letter}
          onPress={() => has[letter] !== undefined && onPick(letter)}
          hitSlop={{ left: 8, right: 8, top: 2, bottom: 2 }}
          accessibilityRole="button"
          accessibilityLabel={`Jump to ${letter}`}
        >
          <Text
            style={[
              styles.railLetter,
              has[letter] === undefined && styles.railLetterOff,
              letter === active && styles.railLetterOn,
            ]}
          >
            {letter}
          </Text>
        </Pressable>
      ))}
    </View>
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
            <Pressable onPress={onClose} hitSlop={HIT} accessibilityLabel="Close">
              <X size={22} color={C.textMuted} />
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
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.raised,
    overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.raised,
    gap: 12,
  },
  panelTitle: { color: C.text, fontSize: 17, fontWeight: "600", flex: 1 },

  searchWrap: { padding: 12, paddingBottom: 8 },
  search: {
    backgroundColor: C.raised,
    color: C.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 15,
  },

  listWrap: { flex: 1, flexDirection: "row" },
  list: { flex: 1 },

  letterRow: {
    height: HEADER_HEIGHT,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 5,
    backgroundColor: C.bg,
  },
  letterText: { color: C.textFaint, fontSize: 12, fontWeight: "700", letterSpacing: 1.2 },

  rail: {
    width: RAIL_WIDTH,
    paddingVertical: 8,
    justifyContent: "space-between",
    alignItems: "center",
  },
  railLetter: { color: C.textMuted, fontSize: 10, lineHeight: 12, fontWeight: "600" },
  railLetterOff: { color: C.raised },
  railLetterOn: { color: C.accent, fontWeight: "800" },

  row: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.raised,
  },
  thumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: C.raised },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  thumbLetter: { color: C.textFaint, fontSize: 20, fontWeight: "600" },
  rowText: { flex: 1 },
  rowName: { color: C.text, fontSize: 15, fontWeight: "500" },
  rowMeta: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 3,
    textTransform: "capitalize",
  },
  detailsBtn: {
    backgroundColor: C.raised,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  detailsText: { color: C.accent, fontSize: 13 },
  empty: {
    color: C.textMuted,
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
    backgroundColor: C.raised,
    marginBottom: 10,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  tag: {
    backgroundColor: C.raised,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagText: { color: C.textSoft, fontSize: 12, textTransform: "capitalize" },
  sectionLabel: {
    color: C.textFaint,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 4,
  },
  body: { color: C.text, fontSize: 15, textTransform: "capitalize" },
  step: { flexDirection: "row", gap: 10, marginBottom: 10 },
  stepNum: { color: C.textFaint, fontSize: 13, width: 16, marginTop: 2 },
  stepText: { color: C.textSoft, fontSize: 14, lineHeight: 20, flex: 1 },

  addBtn: {
    backgroundColor: C.accent,
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  addBtnText: { color: C.onAccent, fontSize: 15, fontWeight: "600" },
});
