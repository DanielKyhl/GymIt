# GymIt

A workout tracker for iOS and Android, built with Expo, React Native and
TypeScript. Log every set, and watch the numbers go up.

## What it does

**Logging.** Build templates or start an empty workout. Each set takes weight,
reps, a type (working, warm-up, drop, failure) and an optional RPE. Numbers are
typed on the app's own number pad rather than the phone's keyboard, with minus
and plus keys that step the weight by 2.5 kg (5 lb) or the reps by one, and
Next to go from kg to reps to the next set. A rest row
follows every set, the last one included (that's the rest before the next
exercise), and starts itself when you tick the set off, counting up past the
target so you can see how long you actually rested. Rest lengths are typed in,
minutes and seconds, and can be changed while the rest runs. When it's up it
rings over your music rather than pausing it: a boxing bell, a gym bell, a gong
or a whistle, picked in Settings. There's a plate calculator,
a warm-up generator, supersets, per-exercise notes, and a PR badge the moment
you beat an estimated 1RM. Close the app mid-workout and it picks up where you
left off. Pull a workout down by its top and it tucks into a bar above the
tabs, clock and rest timer still running, while you use the rest of the app;
tap the bar or swipe it up to bring the workout back.

**Progress.** History with editable past workouts, per-exercise charts and PR
history, a consistency heatmap, weekly sets per muscle, a body-weight log, and
a recovery view that estimates what's still sore and suggests what to train.

**Motivation.** XP and levels to a cap of 150 (about three years at five
workouts a week), eleven ranks from Rookie to Legend, each with its own frame
around the level badge, a weekly-goal streak with shields that cover a missed
week, 50 achievements, and an end-of-workout summary with a shareable card.

**Accounts.** Email sign-up, password reset and account deletion. Everything is
local first and syncs to Firestore in the background, so the app works offline
and your history follows you to a new phone.

## Running it

```
npm install
cp .env.example .env    # fill in from your Firebase project's web app config
npx expo start
```

Scan the QR code with Expo Go on your phone (same Wi-Fi), or press `w` for the
browser. Use `npx expo start --tunnel` if the phone and the computer aren't on
the same network.

The app needs a Firebase project (Spark/free is enough — Auth and Firestore
only, nothing else is used). After creating one, enable Email/Password sign-in
and publish `firestore.rules` from Firestore → Rules, which is what keeps each
account's data private and lets an account delete itself.

## Putting it on a phone

GymIt also builds as an installable web app, which is how it gets onto a home
screen without an app store or a developer account:

```
npm run deploy
```

That exports the web build to `dist/` and pushes it to Firebase Hosting. Once,
before the first deploy:

```
npx firebase-tools login
npx firebase-tools use <your-project-id>
```

`firebase use` writes `.firebaserc`, which stays out of the repo along with
`.env`. Then on the phone, open the
URL and choose **Add to Home Screen** — Share menu on iOS, the ⋮ menu on
Android. It launches full-screen with its own icon, keeps you signed in, and
the service worker in `public/sw.js` keeps it working with no signal.

Three things don't survive the web build: haptics do nothing; the summary's
share card is hidden, because the screenshot library it uses is native-only;
and on an iPhone the rest timer's sound is muted while the phone is on silent.
That last one is the price of not pausing your music: iOS only lets a web page
play over other audio in the "ambient" mode, which the silent switch mutes.

## Developing against the emulators

Nothing has to touch the real project:

```
npx firebase-tools emulators:start --project demo-gymit
```

Then uncomment `EXPO_PUBLIC_USE_EMULATORS=1` in `.env` (and set
`EXPO_PUBLIC_EMULATOR_HOST` to the computer's LAN IP if you're testing on a
phone) and restart with `npx expo start -c`.

## Tests

```
npm test
npx tsc --noEmit
```

Every pure helper in `lib/` has unit tests — the level curve, ranks, streaks,
achievements, stats, recovery, unit conversion and the sync merge.

## Layout

| Path | What's in it |
| --- | --- |
| `app/` | Screens and routes (expo-router). `(auth)`, `(tabs)`, workout, history, settings |
| `components/` | Shared UI: rank badge, charts, set rows, pickers, share card |
| `lib/` | All the logic, kept pure and tested: storage, sync, stats, gamification |
| `constants/theme.ts` | Colours, spacing, radii and type scale — every screen reads from here |
| `context/` | Auth state, and the sheet that holds the workout in progress |
| `firestore.rules` | Access rules: an account can only touch its own data |

## Exercise data

The 1,255 exercises and their animations come from the free tier of
[ExerciseDB](https://oss.exercisedb.dev) by AscendAPI. It's free for personal
and non-commercial apps, with credit to AscendAPI (shown in the exercise
sheet and in Settings). Charging for the app or running ads would need their
paid plan. The animations load from ExerciseDB's own server; only the data is
bundled.

`scripts/import-exercises.cjs` rebuilds `assets/exercises.json` from it,
leaving out the 176 entries ExerciseDB has no animation for (all generated
copies of exercises that are in the list) and anything you can't log as
weight and reps: stretches, yoga poses, cardio machines and runs. It
also records how names from the previous exercise list map onto the new ones
(`assets/legacyNames.json`), which the app applies to saved workouts and
templates, and what the unmatched old names trained
(`assets/legacyExercises.json`), so history under them still counts.

## Timer sounds

The rest timer's sounds are synthesised rather than recorded, so there's no
licence to worry about: `scripts/make-sounds.cjs` writes `assets/sounds/`, all
at the same loudness. Change a number there and run it again to retune one.

## Built with

- Expo SDK 57, React Native 0.86, Expo Router, TypeScript
- Firebase Auth + Firestore (free tier)
- react-native-svg, react-native-reanimated, lucide-react-native
