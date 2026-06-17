import { MATERIAL_LABELS, type BarChartWithErrorBarsProps } from "../types";

export function BarChartWithErrorBars({
  data,
  valueField,
  errorField,
  yLabel,
  colors,
}: BarChartWithErrorBarsProps) {
  const width = 320;
  const height = 240;
  const padding = { l: 40, r: 20, t: 20, b: 40 };
  const plotW = width - padding.l - padding.r;
  const plotH = height - padding.t - padding.b;

  const maxVal = Math.max(...data.map((d) => d[valueField] + d[errorField])) * 1.15;

  const yScale = (v: number) => padding.t + plotH - (v / maxVal) * plotH;
  const barWidth = plotW / data.length * 0.6;
  const gap = plotW / data.length;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = padding.t + t * plotH;
        const val = maxVal * (1 - t);
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

      {data.map((d, i) => {
        const x = padding.l + i * gap + gap / 2;
        const val = d[valueField];
        const err = d[errorField];
        const color = colors[d.material];
        const barY = yScale(val);
        const barH = padding.t + plotH - barY;

        const gradId = `bar-grad-${d.material}`;

        return (
          <g key={d.material}>
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                <stop offset="100%" stopColor={color} stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <rect
              x={x - barWidth / 2}
              y={barY}
              width={barWidth}
              height={barH}
              fill={`url(#${gradId})`}
              stroke={color}
              strokeWidth={1}
              rx={2}
            />
            <line
              x1={x}
              y1={yScale(val + err)}
              x2={x}
              y2={yScale(val - err)}
              stroke={color}
              strokeWidth={1.5}
            />
            <line
              x1={x - 6}
              y1={yScale(val + err)}
              x2={x + 6}
              y2={yScale(val + err)}
              stroke={color}
              strokeWidth={1.5}
            />
            <line
              x1={x - 6}
              y1={yScale(val - err)}
              x2={x + 6}
              y2={yScale(val - err)}
              stroke={color}
              strokeWidth={1.5}
            />
            <text
              x={x}
              y={barY - 5}
              textAnchor="middle"
              fill={color}
              fontSize={10}
              fontWeight="bold"
            >
              {val.toFixed(1)}
            </text>
            <text
              x={x}
              y={height - padding.b + 15}
              textAnchor="middle"
              fill="rgba(212,175,55,0.8)"
              fontSize={10}
            >
              {MATERIAL_LABELS[d.material]}
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
