import React, { useId } from "react";
import { View } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

interface SparklineProps {
  data: number[];
  width?: number | string;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  min?: number;
  max?: number;
}

export function Sparkline({
  data,
  width: _width = "100%",
  height = 42,
  strokeColor = "#f59e0b",
  fillColor = "#f59e0b",
  min: forcedMin,
  max: forcedMax,
}: SparklineProps) {
  const gradientId = useId().replace(/:/g, "_");

  if (!data || data.length < 2) {
    return <View style={{ height }} className="w-full opacity-20" />;
  }

  const W = 100;
  const H = 40;
  const padding = 2;

  const rawMin = forcedMin ?? Math.min(...data);
  const rawMax = forcedMax ?? Math.max(...data);
  const min = Number.isFinite(rawMin) ? rawMin : 0;
  const max = Number.isFinite(rawMax) && rawMax > min ? rawMax : min + 1;
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * W;
    const clamped = Math.max(min, Math.min(max, val));
    const y = H - padding - ((clamped - min) / range) * (H - padding * 2);
    return { x, y };
  });

  // Construct smooth bezier or segmented line
  let pathD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    pathD += ` C ${midX.toFixed(1)} ${prev.y.toFixed(1)}, ${midX.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }

  const fillD = `${pathD} L ${W} ${H} L 0 ${H} Z`;

  return (
    <View style={{ height, width: "100%" }}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={fillColor} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={fillColor} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>

        {/* Filled wave area */}
        <Path d={fillD} fill={`url(#${gradientId})`} />

        {/* Stroke waveform line */}
        <Path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
