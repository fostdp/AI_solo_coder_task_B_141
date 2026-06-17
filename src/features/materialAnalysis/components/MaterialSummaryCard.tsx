import { cn } from "@/lib/utils";
import { MATERIAL_COLORS, MATERIAL_LABELS, type MaterialSummaryCardProps } from "../types";

export function MaterialSummaryCard({ metrics, isReference }: MaterialSummaryCardProps) {
  return (
    <div
      className={cn(
        "value-card relative",
        isReference && "ring-2 ring-gold-500/50 ring-offset-2 ring-offset-ink-900"
      )}
    >
      {isReference && (
        <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 bg-gold-500/20 text-gold-400 rounded font-medium">
          参考基准
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: MATERIAL_COLORS[metrics.material] }}
            />
            <span className="value-label mb-0">{MATERIAL_LABELS[metrics.material]}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-bronze-400/70">密度</span>
              <span className="text-gold-400 font-mono">{(metrics.density_kgm3 / 1000).toFixed(2)} g/cm³</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-bronze-400/70">检测概率</span>
              <span className="text-emerald-400 font-mono">{(metrics.detection_probability * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-bronze-400/70">平均触发</span>
              <span className="text-gold-400 font-mono">{metrics.avg_trigger_time_sec.toFixed(2)}s</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-bronze-400/70">成本效率</span>
              <span className="text-gold-400 font-mono">{metrics.cost_efficiency.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
