import { Alert, Platform } from "react-native";

// A yes/no question that works everywhere. On the web, Alert.alert with
// buttons does nothing, so it falls back to the browser's confirm dialog.
export function confirm(
  title: string,
  message: string,
  ok: string,
  opts: { cancel?: string; destructive?: boolean } = {}
): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: opts.cancel ?? "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: ok, style: opts.destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    )
  );
}
