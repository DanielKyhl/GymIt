import { useWindowDimensions, View } from "react-native";
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from "react-native-svg";
import { C } from "../constants/theme";
import { formatNumber } from "../lib/format";

type Point = { date: string; volume: number };

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

type Props = {
  data: Point[];
  width?: number;
  // false: the axis spans just the data's range, so small changes (like body
  // weight) are visible instead of a flat line near the top.
  zeroBased?: boolean;
};

export function VolumeChart({ data, width: fixedWidth, zeroBased = true }: Props) {
  const { width } = useWindowDimensions();
  const chartWidth = fixedWidth ?? Math.min(width - 40, 600);
  const chartHeight = 190;
  const padTop = 28;
  const padBottom = 26;
  const padSide = 30;
  const innerW = chartWidth - padSide * 2;
  const innerH = chartHeight - padTop - padBottom;

  const values = data.map((d) => d.volume);
  const dataMax = Math.max(...values, zeroBased ? 1 : -Infinity);
  const dataMin = Math.min(...values);
  const pad = zeroBased ? 0 : Math.max((dataMax - dataMin) * 0.2, 1);
  const lo = zeroBased ? 0 : dataMin - pad;
  const hi = zeroBased ? dataMax : dataMax + pad;
  const n = data.length;
  const x = (i: number) => (n === 1 ? padSide + innerW / 2 : padSide + (i / (n - 1)) * innerW);
  const y = (v: number) => padTop + innerH - ((v - lo) / (hi - lo)) * innerH;
  const baseY = padTop + innerH;

  const points = data.map((d, i) => `${x(i)},${y(d.volume)}`).join(" ");

  return (
    <View>
      <Svg width={chartWidth} height={chartHeight}>
        <Line x1={padSide} y1={baseY} x2={chartWidth - padSide} y2={baseY} stroke={C.raised} strokeWidth={1} />

        {n > 1 && <Polyline points={points} fill="none" stroke={C.accent} strokeWidth={2.5} />}

        {data.map((d, i) => (
          <G key={i}>
            <Circle cx={x(i)} cy={y(d.volume)} r={4} fill={C.accent} />
            <SvgText
              x={x(i)}
              y={y(d.volume) - 10}
              fill={C.accent}
              fontSize="11"
              fontWeight="500"
              textAnchor="middle"
            >
              {formatNumber(d.volume)}
            </SvgText>
            {(i === 0 || i === n - 1) && (
              <SvgText x={x(i)} y={baseY + 15} fill={C.textMuted} fontSize="10" textAnchor="middle">
                {shortDate(d.date)}
              </SvgText>
            )}
          </G>
        ))}
      </Svg>
    </View>
  );
}
