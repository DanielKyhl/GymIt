import { Check } from "lucide-react-native";
import { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { C, R } from "../constants/theme";

// Where on screen the button that opened the menu is.
export type Anchor = { x: number; y: number; width: number; height: number };

export type MenuItem = {
  key: string;
  label: string;
  detail?: string; // a short explanation under the label
  badge?: string; // e.g. "W", shown in a small square on the left
  badgeColor?: string;
  icon?: ReactNode;
  selected?: boolean;
  danger?: boolean;
  onPress: () => void;
};

// Reads where a view is on screen, so a menu can open right next to it.
export function measureAnchor(view: View | null, then: (anchor: Anchor) => void) {
  view?.measureInWindow((x, y, width, height) => then({ x, y, width, height }));
}

type Props = {
  anchor: Anchor | null; // null = closed
  title?: string;
  items: MenuItem[];
  onClose: () => void;
  align?: "left" | "right"; // which edge of the button the menu lines up with
  width?: number;
};

// A menu that drops down from the button that opened it (or up, when
// there's no room below). Tapping outside closes it.
export function DropdownMenu({ anchor, title, items, onClose, align = "left", width = 280 }: Props) {
  const win = useWindowDimensions();
  const w = Math.min(width, win.width - 32);

  let position = {};
  let maxHeight = win.height - 48;
  if (anchor) {
    const x = align === "right" ? anchor.x + anchor.width - w : anchor.x;
    const left = Math.min(Math.max(16, x), win.width - w - 16);
    const below = anchor.y + anchor.height + 6;
    const roomBelow = win.height - below - 24;
    const roomAbove = anchor.y - 6 - 24;
    const needed = items.some((i) => i.detail) ? items.length * 60 : items.length * 46;
    if (roomBelow >= Math.min(needed, 280) || roomBelow >= roomAbove) {
      position = { left, top: below };
      maxHeight = roomBelow;
    } else {
      position = { left, bottom: win.height - anchor.y + 6 };
      maxHeight = roomAbove;
    }
  }

  return (
    <Modal visible={anchor !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
      {anchor && (
        <View style={[styles.menu, { width: w, maxHeight }, position]}>
          <ScrollView bounces={false}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {items.map((item) => (
              <Pressable
                key={item.key}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: item.selected }}
              >
                {item.badge !== undefined && (
                  <View style={styles.badge}>
                    <Text style={[styles.badgeText, item.badgeColor ? { color: item.badgeColor } : null]}>
                      {item.badge}
                    </Text>
                  </View>
                )}
                {item.icon}
                <View style={styles.text}>
                  <Text style={[styles.label, item.danger && styles.danger]}>{item.label}</Text>
                  {item.detail ? <Text style={styles.detail}>{item.detail}</Text> : null}
                </View>
                {item.selected && <Check size={18} color={C.accent} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.35)" },
  menu: {
    position: "absolute",
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.selected,
    paddingVertical: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: {
    color: C.textFaint, fontSize: 12, fontWeight: "600", textTransform: "uppercase",
    letterSpacing: 0.5, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 4,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11, minHeight: 46 },
  pressed: { backgroundColor: C.raised },
  badge: { width: 28, height: 28, borderRadius: R.sm, backgroundColor: C.raised, alignItems: "center", justifyContent: "center" },
  badgeText: { color: C.textSoft, fontSize: 14, fontWeight: "700" },
  text: { flex: 1 },
  label: { color: C.text, fontSize: 15, fontWeight: "500" },
  detail: { color: C.textMuted, fontSize: 12, lineHeight: 16, marginTop: 2 },
  danger: { color: C.danger },
});
