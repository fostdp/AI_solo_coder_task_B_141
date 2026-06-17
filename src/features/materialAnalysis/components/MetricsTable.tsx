import type { MaterialMetrics } from "@/types";
import { cn } from "@/lib/utils";
import { MATERIAL_COLORS, MATERIAL_LABELS, type MetricsTableProps } from "../types";

export function MetricsTable({ data }: MetricsTableProps) {
  const metrics = [
    { key: "density_kgm3", label: "密度", unit: "kg/m³", format: (v: number) => v.toFixed(0) },
    { key: "youngs_modulus_pa", label: "杨氏模量", unit: "GPa", format: (v: number) => (v / 1e9).toFixed(1) },
    { key: "damping_ratio", label: "阻尼比", unit: "", format: (v: number) => v.toFixed(3) },
    { key: "detection_probability", label: "检测概率", unit: "%", format: (v: number) => (v * 100).toFixed(1) },
    { key: "response_ratio", label: "响应比", unit: "", format: (v: number) => v.toFixed(2) },
    { key: "cost_efficiency", label: "成本效率", unit: "", format: (v: number) => v.toFixed(2) },
  ] as const;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bronze-700/30">
            <th className="text-left py-2 px-3 text-bronze-400 font-medium">指标</th>
            {data.map((d) => (
              <th
                key={d.material}
                className="text-center py-2 px-3 font-medium"
                style={{ color: MATERIAL_COLORS[d.material] }}
              >
                {MATERIAL_LABELS[d.material]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.key} className="border-b border-bronze-700/20 hover:bg-bronze-700/10">
              <td className="py-2 px-3 text-bronze-300">
                {m.label}
                {m.unit && <span className="text-bronze-500 text-xs ml-1">({m.unit})</span>}
              </td>
              {data.map((d) => {
                const val = d[m.key as keyof MaterialMetrics] as number;
                const values = data.map((dd) => dd[m.key as keyof MaterialMetrics] as number);
                const maxVal = Math.max(...values);
                const minVal = Math.min(...values);
                const isMax = val === maxVal && m.key !== "damping_ratio" && m.key !== "density_kgm3";
                const isMin = val === minVal && (m.key === "damping_ratio" || m.key === "density_kgm3");
                return (
                  <td
                    key={d.material}
                    className={cn(
                      "py-2 px-3 text-center font-mono tabular-nums",
                      isMax || isMin ? "text-gold-400 font-bold" : "text-bronze-200"
                    )}
                  >
                    {m.format(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
