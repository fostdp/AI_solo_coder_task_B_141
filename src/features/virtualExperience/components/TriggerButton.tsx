import { Zap, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TriggerButtonProps } from "../types";

export function TriggerButton({
  isTriggering,
  isPlaying,
  onTrigger,
  onReset,
  disabled = false,
}: TriggerButtonProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={onTrigger}
        disabled={isTriggering || isPlaying || disabled}
        className={cn(
          "relative px-8 py-4 rounded-lg font-serif text-lg font-bold transition-all duration-300",
          "bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500 text-ink-950",
          "hover:from-gold-400 hover:via-gold-300 hover:to-gold-400",
          "shadow-gold hover:shadow-[0_0_40px_rgba(212,175,55,0.6)]",
          "active:translate-y-[2px]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-gold",
          (isTriggering || isPlaying) && "animate-pulse"
        )}
      >
        <Zap className="w-5 h-5 inline mr-2" />
        {isTriggering ? "计算中..." : isPlaying ? "地震进行中..." : "触发地震"}
      </button>
      <button
        onClick={onReset}
        disabled={isTriggering || disabled}
        className="bronze-btn px-6 py-4 text-lg"
      >
        <RotateCcw className="w-5 h-5 inline mr-2" />
        重置
      </button>
    </div>
  );
}
