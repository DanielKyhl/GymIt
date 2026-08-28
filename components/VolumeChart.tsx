import { useWindowDimensions, View } from "react-native";
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from "react-native-svg";

type Point = { date: string; volume: number };

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function VolumeChart({ data }: { data: Point[] }) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width - 40, 600);
  const chartHeight = 190;
  const padTop = 28;
  const padBottom = 26;
  const padSide = 30;
  const innerW = chartWidth - padSide * 2;
  const innerH = chartHeight - padTop - padBottom;

  const maxVol = Math.max(...data.map((d) => d.volume), 1);
  const n = data.length;
  const x = (i: number) => (n === 1 ? padSide + innerW / 2 : padSide + (i / (n - 1)) * innerW);
  const y = (v: number) => padTop + innerH - (v / maxVol) * innerH;
  const baseY = padTop + innerH;

  const points = data.map((d, i) => `${x(i)},${y(d.volume)}`).join(" ");

  return (
    <View>
      <Svg width={chartWidth} height={chartHeight}>
        <Line x1={padSide} y1={baseY} x2={chartWidth - padSide} y2={baseY} stroke="#2c2c2e" strokeWidth={1} />

        {n > 1 && <Polyline points={points} fill="none" stroke="#1d9e75" strokeWidth={2.5} />}

        {data.map((d, i) => (
          <G key={i}>
            <Circle cx={x(i)} cy={y(d.volume)} r={4} fill="#1d9e75" />
            <SvgText
              x={x(i)}
              y={y(d.volume) - 10}
              fill="#e6e6e6"
              fontSize="11"
              fontWeight="500"
              textAnchor="middle"
            >
              {d.volume.toLocaleString()}
            </SvgText>
            {(i === 0 || i === n - 1) && (
              <SvgText x={x(i)} y={baseY + 15} fill="#8a8a8e" fontSize="10" textAnchor="middle">
                {shortDate(d.date)}
              </SvgText>
            )}
          </G>
        ))}
      </Svg>
    </View>
  );
}
