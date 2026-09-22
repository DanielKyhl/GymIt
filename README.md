# GymIt

A workout tracker for iOS and Android, built with Expo, React Native and
TypeScript. Log every set, and watch the numbers go up.

## What it does

**Logging.** Build templates or start an empty workout. Each set takes weight,
reps, a type (working, warm-up, drop, failure) and an optional RPE. A rest row
sits between sets and starts itself when you tick one off, counting up past the
target so you can see how long you actually rested. There's a plate calculator,
a warm-up generator, supersets, per-exercise notes, and a PR badge the moment
you beat an estimated 1RM. Close the app mid-workout and it picks up where you
left off.

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
| `context/` | Auth state |
| `firestore.rules` | Access rules: an account can only touch its own data |

## Built with

- Expo SDK 57, React Native 0.86, Expo Router, TypeScript
- Firebase Auth + Firestore (free tier)
- react-native-svg, react-native-reanimated, lucide-react-native
