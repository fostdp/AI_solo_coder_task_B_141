import { useState, useEffect, useMemo } from "react";
import {
  Settings2,
  Play,
  Loader2,
  AlertTriangle,
  Beaker,
  BarChart3,
  ScatterChart,
  Radar,
  Table2,
  Layers,
  Gauge,
  CheckSquare,
  Square,
} from "lucide-react";
import { runMaterialAnalysis } from "@/lib/api";
import {
  MATERIAL_OPTIONS,
  SITE_SOIL_OPTIONS,
  INSTRUMENT_OPTIONS,
  type MaterialType,
  type SiteSoilType,
  type InstrumentType,
  type MaterialAnalysisResult,
  type MaterialMetrics,
} from "@/types";
import { cn } from "@/lib/utils";

const MATERIAL_COLORS: Record<MaterialType, string> = {
  copper: "#D4AF37",
  iron: "#708090",
  wood: "#8B4513",
  steel: "#B0C4DE",
};

const MATERIAL_LABELS: Record<MaterialType, string> = {
  copper: "青铜",
  iron: "熟铁",
  wood: "硬木",
  steel: "钢材",
};

type PageStatus = "idle" | "loading" | "result" | "error";

export default function MaterialAnalysis() {
  const [referenceMaterial, setReferenceMaterial] = useState<MaterialType>("copper");
  const [testMaterials, setTestMaterials] = useState<MaterialType[]>(["copper", "iron", "wood", "steel"]);
  const [magnitude, setMagnitude] = useState(5.5);
  const [distance, setDistance] = useState(100);
  const [trials, setTrials] = useState(20);
  const [siteSoil, setSiteSoil] = useState<SiteSoilType>("II");
  const [instrument, setInstrument] = useState<InstrumentType>("didongyi");
  const [status, setStatus] = useState<PageStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MaterialAnalysisResult | null>(null);

  const toggleMaterial = (mat: MaterialType) => {
    setTestMaterials((prev) =>
      prev.includes(mat) ? prev.filter((m) => m !== mat) : [...prev, mat]
    );
  };

  const handleRunAnalysis = async () => {
    if (testMaterials.length === 0) {
      setError("请至少选择一种测试材料");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const data = await runMaterialAnalysis({
        reference_material: referenceMaterial,
        test_materials: testMaterials,
        magnitude,
        distance,
        trials,
        site_soil: siteSoil,
        instrument,
      });
      setResult(data);
      setStatus("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析失败，请重试");
      setStatus("error");
    }
  };

  useEffect(() => {
    handleRunAnalysis();
  }, []);

  return (
    <div className="space-y-5">
      <div className="bronze-panel p-5">
        <div className="card-heading">
          <Settings2 className="w-4 h-4 text-gold-500" />
          <span>材料分析参数配置</span>
          <span className="text-bronze-500 text-sm ml-auto">都柱材料响应对比分析</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="form-label">参考材料</label>
            <select
              value={referenceMaterial}
              onChange={(e) => setReferenceMaterial(e.target.value as MaterialType)}
              disabled={status === "loading"}
              className="w-full h-9 rounded-md border border-bronze-700/40 bg-ink-950/60 px-3 text-sm text-bronze-100 focus:border-gold-500/60 focus:outline-none"
            >
              {MATERIAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">地震震级 (M)</label>
            <input
              type="number"
              className="form-input"
              min={2}
              max={9}
              step={0.1}
              value={magnitude}
              onChange={(e) => setMagnitude(parseFloat(e.target.value))}
              disabled={status === "loading"}
            />
          </div>

          <div>
            <label className="form-label">震中距 (km)</label>
            <input
              type="number"
              className="form-input"
              min={10}
              max={1000}
              step={10}
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value))}
              disabled={status === "loading"}
            />
          </div>

          <div>
            <label className="form-label">试验次数</label>
            <input
              type="number"
              className="form-input"
              min={5}
              max={100}
              step={5}
              value={trials}
              onChange={(e) => setTrials(parseInt(e.target.value))}
              disabled={status === "loading"}
            />
          </div>

          <div>
            <label className="form-label flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              场地土类型
            </label>
            <select
              value={siteSoil}
              onChange={(e) => setSiteSoil(e.target.value as SiteSoilType)}
              disabled={status === "loading"}
              className="w-full h-9 rounded-md border border-bronze-700/40 bg-ink-950/60 px-3 text-sm text-bronze-100 focus:border-gold-500/60 focus:outline-none"
            >
              {SITE_SOIL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label flex items-center gap-1.5">
              <Gauge className="w-3 h-3" />
              仪器类型
            </label>
            <select
              value={instrument}
              onChange={(e) => setInstrument(e.target.value as InstrumentType)}
              disabled={status === "loading"}
              className="w-full h-9 rounded-md border border-bronze-700/40 bg-ink-950/60 px-3 text-sm text-bronze-100 focus:border-gold-500/60 focus:outline-none"
            >
              {INSTRUMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="form-label flex items-center gap-1.5">
              <Beaker className="w-3 h-3" />
              测试材料（多选）
            </label>
            <div className="flex flex-wrap gap-2">
              {MATERIAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleMaterial(opt.value)}
                  disabled={status === "loading"}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-all",
                    testMaterials.includes(opt.value)
                      ? "border-gold-500/60 bg-gold-500/10 text-gold-400"
                      : "border-bronze-700/30 bg-ink-900/30 text-bronze-300 hover:border-bronze-600/50"
                  )}
                >
                  {testMaterials.includes(opt.value) ? (
                    <CheckSquare className="w-3.5 h-3.5" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: MATERIAL_COLORS[opt.value] }}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleRunAnalysis}
            disabled={status === "loading"}
            className="bronze-btn-primary shadow-gold disabled:opacity-50"
          >
            {status === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span className="font-serif">
              {status === "loading" ? "分析计算中..." : "运行材料分析"}
            </span>
          </button>
          {result && (
            <span className="text-xs text-bronze-400 font-mono">
              请求ID: {result.request_id}
            </span>
          )}
        </div>
      </div>

      {status === "error" && (
        <div className="bronze-panel p-5 border-cinnabar-500/40">
          <div className="flex items-center gap-3 text-cinnabar-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {status === "loading" && (
        <div className="bronze-panel p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-gold-500 animate-spin mb-4" />
          <p className="text-bronze-300 font-serif">正在进行材料响应分析...</p>
          <p className="text-xs text-bronze-500 mt-2">
            对 {testMaterials.length} 种材料进行 {trials} 次蒙特卡洛试验
          </p>
        </div>
      )}

      {status === "result" && result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {result.material_metrics.map((metrics) => (
              <MaterialSummaryCard
                key={metrics.material}
                metrics={metrics}
                isReference={metrics.material === referenceMaterial}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bronze-panel p-5">
              <div className="card-heading">
                <BarChart3 className="w-4 h-4 text-gold-500" />
                <span>触发时间分布</span>
              </div>
              <BoxplotChart
                data={result.material_metrics}
                field="trigger_times"
                yLabel="触发时间 (秒)"
                colors={MATERIAL_COLORS}
              />
            </div>

            <div className="bronze-panel p-5">
              <div className="card-heading">
                <BarChart3 className="w-4 h-4 text-gold-500" />
                <span>最大摆动角度</span>
              </div>
              <BarChartWithErrorBars
                data={result.material_metrics}
                valueField="avg_max_angle_deg"
                errorField="max_angle_std"
                yLabel="角度 (°)"
                colors={MATERIAL_COLORS}
              />
            </div>

            <div className="bronze-panel p-5">
              <div className="card-heading">
                <ScatterChart className="w-4 h-4 text-gold-500" />
                <span>检测概率 vs 误报率</span>
              </div>
              <ScatterPlot
                data={result.material_metrics}
                xField="false_alarm_rate"
                yField="detection_probability"
                xLabel="误报率"
                yLabel="检测概率"
                colors={MATERIAL_COLORS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bronze-panel p-5">
              <div className="card-heading">
                <Radar className="w-4 h-4 text-gold-500" />
                <span>综合性能雷达图</span>
              </div>
              <RadarChart
                data={result.material_metrics}
                referenceMaterial={referenceMaterial}
                colors={MATERIAL_COLORS}
              />
            </div>

            <div className="bronze-panel p-5">
              <div className="card-heading">
                <Table2 className="w-4 h-4 text-gold-500" />
                <span>关键指标对比</span>
              </div>
              <MetricsTable data={result.material_metrics} />
            </div>
          </div>

          <div className="bronze-panel p-5">
            <div className="card-heading">
              <Table2 className="w-4 h-4 text-gold-500" />
              <span>详细数据表格</span>
            </div>
            <DetailedDataTable data={result.material_metrics} />
          </div>
        </>
      )}
    </div>
  );
}

function MaterialSummaryCard({
  metrics,
  isReference,
}: {
  metrics: MaterialMetrics;
  isReference: boolean;
}) {
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

function BoxplotChart({
  data,
  field,
  yLabel,
  colors,
}: {
  data: MaterialMetrics[];
  field: "trigger_times" | "max_angles";
  yLabel: string;
  colors: Record<MaterialType, string>;
}) {
  const width = 320;
  const height = 240;
  const padding = { l: 40, r: 20, t: 20, b: 40 };
  const plotW = width - padding.l - padding.r;
  const plotH = height - padding.t - padding.b;

  const allValues = data.flatMap((d) => d[field]);
  const minVal = Math.min(...allValues) * 0.9;
  const maxVal = Math.max(...allValues) * 1.1;

  const stats = data.map((d) => {
    const values = [...d[field]].sort((a, b) => a - b);
    const q1 = values[Math.floor(values.length * 0.25)];
    const median = values[Math.floor(values.length * 0.5)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;
    const min = Math.max(minVal, q1 - 1.5 * iqr);
    const max = Math.min(maxVal, q3 + 1.5 * iqr);
    return { material: d.material, min, q1, median, q3, max };
  });

  const yScale = (v: number) => padding.t + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;
  const barWidth = plotW / data.length * 0.5;
  const gap = plotW / data.length;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = padding.t + t * plotH;
        const val = maxVal - t * (maxVal - minVal);
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

      {stats.map((s, i) => {
        const x = padding.l + i * gap + gap / 2;
        const color = colors[s.material];
        return (
          <g key={s.material}>
            <line
              x1={x}
              y1={yScale(s.min)}
              x2={x}
              y2={yScale(s.max)}
              stroke={color}
              strokeWidth={1.5}
            />
            <line
              x1={x - barWidth / 4}
              y1={yScale(s.min)}
              x2={x + barWidth / 4}
              y2={yScale(s.min)}
              stroke={color}
              strokeWidth={1.5}
            />
            <line
              x1={x - barWidth / 4}
              y1={yScale(s.max)}
              x2={x + barWidth / 4}
              y2={yScale(s.max)}
              stroke={color}
              strokeWidth={1.5}
            />
            <rect
              x={x - barWidth / 2}
              y={yScale(s.q3)}
              width={barWidth}
              height={yScale(s.q1) - yScale(s.q3)}
              fill={color}
              fillOpacity={0.3}
              stroke={color}
              strokeWidth={1.5}
            />
            <line
              x1={x - barWidth / 2}
              y1={yScale(s.median)}
              x2={x + barWidth / 2}
              y2={yScale(s.median)}
              stroke={color}
              strokeWidth={2}
            />
            <text
              x={x}
              y={height - padding.b + 15}
              textAnchor="middle"
              fill="rgba(212,175,55,0.8)"
              fontSize={10}
            >
              {MATERIAL_LABELS[s.material]}
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

function BarChartWithErrorBars({
  data,
  valueField,
  errorField,
  yLabel,
  colors,
}: {
  data: MaterialMetrics[];
  valueField: "avg_max_angle_deg" | "avg_trigger_time_sec";
  errorField: "max_angle_std" | "trigger_time_std";
  yLabel: string;
  colors: Record<MaterialType, string>;
}) {
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

function ScatterPlot({
  data,
  xField,
  yField,
  xLabel,
  yLabel,
  colors,
}: {
  data: MaterialMetrics[];
  xField: "false_alarm_rate";
  yField: "detection_probability";
  xLabel: string;
  yLabel: string;
  colors: Record<MaterialType, string>;
}) {
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

function RadarChart({
  data,
  referenceMaterial,
  colors,
}: {
  data: MaterialMetrics[];
  referenceMaterial: MaterialType;
  colors: Record<MaterialType, string>;
}) {
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

function MetricsTable({ data }: { data: MaterialMetrics[] }) {
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

function DetailedDataTable({ data }: { data: MaterialMetrics[] }) {
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
