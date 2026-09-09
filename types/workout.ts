export type Exercise = {
  id: string;
  name: string;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  category: string;
  // Extra fields carried by the bundled free-exercise-db data.
  images: string[]; // repo-relative paths, e.g. "Barbell_Curl/0.jpg"
  instructions: string[]; // one string per step
  level: string; // beginner | intermediate | expert
  mechanic: string | null; // compound | isolation
  force: string | null; // push | pull | static
}
// One set performed within an exercise (e.g. 60kg x 8 reps)
export type SetType = "normal" | "warmup";

export type WorkoutSet = {
  weight: number;
  reps: number;
  done: boolean;
  type?: SetType; // defaults to "normal" when absent
  restSeconds?: number; // rest to take after this set; 0/undefined = no rest
};

// An exercise as performed in a workout, with all its sets
export type WorkoutExercise = {
  name: string;
  sets: WorkoutSet[];
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
};

// A reusable template: a named list of exercises to train
export type Template = {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  restSeconds?: number; // rest timer between sets; falls back to the global default
};