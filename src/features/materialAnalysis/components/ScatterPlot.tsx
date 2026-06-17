import { MATERIAL_LABELS, type ScatterPlotProps } from "../types";

export function ScatterPlot({
  data,
  xField,
  yField,
  xLabel,
  yLabel,
  colors,
}: ScatterPlotProps) {
  const width = 320;
  const height = 240;
  const padding = { l: 40, r: 20, t: 20, b: 40 };
  const plotW = width - padding.l - padding.r;
  const plotH = height - padding.t - padding.b;

  const maxX = Math.max(...data.map((d) => d[xField])) * 1.2;
  const maxY = 1.0;

  const xScale = (v: number) => padding.l + (v / maxX) * plotW;
  const yScale = (v: number) => padding.t + plotH - (v / maxY) * plotH;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = padding.t + t * plotH;
        const x = padding.l + t * plotW;
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
            <line
              x1={x}
              y1={padding.t}
              x2={x}
              y2={height - padding.b}
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
              {(maxY * (1 - t)).toFixed(2)}
            </text>
            <text
              x={x}
              y={height - padding.b + 15}
              textAnchor="middle"
              fill="rgba(212,175,55,0.6)"
              fontSize={10}
            >
              {(maxX * t).toFixed(2)}
            </text>
          </g>
        );
      })}

      <line
        x1={padding.l}
        y1={yScale(0.5)}
        x2={xScale(maxX)}
        y2={yScale(0.5)}
        stroke="rgba(212,175,55,0.3)"
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <line
        x1={xScale(0.1)}
        y1={padding.t}
        x2={xScale(0.1)}
        y2={height - padding.b}
        stroke="rgba(194,59,34,0.3)"
        strokeWidth={1}
        strokeDasharray="4,4"
      />

      {data.map((d) => {
        const x = xScale(d[xField]);
        const y = yScale(d[yField]);
        const color = colors[d.material];
        return (
          <g key={d.material}>
            <circle
              cx={x}
              cy={y}
              r={12}
              fill={color}
              fillOpacity={0.2}
              stroke={color}
              strokeWidth={1}
            />
            <circle
              cx={x}
              cy={y}
              r={6}
              fill={color}
              stroke={color}
              strokeWidth={2}
            />
            <text
              x={x}
              y={y - 16}
              textAnchor="middle"
              fill={color}
              fontSize={10}
              fontWeight="bold"
            >
              {MATERIAL_LABELS[d.material]}
            </text>
            <title>
              {MATERIAL_LABELS[d.material]}: {yLabel}={(d[yField] * 100).toFixed(1)}%, {xLabel}={(d[xField] * 100).toFixed(1)}%
            </title>
          </g>
        );
      })}

      <text
        x={width / 2}
        y={height - 8}
        textAnchor="middle"
        fill="rgba(212,175,55,0.7)"
        fontSize={10}
      >
        {xLabel}
      </text>
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
