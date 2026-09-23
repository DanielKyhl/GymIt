// One entry in the exercise catalogue (assets/exercises.json, built by
// scripts/import-exercises.cjs). Muscles use the app's own names: "chest",
// "lats", "middle back", "quadriceps"...; the main muscle comes first.
export type Exercise = {
  id: string;
  name: string;
  equipment: string | null; // ExerciseDB's words: "barbell", "body weight", "leverage machine"...
  bodyPart: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[]; // one string per step
  gif?: boolean; // has an ExerciseDB animation, named after gifId or else the id
  // The few staples ExerciseDB lacks show the closest movement it does have:
  gifId?: string; // that animation's id
  gifOf?: string; // and the name of the exercise it actually shows
}
// One set performed within an exercise (e.g. 60kg x 8 reps)
// warmup: excluded from stats. drop / failure: working sets, just labelled.
export type SetType = "normal" | "warmup" | "drop" | "failure";

export type WorkoutSet = {
  weight: number;
  reps: number;
  done: boolean;
  type?: SetType; // defaults to "normal" when absent
  restSeconds?: number; // rest to take after this set; 0/undefined = no rest
  rpe?: number; // no longer asked for; kept so older workouts that have it still load
};

// An exercise as performed in a workout, with all its sets
export type WorkoutExercise = {
  name: string;
  sets: WorkoutSet[];
  notes?: string;
  // Exercises sharing an id form a superset: done back to back, with the
  // rest only after the last one of each round.
  supersetId?: string;
};

// A workout session — either in progress or finished and saved
export type Workout = {
  id: string;
  name: string;
  date: string;
  durationSeconds: number;
  unit: "kg" | "lb";
  exercises: WorkoutExercise[];
};

// A planned set inside a template (like a WorkoutSet, but with no "done").
export type TemplateSet = {
  weight: number;
  reps: number;
  restSeconds?: number;
  type?: SetType;
};

// One exercise inside a template, with its planned sets.
export type TemplateExercise = {
  name: string;
  sets?: TemplateSet[]; // optional — older templates were name-only
  notes?: string;
  supersetId?: string;
};

// A reusable template: a named list of exercises to train
export type Template = {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  restSeconds?: number; // rest timer between sets; falls back to the global default
};