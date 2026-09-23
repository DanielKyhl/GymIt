import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Info, X } from "lucide-react-native";
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
import { C, HIT } from "../constants/theme";
import { ExerciseRow, exerciseImageUrl, exercises, LETTERS, letterPositions, muscleList } from "../lib/exercises";
import {
  bestMatches,
  buildPickerRows,
  EQUIPMENT_GROUPS,
  EquipmentId,
  favouriteExercises,
  filterExercises,
  MUSCLE_GROUPS,
  MuscleGroupId,
  recentExercises,
} from "../lib/exerciseSearch";
import { getFavoriteExercises, getWorkouts, setFavoriteExercise } from "../lib/storage";
import { Exercise } from "../types/workout";
import { ExerciseInfo, StarButton } from "./ExerciseInfo";

// Fixed heights let FlatList skip measuring 1,500 rows while scrolling, and let
// the A-Z rail work out exactly where a letter starts.
const ROW_HEIGHT = 76;
const HEADER_HEIGHT = 30;
const RAIL_WIDTH = 24;

const heightOf = (row: ExerciseRow) => (row.type === "exercise" ? ROW_HEIGHT : HEADER_HEIGHT);

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
};

export function ExercisePicker({ visible, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroupId | null>(null);
  const [equipment, setEquipment] = useState<EquipmentId | null>(null);
  const [details, setDetails] = useState<Exercise | null>(null);
  const list = useRef<FlatList<ExerciseRow>>(null);

  // Starred names, kept live so a star fills the moment it's tapped.
  const [starred, setStarred] = useState<Set<string>>(new Set());
  // The pinned lists are taken once, as the picker opens: starring something
  // halfway down would otherwise shove the whole list down under your finger.
  // A new star joins Favourites the next time the picker opens.
  const [pinned, setPinned] = useState<{ recent: Exercise[]; favourites: Exercise[] }>({
    recent: [],
    favourites: [],
  });

  const rows = useMemo(() => {
    const filters = { query, muscle, equipment };
    const all = filterExercises(exercises, filters);
    return buildPickerRows(
      all,
      filterExercises(pinned.recent, filters),
      filterExercises(pinned.favourites, filters),
      bestMatches(all, query)
    );
  }, [query, muscle, equipment, pinned]);
  const positions = useMemo(() => letterPositions(rows), [rows]);

  // Every row's offset, so a jump to a letter lands exactly on its heading.
  const offsets = useMemo(() => {
    let y = 0;
    return rows.map((row) => {
      const at = y;
      y += heightOf(row);
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

  // The letter at the top of the list, which the rail highlights. Blank while
  // Recent or Favourites is at the top.
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

  // A new search or filter starts from the top, not wherever the last list
  // happened to be scrolled.
  useEffect(() => {
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [query, muscle, equipment]);

  // Reset on open rather than on close, so the list doesn't visibly snap back
  // while the modal is still fading out. Then load what's pinned.
  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setMuscle(null);
    setEquipment(null);
    setDetails(null);
    setActive("");
    let cancelled = false;
    Promise.all([getWorkouts(), getFavoriteExercises()])
      .then(([workouts, favourites]) => {
        if (cancelled) return;
        setStarred(new Set(favourites));
        setPinned({ recent: recentExercises(workouts), favourites: favouriteExercises(favourites) });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const flip = (set: Set<string>, name: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(name);
    else next.delete(name);
    return next;
  };

  const toggleStar = (name: string) => {
    const on = !starred.has(name);
    setStarred((prev) => flip(prev, name, on));
    Haptics.selectionAsync().catch(() => undefined);
    // Put the star back the way it was if it couldn't be saved.
    setFavoriteExercise(name, on).catch(() => setStarred((prev) => flip(prev, name, !on)));
  };

  const clearAll = () => {
    setQuery("");
    setMuscle(null);
    setEquipment(null);
  };

  const choose = (name: string) => {
    onSelect(name);
    onClose();
  };

  const filtered = query.trim() !== "" || muscle !== null || equipment !== null;

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
              placeholder="Search, e.g. db bench or rdl"
              placeholderTextColor={C.textFaint}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          <Chips options={MUSCLE_GROUPS} value={muscle} onChange={setMuscle} />
          <Chips options={EQUIPMENT_GROUPS} value={equipment} onChange={setEquipment} />

          <View style={styles.listWrap}>
            <FlatList
              ref={list}
              style={styles.list}
              data={rows}
              extraData={starred}
              keyExtractor={(item) =>
                item.type === "section"
                  ? `section:${item.title}`
                  : item.type === "header"
                    ? `letter:${item.letter}`
                    : `${item.pinned ?? "all"}:${item.exercise.id}`
              }
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              windowSize={7}
              removeClippedSubviews
              scrollEventThrottle={32}
              onScroll={(e) => onScroll(e.nativeEvent.contentOffset.y)}
              getItemLayout={(_, index) => ({
                length: rows[index] ? heightOf(rows[index]) : ROW_HEIGHT,
                offset: offsets[index] ?? 0,
                index,
              })}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.empty}>
                    {query.trim() ? `Nothing matches “${query.trim()}”` : "Nothing matches"}
                    {muscle || equipment ? " with these filters." : "."}
                  </Text>
                  {filtered && (
                    <Pressable style={styles.clearBtn} onPress={clearAll}>
                      <Text style={styles.clearText}>Clear search and filters</Text>
                    </Pressable>
                  )}
                </View>
              }
              renderItem={({ item }) => {
                if (item.type === "section" || item.type === "header") {
                  return (
                    <View style={styles.letterRow}>
                      <Text style={styles.letterText}>
                        {item.type === "section" ? item.title.toUpperCase() : item.letter}
                      </Text>
                    </View>
                  );
                }
                const exercise = item.exercise;
                const isStarred = starred.has(exercise.name);
                return (
                  <Pressable style={styles.row} onPress={() => choose(exercise.name)}>
                    <Thumb exercise={exercise} />
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {exercise.name}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {muscleList(exercise.primaryMuscles)}
                        {exercise.equipment ? ` · ${exercise.equipment}` : ""}
                      </Text>
                    </View>
                    <View style={styles.rowActions}>
                      <StarButton name={exercise.name} on={isStarred} onToggle={toggleStar} />
                      <Pressable
                        style={styles.iconBtn}
                        hitSlop={6}
                        onPress={() => setDetails(exercise)}
                        accessibilityRole="button"
                        accessibilityLabel={`About ${exercise.name}`}
                      >
                        <Info size={20} color={C.textMuted} />
                      </Pressable>
                    </View>
                  </Pressable>
                );
              }}
            />
            <AlphabetRail active={active} has={positions} onPick={jumpTo} />
          </View>
        </View>
      </View>

      <ExerciseInfo
        exercise={details}
        starred={details ? starred.has(details.name) : false}
        onToggleStar={toggleStar}
        onClose={() => setDetails(null)}
        onAdd={choose}
      />
    </Modal>
  );
}

// One row of filter chips. Tapping the selected chip again clears it.
function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.chipsScroll}
      contentContainerStyle={styles.chips}
    >
      {options.map((option) => {
        const on = option.id === value;
        return (
          <Pressable
            key={option.id}
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => onChange(on ? null : option.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
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

// Small square picture, with the exercise's initial as a fallback. The
// animation is held on its first frame here: dozens of them playing in a
// scrolling list would chew through battery for no benefit.
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
      autoplay={false}
    />
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

  searchWrap: { padding: 12, paddingBottom: 4 },
  search: {
    backgroundColor: C.raised,
    color: C.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 15,
  },

  chipsScroll: { flexGrow: 0 },
  chips: { paddingHorizontal: 12, paddingVertical: 4, gap: 6 },
  chip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: C.raised,
    justifyContent: "center",
  },
  chipOn: { backgroundColor: C.accent },
  chipText: { color: C.textSoft, fontSize: 13, fontWeight: "500" },
  chipTextOn: { color: C.onAccent, fontWeight: "600" },

  listWrap: { flex: 1, flexDirection: "row", marginTop: 6 },
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
  rowActions: { flexDirection: "row" },
  iconBtn: { width: 32, height: 44, alignItems: "center", justifyContent: "center" },
  emptyWrap: { alignItems: "center", marginTop: 24, paddingHorizontal: 16, gap: 12 },
  empty: { color: C.textMuted, fontSize: 15, textAlign: "center" },
  clearBtn: { backgroundColor: C.raised, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  clearText: { color: C.accent, fontSize: 14, fontWeight: "500" },


});
