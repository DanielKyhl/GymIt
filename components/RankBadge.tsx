import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { C, FONT } from "../constants/theme";
import { RankId, rankFor } from "../lib/ranks";

type Frame = {
  ring: number; // ring thickness at the 76px reference size
  stops: string[]; // metal / gem colours around the ring
  color: string; // rank name and XP bar
  studs?: number;
  stud?: string;
  facets?: boolean;
  gem?: [string, string];
  sparkle?: boolean;
  laurel?: boolean;
  glow?: string;
};

// One frame per rank, more elaborate as you climb: plain, metal, studded,
// gemstone, diamond, then Legend's gold laurel.
export const FRAMES: Record<RankId, Frame> = {
  rookie: { ring: 3, stops: ["#4d4b48", "#5d5b57", "#4d4b48"], color: "#8c8a86" },
  iron: { ring: 5, stops: ["#5b6068", "#a4aab2", "#464b52", "#848a92"], color: "#a4aab2" },
  bronze: { ring: 6, stops: ["#7a4a1e", "#e0a066", "#8c5627", "#f5bd88"], color: "#e0a066" },
  silver: { ring: 6, stops: ["#8d939a", "#f7f8fa", "#a3a9b0", "#ffffff"], color: "#e6e9ec" },
  gold: { ring: 7, stops: ["#8a5a07", "#ffe08a", "#b8860b", "#fff1b8"], color: "#f6d365", studs: 4, stud: "#b8860b" },
  platinum: { ring: 7, stops: ["#9fb3c4", "#ffffff", "#c9d6e2", "#f3f8fc"], color: "#dde8f1", studs: 8, stud: "#8fa3b3" },
  emerald: { ring: 8, stops: ["#064e3b", "#34d399", "#065f46", "#a7f3d0"], color: "#34d399", facets: true, gem: ["#a7f3d0", "#059669"], glow: "#34d399" },
  ruby: { ring: 8, stops: ["#7f1d1d", "#fb7185", "#9f1239", "#fecdd3"], color: "#fb7185", facets: true, gem: ["#fecdd3", "#e11d48"], glow: "#fb7185" },
  sapphire: { ring: 8, stops: ["#1e3a8a", "#93c5fd", "#1d4ed8", "#dbeafe"], color: "#60a5fa", facets: true, gem: ["#dbeafe", "#2563eb"], glow: "#60a5fa" },
  diamond: { ring: 9, stops: ["#e0f2fe", "#ffffff", "#a5f3fc", "#f5d0fe", "#ffffff", "#bae6fd"], color: "#bae6fd", facets: true, sparkle: true, glow: "#bae6fd" },
  legend: { ring: 9, stops: ["#0b0b0b", "#3b3b3b", "#101010", "#2c2c2c"], color: "#f6d365", laurel: true, glow: "#f6d365" },
};

export function rankColor(level: number): string {
  return FRAMES[rankFor(level).id].color;
}

