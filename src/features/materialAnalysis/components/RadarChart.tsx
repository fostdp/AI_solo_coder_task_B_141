import type { MaterialMetrics } from "@/types";
import { MATERIAL_LABELS, type RadarChartProps } from "../types";

export function RadarChart({ data, referenceMaterial, colors }: RadarChartProps) {
  const width = 320;
  const height = 280;
  const centerX = width / 2;
  const centerY = height / 2 - 10;
  const radius = 100;

  const axes = [
    { key: "density_kgm3", label: "密度", max: 10000 },
    { key: "youngs_modulus_pa", label: "杨氏模量", max: 250e9 },
    { key: "damping_ratio", label: "阻尼比", max: 0.1 },
    { key: "detection_probability", label: "检测概率", max: 1.0 },
    { key: "response_ratio", label: "响应比", max: 15 },
    { key: "cost_efficiency", label: "成本效率", max: 7 },
  ] as const;

  const n = axes.length;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (value: number, max: number, i: number) => {
    const normalized = Math.min(1, value / max);
    const angle = -Math.PI / 2 + i * angleStep;
    return {
      x: centerX + radius * normalized * Math.cos(angle),
      y: centerY + radius * normalized * Math.sin(angle),
    };
  };

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
      {[0.25, 0.5, 0.75, 1].map((r, i) => (
        <polygon
          key={i}
          points={Array.from({ length: n }, (_, ai) => {
            const p = getPoint(r, 1, ai);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="rgba(212,175,55,0.15)"
          strokeWidth={1}
        />
      ))}

      {axes.map((axis, i) => {
        const p = getPoint(1, 1, i);
        return (
          <g key={axis.key}>
            <line
              x1={centerX}
              y1={centerY}
              x2={p.x}
              y2={p.y}
              stroke="rgba(212,175,55,0.2)"
              strokeWidth={1}
            />
            <text
              x={p.x + (p.x - centerX) * 0.15}
              y={p.y + (p.y - centerY) * 0.15}
              textAnchor="middle"
              fill="rgba(212,175,55,0.8)"
              fontSize={10}
              dominantBaseline="middle"
            >
              {axis.label}
            </text>
          </g>
        );
      })}

      {data.map((d) => {
        const color = colors[d.material];
        const points = axes.map((axis, i) => {
          const val = d[axis.key as keyof MaterialMetrics] as number;
          return getPoint(val, axis.max, i);
        });

        return (
          <g key={d.material}>
            <polygon
              points={points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill={color}
              fillOpacity={d.material === referenceMaterial ? 0.15 : 0.08}
              stroke={color}
              strokeWidth={d.material === referenceMaterial ? 2 : 1}
            />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={d.material === referenceMaterial ? 4 : 3}
                fill={color}
              />
            ))}
          </g>
        );
      })}

      <g transform={`translate(${40}, ${height - 25})`}>
        {data.map((d, i) => (
          <g key={d.material} transform={`translate(${i * 70}, 0)`}>
            <rect
              x={0}
              y={0}
              width={12}
              height={12}
              fill={colors[d.material]}
              fillOpacity={d.material === referenceMaterial ? 0.4 : 0.2}
              stroke={colors[d.material]}
              strokeWidth={1}
            />
            <text
              x={18}
              y={10}
              fill="rgba(212,175,55,0.8)"
              fontSize={9}
            >
              {MATERIAL_LABELS[d.material]}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
