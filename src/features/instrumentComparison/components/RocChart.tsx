import type { RocChartProps } from "../types";

export function RocChart({ rocData }: RocChartProps) {
  const width = 600;
  const height = 320;
  const padding = { l: 48, r: 20, t: 20, b: 36 };
  const plotW = width - padding.l - padding.r;
  const plotH = height - padding.t - padding.b;

  const toX = (fpr: number) => padding.l + fpr * plotW;
  const toY = (tpr: number) => padding.t + (1 - tpr) * plotH;

  return (
    <div className="w-full bg-ink-950/60 rounded-md border border-bronze-700/30 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          {rocData.map((item) => (
            <linearGradient
              key={`grad-${item.key}`}
              id={`roc-grad-${item.key}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={item.color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={item.color} stopOpacity="0.6" />
            </linearGradient>
          ))}
        </defs>

        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
          <g key={v}>
            <line
              x1={toX(0)}
              y1={toY(v)}
              x2={toX(1)}
              y2={toY(v)}
              stroke="rgba(212,175,55,0.12)"
              strokeWidth="1"
            />
            <line
              x1={toX(v)}
              y1={toY(0)}
              x2={toX(v)}
              y2={toY(1)}
              stroke="rgba(212,175,55,0.12)"
              strokeWidth="1"
            />
            <text
              x={toX(v)}
              y={toY(0) + 16}
              fill="rgba(212,175,55,0.7)"
              fontSize="10"
              textAnchor="middle"
            >
              {v.toFixed(1)}
            </text>
            <text
              x={toX(0) - 8}
              y={toY(v) + 3}
              fill="rgba(212,175,55,0.7)"
              fontSize="10"
              textAnchor="end"
            >
              {v.toFixed(1)}
            </text>
          </g>
        ))}

        <line
          x1={toX(0)}
          y1={toY(0)}
          x2={toX(1)}
          y2={toY(1)}
          stroke="rgba(212,175,55,0.3)"
          strokeWidth="1"
          strokeDasharray="4,4"
        />

        {rocData.map((item) => {
          const path = item.roc
            .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.fpr)} ${toY(p.tpr)}`)
            .join(" ");
          return (
            <g key={item.key}>
              <path
                d={path}
                fill="none"
                stroke={`url(#roc-grad-${item.key})`}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {item.roc.map((p) => (
                <circle
                  key={`${item.key}-${p.threshold}`}
                  cx={toX(p.fpr)}
                  cy={toY(p.tpr)}
                  r="1.5"
                  fill={item.color}
                  opacity="0.4"
                />
              ))}
            </g>
          );
        })}

        {rocData.map((item) => {
          const opt = item.roc.find(
            (p) => Math.abs(p.threshold - item.optimalThreshold) < 0.2
          ) ?? item.roc[0];
          return (
            <g key={`opt-${item.key}`}>
              <circle
                cx={toX(opt.fpr)}
                cy={toY(opt.tpr)}
                r="6"
                fill={item.color}
                opacity="0.3"
              />
              <circle
                cx={toX(opt.fpr)}
                cy={toY(opt.tpr)}
                r="4"
                fill="#C23B22"
                stroke="white"
                strokeWidth="1"
              />
            </g>
          );
        })}

        <rect
          x={padding.l}
          y={padding.t}
          width={plotW}
          height={plotH}
          fill="none"
          stroke="rgba(212,175,55,0.5)"
          strokeWidth="1"
        />

        <text
          x={width / 2}
          y={height - 8}
          fill="rgba(212,175,55,0.9)"
          fontSize="11"
          textAnchor="middle"
        >
          假阳性率 (FPR)
        </text>
        <text
          x={14}
          y={height / 2}
          fill="rgba(212,175,55,0.9)"
          fontSize="11"
          textAnchor="middle"
          transform={`rotate(-90, 14, ${height / 2})`}
        >
          真阳性率 (TPR)
        </text>
      </svg>
    </div>
  );
}