// A twinkling four-point star, for the Diamond frame.
function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 1200 }), withTiming(0, { duration: 1200 })), -1)));
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({ opacity: 0.15 + 0.85 * t.get(), transform: [{ scale: 0.6 + 0.4 * t.get() }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x, top: y, width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0Z" fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

// Legend's laurel: leaves along both lower sides of the ring.
function Laurel({ size }: { size: number }) {
  const leaves: { x: number; y: number; angle: number }[] = [];
  for (let i = 0; i < 7; i++) {
    for (const [deg, flip] of [[200 + i * 16, 1], [340 - i * 16, -1]] as const) {
      const a = (deg * Math.PI) / 180;
      leaves.push({ x: 50 + 50 * Math.cos(a), y: 50 - 50 * Math.sin(a), angle: -deg + 90 * flip });
    }
  }
  const pad = size * 0.14;
  return (
    <Svg
      pointerEvents="none"
      width={size + pad * 2}
      height={size + pad * 2}
      viewBox="-6 -6 112 112"
      style={{ position: "absolute", left: -pad, top: -pad }}
    >
      <Defs>
        <LinearGradient id="laurel" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fff1b8" />
          <Stop offset="1" stopColor="#b8860b" />
        </LinearGradient>
      </Defs>
      {leaves.map((l, i) => (
        <Ellipse key={i} cx={l.x} cy={l.y} rx={5.5} ry={2.4} fill="url(#laurel)" transform={`rotate(${l.angle} ${l.x} ${l.y})`} />
      ))}
    </Svg>
  );
}

// The level badge: your level inside a frame that shows your rank.
// `mini` drops the number and decorations, for small chips.
export function RankBadge({ level, size = 72, mini = false }: { level: number; size?: number; mini?: boolean }) {
  const id = rankFor(level).id;
  const f = FRAMES[id];
  const u = 100 / size; // viewBox units per pixel
  // Thickness scales with the badge; a mini badge is mostly ring.
  const ring = mini ? 18 : f.ring * (100 / 76);
  const r = 50 - ring / 2;
  const core = 50 - ring - 3 * u;
  const gradId = `rank-${id}`;
  const gemId = `gem-${id}`;
  const stops = [...f.stops, f.stops[0]];

  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2 },
        !mini && f.glow ? { shadowColor: f.glow, shadowOpacity: 0.6, shadowRadius: size * 0.12, shadowOffset: { width: 0, height: 0 } } : null,
      ]}
    >
      {!mini && f.laurel && <Laurel size={size} />}
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            {stops.map((c, i) => (
              <Stop key={i} offset={i / (stops.length - 1)} stopColor={c} />
            ))}
          </LinearGradient>
          <RadialGradient id="rank-core" cx="35%" cy="30%" r="75%">
            <Stop offset="0" stopColor="#2a2a2a" />
            <Stop offset="1" stopColor="#161616" />
          </RadialGradient>
          {f.gem && (
            <LinearGradient id={gemId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={f.gem[0]} />
              <Stop offset="1" stopColor={f.gem[1]} />
            </LinearGradient>
          )}
        </Defs>

        <Circle cx={50} cy={50} r={r} stroke={`url(#${gradId})`} strokeWidth={ring} fill="none" />
        {f.laurel && !mini && (
          <>
            <Circle cx={50} cy={50} r={50 - 0.8} stroke="#b8860b" strokeWidth={1.4} fill="none" />
            <Circle cx={50} cy={50} r={50 - ring + 0.8} stroke="#f6d365" strokeWidth={1.4} fill="none" />
          </>
        )}
        {f.facets && !mini && (
          <G stroke="rgba(0,0,0,0.35)" strokeWidth={1.2}>
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i * 30 * Math.PI) / 180;
              return (
                <Line
                  key={i}
                  x1={50 + (50 - ring) * Math.cos(a)}
                  y1={50 + (50 - ring) * Math.sin(a)}
                  x2={50 + 50 * Math.cos(a)}
                  y2={50 + 50 * Math.sin(a)}
                />
              );
            })}
          </G>
        )}
        {f.studs && !mini &&
          Array.from({ length: f.studs }, (_, i) => {
            const a = ((i * 360) / f.studs! - 90) * (Math.PI / 180);
            return (
              <Circle key={i} cx={50 + r * Math.cos(a)} cy={50 + r * Math.sin(a)} r={ring * 0.42} fill="#FFFFFF" stroke={f.stud} strokeWidth={ring * 0.25} />
            );
          })}
        <Circle cx={50} cy={50} r={core} fill="url(#rank-core)" />
        {f.gem && !mini && (
          <Rect
            x={50 - ring * 0.95}
            y={ring / 2 - ring * 0.95}
            width={ring * 1.9}
            height={ring * 1.9}
            fill={`url(#${gemId})`}
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={0.8}
            transform={`rotate(45 50 ${ring / 2})`}
          />
        )}
      </Svg>

      {!mini && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.center}>
            <Text style={[styles.level, { fontSize: size * 0.36 }]}>{level}</Text>
          </View>
        </View>
      )}
      {f.sparkle && !mini && (
        <>
          <Sparkle x={size * 0.76} y={size * 0.02} size={size * 0.16} delay={0} />
          <Sparkle x={size * 0.0} y={size * 0.66} size={size * 0.12} delay={800} />
          <Sparkle x={size * 0.84} y={size * 0.76} size={size * 0.1} delay={1500} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  level: { fontFamily: FONT.numBold, color: C.text },
});
