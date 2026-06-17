import { cn } from "@/lib/utils";
import { DIRECTION_NAMES } from "@/types";
import { DIRECTION_ANGLES } from "../types";
import type { DirectionCompassProps } from "../types";

export function DirectionCompass({
  earthquakeDirection,
  onDirectionChange,
  disabled = false,
}: DirectionCompassProps) {
  const handleDirectionClick = (index: number) => {
    if (disabled) return;
    onDirectionChange(DIRECTION_ANGLES[index]);
  };

  const handleAngleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onDirectionChange(parseFloat(e.target.value));
  };

  return (
    <>
      <div className="relative w-36 h-36 mx-auto mb-3">
        <div className="absolute inset-0 rounded-full border-2 border-gold-500/40 bg-ink-900/50" />
        {DIRECTION_NAMES.map((name, i) => {
          const angle = (DIRECTION_ANGLES[i] * Math.PI) / 180;
          const radius = 58;
          const x = 72 + Math.sin(angle) * radius;
          const y = 72 - Math.cos(angle) * radius;
          const isSelected = earthquakeDirection === DIRECTION_ANGLES[i];
          return (
            <button
              key={name}
              onClick={() => handleDirectionClick(i)}
              disabled={disabled}
              className={cn(
                "absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full text-xs font-serif transition-all duration-200",
                isSelected
                  ? "bg-gold-500 text-ink-950 shadow-gold scale-110"
                  : "bg-bronze-700/50 text-bronze-200 hover:bg-bronze-600/60 hover:text-gold-400 border border-bronze-500/30"
              )}
              style={{ left: `${x}px`, top: `${y}px` }}
            >
              {name}
            </button>
          );
        })}
        <div
          className="absolute top-1/2 left-1/2 w-1 h-10 bg-gradient-to-t from-gold-500 to-gold-400 origin-bottom rounded-full shadow-gold"
          style={{
            transform: `translate(-50%, -100%) rotate(${earthquakeDirection}deg)`,
            transition: "transform 0.3s ease",
          }}
        />
        <div className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500 shadow-gold" />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-bronze-300 whitespace-nowrap">角度:</span>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={earthquakeDirection}
          onChange={handleAngleChange}
          disabled={disabled}
          className="flex-1 accent-gold-500"
        />
        <span className="text-xs font-mono text-gold-400 w-12 text-right">
          {earthquakeDirection}°
        </span>
      </div>
    </>
  );
}
