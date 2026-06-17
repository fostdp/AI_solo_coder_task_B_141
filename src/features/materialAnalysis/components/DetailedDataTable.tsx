import type { MaterialType, MaterialMetrics } from "@/types";
import { cn } from "@/lib/utils";
import { MATERIAL_COLORS, type DetailedDataTableProps } from "../types";

export function DetailedDataTable({ data }: DetailedDataTableProps) {
  const columns = [
    { key: "material", label: "材料", format: (v: MaterialType) => MATERIAL_LABELS[v] },
    { key: "density_kgm3", label: "密度 (kg/m³)", format: (v: number) => v.toFixed(0) },
    { key: "youngs_modulus_pa", label: "杨氏模量 (GPa)", format: (v: number) => (v / 1e9).toFixed(1) },
    { key: "damping_ratio", label: "阻尼比", format: (v: number) => v.toFixed(3) },
    { key: "yield_strength_pa", label: "屈服强度 (MPa)", format: (v: number) => (v / 1e6).toFixed(0) },
    { key: "cost_factor", label: "成本系数", format: (v: number) => v.toFixed(2) },
    { key: "avg_trigger_time_sec", label: "平均触发 (s)", format: (v: number) => v.toFixed(2) },
    { key: "trigger_time_std", label: "触发标准差", format: (v: number) => v.toFixed(2) },
    { key: "avg_max_angle_deg", label: "平均角度 (°)", format: (v: number) => v.toFixed(2) },
    { key: "max_angle_std", label: "角度标准差", format: (v: number) => v.toFixed(2) },
    { key: "detection_probability", label: "检测概率", format: (v: number) => `${(v * 100).toFixed(1)}%` },
    { key: "false_alarm_rate", label: "误报率", format: (v: number) => `${(v * 100).toFixed(1)}%` },
    { key: "response_ratio", label: "响应比", format: (v: number) => v.toFixed(2) },
    { key: "cost_efficiency", label: "成本效率", format: (v: number) => v.toFixed(2) },
  ] as const;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-bronze-700/30">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left py-2 px-2 text-bronze-400 font-medium whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr
              key={d.material}
              className="border-b border-bronze-700/20 hover:bg-bronze-700/10"
            >
              {columns.map((col) => {
                const val = d[col.key as keyof MaterialMetrics];
                return (
                  <td
                    key={col.key}
                    className={cn(
                      "py-2 px-2 whitespace-nowrap font-mono tabular-nums",
                      col.key === "material"
                        ? "font-serif text-sm"
                        : "text-bronze-200"
                    )}
                    style={
                      col.key === "material"
                        ? { color: MATERIAL_COLORS[val as MaterialType] }
                        : undefined
                    }
                  >
                    {col.format(val as never)}
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
