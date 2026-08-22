export type Exercise = {
  id: string;
  name: string;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  category: string;
}
// One set performed within an exercise (e.g. 60kg x 8 reps)
export type SetType = "normal" | "warmup";

export type WorkoutSet = {
  weight: number;
  reps: number;
  done: boolean;
  type?: SetType; // defaults to "normal" when absent
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

// One exercise inside a template (just the plan, no weights/reps yet)
export type TemplateExercise = {
  name: string;
};

// A reusable template: a named list of exercises to train
export type Template = {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  restSeconds?: number; // rest timer between sets; falls back to the global default
};