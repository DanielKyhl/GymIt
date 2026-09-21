import * as Haptics from "expo-haptics";
import { Circle, CircleCheck } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { C, HIT } from "../constants/theme";

type Props = {
  done: boolean;
  onToggle: () => void; // returns nothing; the parent decides what "done" means
};

// The set-done circle. Ticking a set gives a small press-and-spring and a
// light tap of vibration, so it feels registered even mid-set.
export function CheckButton({ done, onToggle }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const press = () => {
    if (!done) {
      scale.value = withSequence(withTiming(0.7, { duration: 70 }), withSpring(1, { damping: 8, stiffness: 260 }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    onToggle();
  };

  return (
    <Pressable
      style={styles.col}
      onPress={press}
      hitSlop={HIT}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={done ? "Mark set not done" : "Mark set done"}
    >
      <Animated.View style={animated}>
        {done ? <CircleCheck size={26} color={C.success} /> : <Circle size={26} color={C.textFaint} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  col: { width: 36, alignItems: "center", justifyContent: "center" },
});
