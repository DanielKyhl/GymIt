import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { useWorkoutSheet } from "../../context/WorkoutSheet";
import { getActiveWorkout } from "../../lib/storage";

// Workouts open in a sheet over the app now (context/WorkoutSheet.tsx), not
// on a screen of their own. This keeps their old address working, e.g. an
// app last closed mid-workout: it opens the sheet, with Home behind it. With
// a workout under way that's always the one it opens: an address is no reason
// to ask about replacing it.
export default function OpenWorkout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { start } = useWorkoutSheet();
  useEffect(() => {
    getActiveWorkout().then((active) => start(active ? "resume" : (id ?? "resume")));
    router.dismissTo("/(tabs)");
  }, [id, start]);
  return null;
}
