import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { C, HIT, R } from "../constants/theme";

// Shared building blocks for the welcome, log-in and sign-up screens, so all
// three look like one product.

export function AuthScreen({ children, back }: { children: ReactNode; back?: boolean }) {
  const router = useRouter();
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {back && (
          <Pressable
            style={styles.back}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/welcome"))}
            hitSlop={HIT}
            accessibilityLabel="Back"
          >
            <ChevronLeft size={26} color={C.text} />
          </Pressable>
        )}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

export function Field({ label, hint, ...input }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={C.textFaint} {...input} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.primary, pressed && styles.pressed, disabled && styles.disabled]}
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled }}
    >
      {busy ? <ActivityIndicator color={C.onAccent} /> : <Text style={styles.primaryText}>{label}</Text>}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function FormMessage({ error, info }: { error?: string; info?: string }) {
  if (error) return <Text style={styles.error}>{error}</Text>;
  if (info) return <Text style={styles.info}>{info}</Text>;
  return null;
}

export function SwitchLink({ prompt, action, onPress }: { prompt: string; action: string; onPress: () => void }) {
  return (
    <Pressable style={styles.switch} onPress={onPress} hitSlop={HIT}>
      <Text style={styles.switchText}>
        {prompt} <Text style={styles.switchAction}>{action}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1, padding: 24, paddingTop: 64, paddingBottom: 40 },
  back: { position: "absolute", top: 20, left: 16, zIndex: 1, padding: 4 },
  heading: { marginBottom: 28 },
  title: { color: C.text, fontSize: 30, fontWeight: "700" },
  subtitle: { color: C.textMuted, fontSize: 15, marginTop: 6, lineHeight: 21 },
  field: { marginBottom: 16 },
  label: { color: C.textSoft, fontSize: 13, fontWeight: "500", marginBottom: 6 },
  input: {
    backgroundColor: C.card,
    color: C.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: C.raised,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  hint: { color: C.textFaint, fontSize: 12, marginTop: 6 },
  disabled: { opacity: 0.4 },
  primary: {
    backgroundColor: C.accent,
    borderRadius: R.md,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  primaryText: { color: C.onAccent, fontSize: 16, fontWeight: "600" },
  secondary: {
    borderWidth: 1,
    borderColor: C.raised,
    borderRadius: R.md,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 54,
  },
  secondaryText: { color: C.text, fontSize: 16, fontWeight: "500" },
  pressed: { opacity: 0.85 },
  error: { color: C.danger, fontSize: 14, marginBottom: 14, lineHeight: 20 },
  info: { color: C.success, fontSize: 14, marginBottom: 14, lineHeight: 20 },
  switch: { alignItems: "center", marginTop: 20 },
  switchText: { color: C.textMuted, fontSize: 14 },
  switchAction: { color: C.accent, fontWeight: "600" },
});
