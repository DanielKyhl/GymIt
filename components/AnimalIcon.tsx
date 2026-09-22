import Svg, { G, Path } from "react-native-svg";
import { Animal } from "../lib/funFacts";
import { Silhouette, SILHOUETTES } from "./animalSilhouettes";

// The animal from a volume comparison as a solid silhouette, scaled to fit
// the box without stretching (a whale ends up wide, a gorilla tall).
export function AnimalIcon({
  animal,
  width,
  height,
  color,
}: {
  animal: Animal;
  width: number;
  height: number;
  color: string;
}) {
  const s: Silhouette = SILHOUETTES[animal.icon];
  return (
    <Svg width={width} height={height} viewBox={s.viewBox} preserveAspectRatio="xMidYMid meet">
      <G transform={s.transform} fill={color}>
        {s.paths.map((d, i) => (
          <Path key={i} d={d} />
        ))}
      </G>
    </Svg>
  );
}
