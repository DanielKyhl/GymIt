import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { C, HIT, R } from "../constants/theme";
import { finishTips, getPendingTips } from "../lib/storage";
import { placeTip, Rect, Tip, TIPS, TipTour } from "../lib/tips";

// The welcome tips (lib/tips.ts): the app dimmed, with one thing lit up and
// a short note pointing at it. A screen marks what a tip points at with
// useTipTarget, and asks for its set with useShowTips once it's ready; a set
// shows only if this account still has it to see, and only one at a time.

type Tips = {
  register: (id: string, node: View | null) => void;
  show: (tour: TipTour) => () => void;
};

const TipsContext = createContext<Tips | null>(null);

// A ref for what a tip points at.
export function useTipTarget(id: string): (node: View | null) => void {
  const register = useContext(TipsContext)?.register;
  return useCallback((node: View | null) => register?.(id, node), [register, id]);
}

// Asks for a set of tips; what it returns calls them off if they haven't
// come up yet (an effect's cleanup, for when the screen's no longer ready).
export function useShowTips(): (tour: TipTour) => () => void {
  const show = useContext(TipsContext)?.show;
  return useCallback((tour: TipTour) => (show ? show(tour) : () => undefined), [show]);
}

const PAD = 6; // round what's lit up
const SIDE = 16; // the tip's distance from the screen's edges
const GAP = 14; // between what's lit up and the tip
const CORNER = 28; // the arrow stays this far in from the tip's ends
const SETTLE_MS = 700; // for the screen to finish loading (or sliding up) first

type Running = { tour: TipTour; steps: Tip[]; index: number };

export function TipsProvider({ children }: { children: ReactNode }) {
  const targets = useRef(new Map<string, View>());
  const busy = useRef(false); // a set is showing, or about to
  const [running, setRunning] = useState<Running | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const screen = useWindowDimensions();

  const register = useCallback((id: string, node: View | null) => {
    if (node) targets.current.set(id, node);
    else targets.current.delete(id);
  }, []);

  const show = useCallback((tour: TipTour) => {
    if (busy.current) return () => undefined;
    busy.current = true;
    let state: "waiting" | "called off" | "showing" = "waiting";
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      state = "called off";
      busy.current = false;
    };
    getPendingTips()
      .then((pending) => {
        if (state !== "waiting") return;
        if (!pending.includes(tour)) return stop();
        timer = setTimeout(() => {
          // Only the tips whose thing is on screen (no plan, no "Up next").
          const steps = TIPS[tour].filter((t) => targets.current.has(t.target));
          if (steps.length === 0) return stop();
          state = "showing";
          setRunning({ tour, steps, index: 0 });
        }, SETTLE_MS);
      })
      .catch(stop);
    return () => {
      if (state !== "waiting") return;
      clearTimeout(timer);
      stop();
    };
  }, []);

  const finish = useCallback((done: TipTour | "all") => {
    setRunning(null);
    setRect(null);
    busy.current = false;
    finishTips(done).catch(() => undefined);
  }, []);

  const next = useCallback(() => {
    if (!running) return;
    setRect(null);
    if (running.index + 1 < running.steps.length) setRunning({ ...running, index: running.index + 1 });
    else finish(running.tour);
  }, [running, finish]);

  // Where the current tip's thing is on screen (again if the screen turns).
  useEffect(() => {
    if (!running) return;
    const tip = running.steps[running.index];
    const timer = setTimeout(() => {
      const node = targets.current.get(tip.target);
      if (!node) return next();
      node.measureInWindow((x, y, width, height) => (width > 0 && height > 0 ? setRect({ x, y, width, height }) : next()));
    }, 60);
    return () => clearTimeout(timer);
  }, [running, next, screen.width, screen.height]);

  const value = useMemo(() => ({ register, show }), [register, show]);
  return (
    <TipsContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {running && rect && (
          <Spotlight
            key={`${running.tour}-${running.index}`}
            rect={rect}
            tip={running.steps[running.index]}
            step={running.index + 1}
            count={running.steps.length}
            onNext={next}
            onSkip={() => finish("all")}
          />
        )}
      </View>
    </TipsContext.Provider>
  );
}

function Spotlight({
  rect,
  tip,
  step,
  count,
  onNext,
  onSkip,
}: {
  rect: Rect;
  tip: Tip;
  step: number;
  count: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const screen = useWindowDimensions();
  // The tip's height, once it's laid out: until then it's placed by a guess,
  // and not shown.
  const [height, setHeight] = useState<number | null>(null);
  // What's lit up is padded all round, unless it's against the screen's edge
  // (the tab bar): then the padding would only light up what's behind it.
  const edge = rect.x <= 0 || rect.y <= 0 || rect.x + rect.width >= screen.width || rect.y + rect.height >= screen.height;
  const pad = edge ? 0 : PAD;
  const left = Math.max(1, rect.x - pad);
  const top = Math.max(1, rect.y - pad);
  const right = Math.min(screen.width - 1, rect.x + rect.width + pad);
  const bottom = Math.min(screen.height - 1, rect.y + rect.height + pad);
  const lit = { left, top, width: right - left, height: bottom - top };
  const at = placeTip(rect, screen, { height: height ?? 170, side: SIDE, gap: GAP + pad, corner: CORNER });
  const last = step === count;

  return (
    // Everything else waits while a tip is up.
    <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true} accessibilityViewIsModal>
      <View
        pointerEvents="none"
        style={[
          styles.spot,
          { ...lit, borderRadius: Math.min(18, lit.height / 2) },
        ]}
      />
      <View
        style={[styles.tip, { top: at.top, opacity: height === null ? 0 : 1 }]}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
        accessibilityRole="alert"
      >
        <View style={[styles.arrow, at.below ? styles.arrowUp : styles.arrowDown, { left: at.arrowX - 8 }]} />
        <Text style={styles.step}>
          Tip {step} of {count}
        </Text>
        <Text style={styles.title}>{tip.title}</Text>
        <Text style={styles.body}>{tip.body}</Text>
        <View style={styles.row}>
          {last ? (
            <View />
          ) : (
            <Pressable onPress={onSkip} hitSlop={HIT} accessibilityRole="button">
              <Text style={styles.skip}>Skip tips</Text>
            </Pressable>
          )}
          <Pressable style={({ pressed }) => [styles.next, pressed && styles.nextPressed]} onPress={onNext} accessibilityRole="button">
            <Text style={styles.nextText}>{last ? "Done" : "Next"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // The dim is the lit-up box's shadow, spread over the whole screen.
  spot: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(233, 162, 59, 0.9)",
    boxShadow: "0 0 0 2000px rgba(0, 0, 0, 0.74)",
  },
  tip: {
    position: "absolute",
    left: SIDE,
    right: SIDE,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.selected,
    borderRadius: R.lg + 4,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  arrow: {
    position: "absolute",
    width: 16,
    height: 16,
    backgroundColor: C.card,
    borderColor: C.selected,
    transform: [{ rotate: "45deg" }],
  },
  arrowUp: { top: -9, borderLeftWidth: 1, borderTopWidth: 1 },
  arrowDown: { bottom: -9, borderRightWidth: 1, borderBottomWidth: 1 },
  step: { color: C.signal, fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6 },
  title: { color: C.text, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  body: { color: C.textSoft, fontSize: 15, lineHeight: 21 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  skip: { color: C.textMuted, fontSize: 15 },
  next: { backgroundColor: C.accent, borderRadius: R.md, paddingHorizontal: 18, paddingVertical: 9 },
  nextPressed: { opacity: 0.85 },
  nextText: { color: C.onAccent, fontSize: 15, fontWeight: "600" },
});
