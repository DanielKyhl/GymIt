import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect } from "react";
import { Platform } from "react-native";

const TAG = "workout";

type Sentinel = { release: () => Promise<void> };
type WakeLock = { request: (type: "screen") => Promise<Sentinel> };

// Stops the screen dimming and locking while the screen using this is open:
// a workout, where you want to glance at the next set or the rest timer
// without unlocking the phone. Failing to get the lock (an older browser,
// low battery mode) just means the screen behaves as normal.
export function useKeepScreenOn(): void {
  useEffect(() => {
    if (Platform.OS !== "web") {
      activateKeepAwakeAsync(TAG).catch(() => undefined);
      return () => {
        deactivateKeepAwake(TAG).catch(() => undefined);
      };
    }

    // The browser drops the lock whenever the page is hidden (locking the
    // phone, switching to another app), so ask again each time it's back in
    // front.
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLock }).wakeLock;
    if (!wakeLock) return;
    let open = true;
    let sentinel: Sentinel | null = null;
    const request = () => {
      if (!open || document.visibilityState !== "visible") return;
      wakeLock
        .request("screen")
        .then((s) => {
          if (open) sentinel = s;
          else s.release().catch(() => undefined);
        })
        .catch(() => undefined);
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      open = false;
      document.removeEventListener("visibilitychange", request);
      sentinel?.release().catch(() => undefined);
    };
  }, []);
}
