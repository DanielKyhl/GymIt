import { createContext, ReactNode, RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions } from "react-native";
import { SharedValue, useSharedValue } from "react-native-reanimated";
import { RestTimer } from "../lib/activeWorkout";
import { getActiveWorkout } from "../lib/storage";
import { useAuth } from "./AuthContext";

// The workout in progress lives in a sheet over the whole app
// (components/WorkoutSheet.tsx) rather than on a screen of its own. Pull it
// down and it tucks away into a bar above the tabs (components/WorkoutBar.tsx),
// still running, clock, rest timer and its sound included, while you look at
// something else; tap the bar or pull it up to bring the workout back.
// Everything that starts or reopens a workout goes through here.

// What the bar shows while the workout is tucked away.
export type WorkoutGlance = { name: string; startedAt: number; rest: RestTimer | null };

type WorkoutSheetValue = {
  // What's in the sheet: a template's id, "new" or "resume". `key` changes
  // when a different workout starts, so the sheet starts it afresh.
  workout: { id: string; key: number } | null;
  open: boolean; // covering the screen, rather than tucked away
  glance: WorkoutGlance | null;
  start: (id: string) => void;
  show: () => void;
  hide: () => void;
  close: () => void; // finished or discarded
  setGlance: (glance: WorkoutGlance | null) => void;
  // Where the sheet's top edge is on screen. The sheet and the bar both move
  // it, so pulling the bar up brings the sheet up under your finger.
  y: SharedValue<number>;
  dock: RefObject<number | null>; // where the bar's top edge is, once it has shown
  peeking: boolean; // the bar is being pulled up: the sheet shows while it's tucked away
  setPeeking: (peeking: boolean) => void;
};

const WorkoutSheetContext = createContext<WorkoutSheetValue | undefined>(undefined);

export function WorkoutSheetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workout, setWorkout] = useState<WorkoutSheetValue["workout"]>(null);
  const [open, setOpen] = useState(false);
  const [glance, setGlance] = useState<WorkoutGlance | null>(null);
  const y = useSharedValue(Dimensions.get("window").height);
  const dock = useRef<number | null>(null);
  const [peeking, setPeeking] = useState(false);

  // Signed in with a workout still going (the app was closed mid-workout):
  // load it into the sheet, tucked away, so the bar shows and its rest timer
  // can still ring. Signing out empties the sheet.
  const uid = user?.uid;
  useEffect(() => {
    let cancelled = false;
    (uid ? getActiveWorkout() : Promise.resolve(null)).then((active) => {
      if (cancelled) return;
      if (active) setWorkout((w) => w ?? { id: "resume", key: Date.now() });
      else if (!uid) {
        setWorkout(null);
        setOpen(false);
        setGlance(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const start = useCallback(
    (id: string) => {
      if (!uid) return; // a workout belongs to an account
      // Reopening keeps what's already in the sheet; anything else starts over
      // (and the workout itself asks before replacing an unfinished one).
      setWorkout((w) => (w && id === "resume" ? w : { id, key: Date.now() }));
      setOpen(true);
    },
    [uid]
  );
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  const close = useCallback(() => {
    setWorkout(null);
    setOpen(false);
    setGlance(null);
  }, []);

  const value = useMemo(
    () => ({ workout, open, glance, start, show, hide, close, setGlance, y, dock, peeking, setPeeking }),
    [workout, open, glance, start, show, hide, close, y, peeking]
  );
  return <WorkoutSheetContext.Provider value={value}>{children}</WorkoutSheetContext.Provider>;
}

export function useWorkoutSheet(): WorkoutSheetValue {
  const value = useContext(WorkoutSheetContext);
  if (!value) throw new Error("useWorkoutSheet must be used inside WorkoutSheetProvider");
  return value;
}
