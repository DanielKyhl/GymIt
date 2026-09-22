import { ChevronDown, Trash2 } from "lucide-react-native";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, R } from "../constants/theme";
import { SET_TYPES } from "../lib/activeWorkout";
import { SetType } from "../types/workout";
import { Anchor, measureAnchor, MenuItem } from "./DropdownMenu";

export const SET_TYPE_COLOR: Record<SetType, string> = {
  normal: C.textSoft,
  warmup: C.warning,
  drop: C.signal,
  failure: C.danger,
};

type Props = {
  type?: SetType;
  number: number; // working-set number; warm-ups show "W" instead
  onOpen: (anchor: Anchor) => void;
};

// The set number at the start of a row. It's a button: tapping it opens the
// set menu (see setTypeItems), and the small arrow says so.
export function SetBadge({ type = "normal", number, onOpen }: Props) {
  const ref = useRef<View>(null);
  const info = SET_TYPES.find((t) => t.type === type) ?? SET_TYPES[0];
  return (
    <Pressable
      ref={ref}
      style={({ pressed }) => [styles.badge, pressed && styles.pressed]}
      onPress={() => measureAnchor(ref.current, onOpen)}
      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      accessibilityRole="button"
      accessibilityLabel={`${type === "normal" ? `Set ${number}` : info.name}. Change set type`}
    >
      <Text style={[styles.text, { color: SET_TYPE_COLOR[type] }]}>{info.letter || number}</Text>
      <ChevronDown size={10} color={C.textFaint} strokeWidth={2.5} />
    </Pressable>
  );
}

// The set menu: pick a type (each explained), or remove the set.
export function setTypeItems(
  current: SetType | undefined,
  numberIfWorking: number,
  onPick: (type: SetType) => void,
  onRemove?: () => void
): MenuItem[] {
  const items: MenuItem[] = SET_TYPES.map((t) => ({
    key: t.type,
    badge: t.letter || String(numberIfWorking),
    badgeColor: SET_TYPE_COLOR[t.type],
    label: t.name,
    detail: t.detail,
    selected: (current ?? "normal") === t.type,
    onPress: () => onPick(t.type),
  }));
  if (onRemove) {
    items.push({
      key: "remove",
      label: "Remove set",
      danger: true,
      icon: <Trash2 size={18} color={C.danger} />,
      onPress: onRemove,
    });
  }
  return items;
}

const styles = StyleSheet.create({
  badge: {
    width: 38,
    height: 34,
    borderRadius: R.sm,
    backgroundColor: C.raised,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  pressed: { backgroundColor: C.selected },
  text: { fontSize: 15, fontWeight: "700" },
});
