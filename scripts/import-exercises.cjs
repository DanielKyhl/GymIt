// Builds the app's exercise catalogue from ExerciseDB's free dataset.
//
//   node scripts/import-exercises.cjs --old <old catalogue.json> [--raw <cache.json>]
//
// ExerciseDB (by AscendAPI) is free for personal and non-commercial apps, with
// credit to AscendAPI; the app shows that credit in the exercise sheet and in
// Settings. Its animations are 180p GIFs served from static.exercisedb.dev,
// so only the data is bundled here, not the media.
//
// Writes:
//   assets/exercises.json        the catalogue the picker shows
//   assets/legacyExercises.json  muscles and equipment for the old catalogue's
//                                names, so history logged under them still
//                                counts on the charts and recovery map
//   assets/legacyNames.json      old name -> new name, applied once to saved
//                                workouts, templates and favourites
//
// --old is the previous catalogue (free-exercise-db), e.g. from
// `git show <commit>:assets/exercises.json`. --raw caches the download.

const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};
const OLD_PATH = arg("--old");
const RAW_PATH = arg("--raw") ?? path.join(os.tmpdir(), "exercisedb-raw.json");
// Kept in the repo: which ExerciseDB ids have no media. Delete it to re-check.
const MISSING_PATH = path.join(__dirname, "exercisedb-missing-media.json");
if (!OLD_PATH) throw new Error("Pass --old <path to the previous assets/exercises.json>");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Download (25 a page, paced well inside the free API's rate limit)

async function download() {
  if (fs.existsSync(RAW_PATH)) return JSON.parse(fs.readFileSync(RAW_PATH, "utf8"));
  const base = "https://oss.exercisedb.dev/api/v1/exercises?limit=25";
  const all = [];
  let cursor = null;
  for (;;) {
    const url = cursor ? `${base}&after=${encodeURIComponent(cursor)}` : base;
    let json = null;
    for (let attempt = 0; attempt < 6 && !json; attempt++) {
      const res = await fetch(url);
      if (res.status === 429 || res.status >= 500) await sleep(4000 * (attempt + 1));
      else json = await res.json();
    }
    if (!json?.success) throw new Error(`Download failed at ${all.length} exercises`);
    all.push(...json.data);
    process.stdout.write(`\rdownloaded ${all.length}/${json.meta.total}`);
    if (!json.meta.hasNextPage) break;
    cursor = json.meta.nextCursor;
    await sleep(1500);
  }
  process.stdout.write("\n");
  fs.writeFileSync(RAW_PATH, JSON.stringify(all));
  return all;
}

// ---------------------------------------------------------------------------
// Which animations actually exist. About one in nine entries in the free set
// has no media on ExerciseDB's server (and no still image either). Checked
// once, gently, and kept in scripts/exercisedb-missing-media.json.

async function missingMedia(raw) {
  const cache = MISSING_PATH;
  if (fs.existsSync(cache)) return new Set(JSON.parse(fs.readFileSync(cache, "utf8")));
  const missing = [];
  let next = 0;
  const worker = async () => {
    while (next < raw.length) {
      const e = raw[next++];
      for (let attempt = 0; attempt < 4; attempt++) {
        const res = await fetch(`https://static.exercisedb.dev/media/${e.exerciseId}.gif`, { method: "HEAD" }).catch(() => null);
        if (res && (res.status === 200 || res.status === 404)) {
          if (res.status === 404) missing.push(e.exerciseId);
          break;
        }
        await sleep(3000 * (attempt + 1));
      }
      await sleep(60);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  fs.writeFileSync(cache, JSON.stringify(missing));
  return new Set(missing);
}

// Every entry without media turns out to be a generated copy of a real
// exercise with a word or two added: "Pure Chin-Up", "Gentle Style Cable
// Pulldown", "Cable Seated Row with Reverse", "... - Chair Variation". They're
// dropped, and anything saved under one is renamed to the original, which is
// in the list with its own animation.

const nameWords = (n) =>
  new Set(
    n
      .toLowerCase()
      .replace(/в?°/g, " degrees ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .map((w) => (w === "ups" ? "up" : w))
      .filter(Boolean)
  );

// The real exercise an entry without media was copied from: same equipment,
// every one of its words in ours, and one to three words fewer.
function originalOf(entry, withMedia) {
  const own = nameWords(entry.name);
  let best = null;
  for (const e of withMedia) {
    if (e.equipments[0] !== entry.equipments[0]) continue;
    const w = nameWords(e.name);
    const extra = own.size - w.size;
    if (extra < 1 || extra > 3 || ![...w].every((x) => own.has(x))) continue;
    if (!best || w.size > best.size) best = { e, size: w.size };
  }
  return best;
}

// ---------------------------------------------------------------------------
// Muscles, in the app's own vocabulary (lib/recovery.ts maps these onto the
// body diagram, lib/exerciseSearch.ts groups them for the filter chips).

const TARGET = {
  abs: "abdominals",
  pectorals: "chest",
  glutes: "glutes",
  biceps: "biceps",
  triceps: "triceps",
  delts: "shoulders",
  "upper back": "middle back",
  lats: "lats",
  calves: "calves",
  quads: "quadriceps",
  forearms: "forearms",
  hamstrings: "hamstrings",
  spine: "lower back",
  traps: "traps",
  abductors: "abductors",
  adductors: "adductors",
  "serratus anterior": "chest", // no serratus on the body diagram; it sits beside the chest
  "levator scapulae": "neck",
  "cardiovascular system": null, // cardio: no muscle to credit
};

const SECONDARY = {
  shoulders: "shoulders", deltoids: "shoulders", "rear deltoids": "shoulders", "rotator cuff": "shoulders",
  hamstrings: "hamstrings",
  forearms: "forearms", wrists: "forearms", "wrist flexors": "forearms", "wrist extensors": "forearms", "grip muscles": "forearms", hands: "forearms",
  triceps: "triceps",
  biceps: "biceps", brachialis: "biceps",
  quadriceps: "quadriceps",
  calves: "calves", soleus: "calves",
  glutes: "glutes",
  core: "abdominals", abdominals: "abdominals", "lower abs": "abdominals",
  obliques: "obliques",
  chest: "chest", "upper chest": "chest",
  "lower back": "lower back",
  rhomboids: "middle back", "upper back": "middle back", back: "middle back",
  trapezius: "traps", traps: "traps",
  "latissimus dorsi": "lats", lats: "lats",
  sternocleidomastoid: "neck",
  groin: "adductors", "inner thighs": "adductors",
  // hip flexors, ankles, feet, shins: nowhere on the body diagram to show them
};

// ExerciseDB sometimes credits a lift to a muscle most lifters wouldn't: it
// files squats and leg presses under glutes, and a neutral-grip incline press
// under triceps. The weekly sets chart counts only the main muscle, so these
// put it where a lifter would expect; the original moves to secondary.
const PRIMARY_FIXES = [
  { match: /squat|leg press|lunge|step-?up/, unless: /sumo|calf/, to: "quadriceps" },
  { match: /bench press|chest press|incline press|decline press|floor press/, unless: /close[- ]grip|triceps|jm /, to: "chest" },
  { match: /romanian|stiff[- ]leg|straight[- ]leg deadlift/, to: "hamstrings" },
];

function muscles(e) {
  let primary = TARGET[e.targetMuscles[0]] ?? null;
  const secondary = new Set(e.secondaryMuscles.map((m) => SECONDARY[m]).filter(Boolean));
  for (const fix of PRIMARY_FIXES) {
    if (fix.match.test(e.name) && !(fix.unless && fix.unless.test(e.name)) && primary !== fix.to) {
      if (primary) secondary.add(primary);
      primary = fix.to;
      break;
    }
  }
  if (primary) secondary.delete(primary);
  return { primaryMuscles: primary ? [primary] : [], secondaryMuscles: [...secondary].sort() };
}

// ---------------------------------------------------------------------------
// Names: ExerciseDB's are lower case, with a few encoding slips.

const SMALL = new Set(["a", "an", "and", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);
const ACRONYMS = { ez: "EZ", jm: "JM", sz: "SZ", pov: "POV" };

function displayName(raw) {
  const cleaned = raw
    .replace(/в°/g, "°")
    .replace(/_(\w+)$/, " ($1)")
    .replace(/ v\. ?(\d)/g, " v$1")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned
    .split(" ")
    .map((word, i) =>
      word
        .split(/([-/(])/)
        .map((part) => {
          const lower = part.toLowerCase();
          if (ACRONYMS[lower]) return ACRONYMS[lower];
          if (/^v\d$/.test(lower)) return lower;
          if (i > 0 && SMALL.has(lower)) return lower;
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join("")
    )
    .join(" ");
}

const cleanStep = (s) => s.replace(/^Step:\s*\d+\s*/i, "").trim();

// ---------------------------------------------------------------------------
// Old catalogue -> new names. Staples are paired by hand; anything else only
// when its words match exactly (same equipment too). Everything unpaired keeps
// its old name, and its muscles through legacyExercises.json.

const OVERRIDES = {
  // The premade templates
  "Barbell Bench Press - Medium Grip": "barbell bench press",
  "Barbell Incline Bench Press - Medium Grip": "barbell incline bench press",
  "Barbell Shoulder Press": "barbell seated overhead press",
  "Side Lateral Raise": "dumbbell lateral raise",
  "Triceps Pushdown": "cable pushdown",
  "Barbell Deadlift": "barbell deadlift",
  "Bent Over Barbell Row": "barbell bent over row",
  "Wide-Grip Lat Pulldown": "cable pulldown (pro lat bar)",
  "Seated Cable Rows": "cable seated row",
  "Barbell Curl": "barbell curl",
  "Barbell Squat": "barbell full squat",
  "Leg Press": "sled 45в° leg press",
  "Seated Leg Curl": "lever seated leg curl",
  "Leg Extensions": "lever leg extension",
  "Calf Press": "lever calf press",
  // Chest
  "Dumbbell Bench Press": "dumbbell bench press",
  "Incline Dumbbell Press": "dumbbell incline bench press",
  "Decline Barbell Bench Press": "barbell decline bench press",
  "Decline Dumbbell Bench Press": "dumbbell decline bench press",
  "Dumbbell Flyes": "dumbbell fly",
  "Incline Dumbbell Flyes": "dumbbell incline fly",
  "Cable Crossover": "cable cross-over variation",
  "Pushups": "push-up",
  "Dips - Chest Version": "chest dip",
  "Smith Machine Bench Press": "smith bench press",
  "Leverage Chest Press": "lever chest press",
  "Machine Bench Press": "lever chest press",
  "Leverage Incline Chest Press": "lever incline chest press",
  "Close-Grip Barbell Bench Press": "barbell close-grip bench press",
  "Bench Press - Powerlifting": "barbell bench press",
  "Wide-Grip Barbell Bench Press": "barbell bench press",
  // Shoulders
  "Dumbbell Shoulder Press": "dumbbell seated shoulder press",
  "Seated Dumbbell Press": "dumbbell seated shoulder press",
  "Machine Shoulder (Military) Press": "lever military press",
  "Leverage Shoulder Press": "lever shoulder press",
  "Arnold Dumbbell Press": "dumbbell arnold press",
  "Front Dumbbell Raise": "dumbbell front raise",
  "Front Plate Raise": "weighted front raise",
  "Cable Seated Lateral Raise": "cable lateral raise",
  "Reverse Flyes": "dumbbell reverse fly",
  "Reverse Machine Flyes": "lever seated reverse fly",
  "Upright Barbell Row": "barbell upright row",
  "Barbell Shrug": "barbell shrug",
  "Dumbbell Shrug": "dumbbell shrug",
  // Back
  "Pullups": "pull-up",
  "Chin-Up": "chin-up",
  "Weighted Pull Ups": "pull-up",
  "V-Bar Pullup": "pull up (neutral grip)",
  "One-Arm Dumbbell Row": "dumbbell bent over row",
  "Bent Over Two-Dumbbell Row": "dumbbell bent over row",
  "Reverse Grip Bent-Over Rows": "barbell reverse grip bent over row",
  "T-Bar Row with Handle": "lever t bar row",
  "Lying T-Bar Row": "lever t bar row",
  "Close-Grip Front Lat Pulldown": "cable pulldown",
  "V-Bar Pulldown": "cable lateral pulldown with v-bar",
  "Underhand Cable Pulldowns": "reverse grip machine lat pulldown",
  "Straight-Arm Pulldown": "cable straight arm pulldown",
  "Romanian Deadlift": "barbell romanian deadlift",
  "Stiff-Legged Barbell Deadlift": "barbell straight leg deadlift",
  "Stiff-Legged Dumbbell Deadlift": "dumbbell stiff leg deadlift",
  "Sumo Deadlift": "barbell sumo deadlift",
  "Hyperextensions (Back Extensions)": "hyperextension",
  "Good Morning": "barbell good morning",
  // Arms
  "Dumbbell Bicep Curl": "dumbbell biceps curl",
  "Dumbbell Alternate Bicep Curl": "dumbbell alternate biceps curl",
  "Hammer Curls": "dumbbell hammer curl",
  "EZ-Bar Curl": "ez barbell curl",
  "Preacher Curl": "ez barbell close grip preacher curl",
  "Concentration Curls": "dumbbell concentration curl",
  "Standing Biceps Cable Curl": "cable curl",
  "Reverse Barbell Curl": "barbell reverse curl",
  "EZ-Bar Skullcrusher": "barbell lying triceps extension skull crusher",
  "Lying Triceps Press": "barbell lying triceps extension",
  "Dips - Triceps Version": "triceps dip",
  "Bench Dips": "three bench dip",
  "Tricep Dumbbell Kickback": "dumbbell kickback",
  "Cable Rope Overhead Triceps Extension": "cable overhead triceps extension (rope attachment)",
  "Standing Dumbbell Triceps Extension": "dumbbell standing triceps extension",
  "Triceps Pushdown - Rope Attachment": "cable pushdown (with rope attachment)",
  "Triceps Pushdown - V-Bar Attachment": "cable triceps pushdown (v-bar)",
  "Palms-Down Wrist Curl Over A Bench": "dumbbell over bench revers wrist curl",
  "Palms-Up Barbell Wrist Curl Over A Bench": "barbell wrist curl",
  // Legs
  "Barbell Full Squat": "barbell full squat",
  "Front Barbell Squat": "barbell front squat",
  "Front Squat (Clean Grip)": "barbell front squat",
  "Goblet Squat": "dumbbell goblet squat",
  "Hack Squat": "sled hack squat",
  "Smith Machine Squat": "smith squat",
  "Dumbbell Squat": "dumbbell squat",
  "Barbell Lunge": "barbell lunge",
  "Dumbbell Lunges": "dumbbell lunge",
  "Bodyweight Walking Lunge": "walking lunge",
  "Split Squat with Dumbbells": "dumbbell single leg split squat",
  "Split Squats": "split squats",
  "Lying Leg Curls": "lever lying leg curl",
  "Standing Calf Raises": "barbell standing calf raise",
  "Seated Calf Raise": "lever seated calf raise",
  "Barbell Glute Bridge": "barbell glute bridge",
  "Thigh Abductor": "lever seated hip abduction",
  "Thigh Adductor": "lever seated hip adduction",
  "Glute Ham Raise": "glute-ham raise",
  // Core
  "Crunches": "crunch floor",
  "Cable Crunch": "cable kneeling crunch",
  "Hanging Leg Raise": "hanging leg raise",
  "Ab Roller": "wheel rollerout",
  "Farmer's Walk": "farmers walk",
  "Butterfly": "lever seated fly", // the pec deck
};

// Staples ExerciseDB's free set doesn't have. They stay in the catalogue
// under their own name and muscles, shown with the animation of the closest
// movement it does have (the exercise sheet says it's the closest match).
const KEEP = {
  "Face Pull": "cable kneeling rear delt row (with rope) (male)",
  "Barbell Hip Thrust": "barbell glute bridge",
  "Plank": "weighted front plank",
  "Standing Military Press": "barbell standing close grip military press",
};

const FAMILY_OLD = { barbell: "barbell", "e-z curl bar": "ez", dumbbell: "dumbbell", cable: "cable", machine: "machine", "body only": "body", kettlebells: "kettlebell", bands: "band", "medicine ball": "medball", "exercise ball": "ball", "foam roll": "roller" };
const FAMILY_NEW = { barbell: "barbell", "olympic barbell": "barbell", "ez barbell": "ez", dumbbell: "dumbbell", cable: "cable", "leverage machine": "machine", "smith machine": "machine", "sled machine": "machine", "body weight": "body", weighted: "body", assisted: "machine", kettlebell: "kettlebell", band: "band", "resistance band": "band", "medicine ball": "medball", "stability ball": "ball", roller: "roller", "wheel roller": "roller" };
const FILLER = new Set(["the", "a", "with", "on", "of", "to", "and", "medium", "grip", "standing", "exercise"]);
const CANON = { lever: "machine", leverage: "machine", db: "dumbbell", flye: "fly", flyes: "fly", flies: "fly", tricep: "triceps", bicep: "biceps" };

function tokens(name) {
  let s = name.toLowerCase().replace(/в/g, "");
  s = s.replace(/\bpull[\s-]+ups?\b/g, "pullup").replace(/\bchin[\s-]+ups?\b/g, "chinup").replace(/\bpush[\s-]+ups?\b/g, "pushup").replace(/\bsit[\s-]+ups?\b/g, "situp");
  return new Set(
    s
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .map((t) => CANON[t] ?? (t.length > 4 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t))
      .filter((t) => t && !FILLER.has(t))
  );
}
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

// ---------------------------------------------------------------------------

(async () => {
  const raw = await download();
  const old = JSON.parse(fs.readFileSync(OLD_PATH, "utf8"));
  const oldByName = new Map(old.map((e) => [e.name, e]));

  // Entries without an animation make way for the exercise they copy.
  const noMedia = await missingMedia(raw);
  const withMedia = raw.filter((e) => !noMedia.has(e.exerciseId));
  const droppedFor = new Map(); // exerciseId -> the original's raw entry
  for (const e of raw.filter((x) => noMedia.has(x.exerciseId))) {
    const original = originalOf(e, withMedia);
    if (!original) throw new Error(`No animation, and no original it copies: ${e.name}`);
    droppedFor.set(e.exerciseId, original.e);
  }
  const kept = raw.filter((e) => !droppedFor.has(e.exerciseId));

  // New catalogue.
  const seen = new Map();
  const byRawName = new Map();
  const byId = new Map();
  const catalogue = kept.map((e) => {
    let name = displayName(e.name);
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    if (n > 1) name = `${name} v${n}`;
    const entry = {
      id: e.exerciseId,
      name,
      equipment: e.equipments[0] ?? null,
      bodyPart: e.bodyParts[0] ?? null,
      ...muscles(e),
      instructions: e.instructions.map(cleanStep).filter(Boolean),
      gif: true,
    };
    if (!byRawName.has(e.name)) byRawName.set(e.name, entry);
    byId.set(e.exerciseId, entry);
    return entry;
  });
  // A raw name whose every copy was dropped leads to its original instead.
  const resolveRaw = (rawName) =>
    byRawName.get(rawName) ??
    byId.get([...droppedFor].find(([id]) => raw.find((e) => e.exerciseId === id)?.name === rawName)?.[1].exerciseId);

  // Old-catalogue staples ExerciseDB lacks, with their equipment moved to
  // ExerciseDB's words.
  const EQUIP_TO_NEW = { machine: "leverage machine", "body only": "body weight", kettlebells: "kettlebell", "e-z curl bar": "ez barbell", bands: "band", "exercise ball": "stability ball", "foam roll": "roller" };
  const staples = Object.entries(KEEP).map(([n, standIn]) => {
    const o = oldByName.get(n);
    const shown = resolveRaw(standIn);
    if (!o || !shown || shown.gifId) throw new Error(`Kept exercise or its animation not found: ${n} -> ${standIn}`);
    return {
      id: `fedb-${o.id}`,
      name: o.name,
      equipment: EQUIP_TO_NEW[o.equipment] ?? o.equipment,
      bodyPart: shown.bodyPart,
      primaryMuscles: o.primaryMuscles,
      secondaryMuscles: o.secondaryMuscles,
      instructions: o.instructions,
      gif: true,
      gifId: shown.id,
      gifOf: shown.name,
    };
  });
  const full = [...catalogue, ...staples].sort((a, b) => a.name.localeCompare(b.name));
  const names = new Set(full.map((e) => e.name));

  // Renames: hand-paired first, then exact word matches with the same equipment.
  const renames = {};
  const problems = [];
  for (const [from, toRaw] of Object.entries(OVERRIDES)) {
    const to = resolveRaw(toRaw);
    if (!to) problems.push(`${from} -> ${toRaw}`);
    else if (from !== to.name) renames[from] = to.name;
  }
  const newIndex = kept.map((e) => ({ raw: e.name, t: tokens(e.name), fam: FAMILY_NEW[e.equipments[0]] }));
  for (const o of old) {
    if (renames[o.name] || OVERRIDES[o.name] || names.has(o.name) || KEEP[o.name]) continue;
    const t = tokens(o.name);
    const fam = FAMILY_OLD[o.equipment];
    const hit = newIndex.find((n) => (!fam || n.fam === fam) && sameSet(t, n.t));
    if (hit) renames[o.name] = byRawName.get(hit.raw).name;
  }
  // Dropped copies point at their original, in case one was already saved.
  for (const [id, original] of droppedFor) {
    const from = displayName(raw.find((e) => e.exerciseId === id).name);
    const to = byId.get(original.exerciseId).name;
    if (!names.has(from) && from !== to) renames[from] = to;
  }

  // Muscles for every old name that isn't in the new catalogue, so history
  // under it still counts. [primary, secondary, equipment, stretch]
  const legacy = {};
  for (const o of old) {
    if (names.has(o.name)) continue;
    legacy[o.name] = [o.primaryMuscles, o.secondaryMuscles, EQUIP_TO_NEW[o.equipment] ?? o.equipment ?? null, o.category === "stretching" ? 1 : 0];
  }

  const unknownOld = Object.keys(OVERRIDES).filter((n) => !oldByName.has(n));
  if (unknownOld.length) problems.push(...unknownOld.map((n) => `(not in the old catalogue) ${n}`));
  if (problems.length) throw new Error("Hand-paired names that don't exist:\n  " + problems.join("\n  "));
  const withoutPicture = full.filter((e) => noMedia.has(e.gifId ?? e.id));
  if (withoutPicture.length) throw new Error("Still without a picture: " + withoutPicture.map((e) => e.name).join(", "));

  const write = (file, data) => fs.writeFileSync(path.join(ROOT, "assets", file), JSON.stringify(data));
  write("exercises.json", full);
  write("legacyExercises.json", legacy);
  write("legacyNames.json", renames);

  console.log(`ExerciseDB: ${raw.length}, of which ${noMedia.size} have no animation:`);
  console.log(`  all copies of a real exercise; ${droppedFor.size} dropped in favour of the original`);
  console.log(`catalogue: ${catalogue.length} from ExerciseDB + ${staples.length} old staples = ${full.length}`);
  console.log(`renames: ${Object.keys(renames).length} (${Object.keys(OVERRIDES).length} by hand)`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
