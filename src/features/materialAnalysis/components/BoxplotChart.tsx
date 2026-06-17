import { MATERIAL_LABELS, type BoxplotChartProps } from "../types";

export function BoxplotChart({ data, field, yLabel, colors }: BoxplotChartProps) {
  const width = 320;
  const height = 240;
  const padding = { l: 40, r: 20, t: 20, b: 40 };
  const plotW = width - padding.l - padding.r;
  const plotH = height - padding.t - padding.b;

  const allValues = data.flatMap((d) => d[field]);
  const minVal = Math.min(...allValues) * 0.9;
  const maxVal = Math.max(...allValues) * 1.1;

  const stats = data.map((d) => {
    const values = [...d[field]].sort((a, b) => a - b);
    const q1 = values[Math.floor(values.length * 0.25)];
    const median = values[Math.floor(values.length * 0.5)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;
    const min = Math.max(minVal, q1 - 1.5 * iqr);
    const max = Math.min(maxVal, q3 + 1.5 * iqr);
    return { material: d.material, min, q1, median, q3, max };
  });

  const yScale = (v: number) => padding.t + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;
  const barWidth = plotW / data.length * 0.5;
  const gap = plotW / data.length;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = padding.t + t * plotH;
        const val = maxVal - t * (maxVal - minVal);
        return (
          <g key={i}>
            <line
              x1={padding.l}
              y1={y}
              x2={width - padding.r}
              y2={y}
              stroke="rgba(212,175,55,0.1)"
              strokeWidth={1}
            />
            <text
              x={padding.l - 6}
              y={y + 3}
              textAnchor="end"
              fill="rgba(212,175,55,0.6)"
              fontSize={10}
            >
              {val.toFixed(1)}
            </text>
          </g>
        );
      })}

      {stats.map((s, i) => {
        const x = padding.l + i * gap + gap / 2;
        const color = colors[s.material];
        return (
          <g key={s.material}>
            <line
              x1={x}
              y1={yScale(s.min)}
              x2={x}
              y2={yScale(s.max)}
              stroke={color}
              strokeWidth={1.5}
            />
            <line
              x1={x - barWidth / 4}
              y1={yScale(s.min)}
              x2={x + barWidth / 4}
              y2={yScale(s.min)}
              stroke={color}
              strokeWidth={1.5}
            />
            <line
              x1={x - barWidth / 4}
              y1={yScale(s.max)}
              x2={x + barWidth / 4}
              y2={yScale(s.max)}
              stroke={color}
              strokeWidth={1.5}
            />
            <rect
              x={x - barWidth / 2}
              y={yScale(s.q3)}
              width={barWidth}
              height={yScale(s.q1) - yScale(s.q3)}
              fill={color}
              fillOpacity={0.3}
              stroke={color}
              strokeWidth={1.5}
            />
            <line
              x1={x - barWidth / 2}
              y1={yScale(s.median)}
              x2={x + barWidth / 2}
              y2={yScale(s.median)}
              stroke={color}
              strokeWidth={2}
            />
            <text
              x={x}
              y={height - padding.b + 15}
              textAnchor="middle"
              fill="rgba(212,175,55,0.8)"
              fontSize={10}
            >
              {MATERIAL_LABELS[s.material]}
            </text>
          </g>
        );
      })}

      <text
        x={padding.l / 2}
        y={height / 2}
        textAnchor="middle"
        fill="rgba(212,175,55,0.7)"
        fontSize={10}
        transform={`rotate(-90, ${padding.l / 2}, ${height / 2})`}
      >
        {yLabel}
      </text>
    </svg>
  );
}
