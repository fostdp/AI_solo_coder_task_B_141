import type { MiniHeatmapProps } from "../types";

export function MiniHeatmap({ grid, title }: MiniHeatmapProps) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const valueToColor = (v: number): string => {
    const clamped = Math.max(0, Math.min(1, v));
    if (clamped < 0.33) {
      const t = clamped / 0.33;
      const r = Math.floor(10 + (135 - 10) * t);
      const g = Math.floor(14 + (72 - 14) * t);
      const b = Math.floor(39 + (31 - 39) * t);
      return `rgb(${r},${g},${b})`;
    } else if (clamped < 0.66) {
      const t = (clamped - 0.33) / 0.33;
      const r = Math.floor(135 + (212 - 135) * t);
      const g = Math.floor(72 + (175 - 72) * t);
      const b = Math.floor(31 + (55 - 31) * t);
      return `rgb(${r},${g},${b})`;
    } else {
      const t = (clamped - 0.66) / 0.34;
      const r = Math.floor(212 + (194 - 212) * t);
      const g = Math.floor(175 + (59 - 175) * t);
      const b = Math.floor(55 + (34 - 55) * t);
      return `rgb(${r},${g},${b})`;
    }
  };

  return (
    <div className="bg-ink-950/60 rounded-md border border-bronze-700/30 p-2">
      <div className="text-xs text-gold-400/80 font-serif text-center mb-2">{title}</div>
      <div className="flex flex-col">
        {grid.map((row, r) => (
          <div key={r} className="flex">
            {row.map((cell, c) => (
              <div
                key={c}
                className="flex-1 aspect-square"
                style={{ backgroundColor: valueToColor(cell.value) }}
                title={`震级: ${cell.magnitude.toFixed(1)}M · 距离: ${cell.distance.toFixed(0)}km · 概率: ${(cell.value * 100).toFixed(1)}%`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-bronze-500/70 px-1">
        <span>{grid[0]?.[0]?.magnitude.toFixed(1)}M</span>
        <span>{grid[0]?.[cols - 1]?.magnitude.toFixed(1)}M</span>
      </div>
    </div>
  );
}
