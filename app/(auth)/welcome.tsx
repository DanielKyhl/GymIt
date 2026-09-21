import { useRouter } from "expo-router";
import { Dumbbell } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton, SecondaryButton } from "../../components/AuthUI";
import { C, FONT } from "../../constants/theme";

export default function Welcome() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <Dumbbell size={34} color={C.accent} />
        </View>
        <Text style={styles.wordmark}>GymIt</Text>
        <Text style={styles.tagline}>Log every set. Watch yourself get stronger.</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Create account" onPress={() => router.push("/signup")} />
        <SecondaryButton label="Log in" onPress={() => router.push("/login")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, padding: 24, paddingBottom: 48 },
  brand: { flex: 1, justifyContent: "center", alignItems: "center" },
  mark: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    borderColor: C.raised,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  wordmark: { fontFamily: FONT.numBold, fontSize: 64, color: C.text, letterSpacing: 1 },
  tagline: { color: C.textMuted, fontSize: 16, textAlign: "center", marginTop: 8, maxWidth: 280, lineHeight: 22 },
  actions: { gap: 12 },
});
