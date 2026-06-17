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
import {
  MATERIAL_OPTIONS,
  SITE_SOIL_OPTIONS,
  INSTRUMENT_OPTIONS,
} from "@/types";
import { cn } from "@/lib/utils";
import { useMaterialAnalysis } from "./hooks/useMaterialAnalysis";
import { MaterialSummaryCard } from "./components/MaterialSummaryCard";
import { BoxplotChart } from "./components/BoxplotChart";
import { BarChartWithErrorBars } from "./components/BarChartWithErrorBars";
import { ScatterPlot } from "./components/ScatterPlot";
import { RadarChart } from "./components/RadarChart";
import { MetricsTable } from "./components/MetricsTable";
import { DetailedDataTable } from "./components/DetailedDataTable";
import { MATERIAL_COLORS } from "./types";

export default function MaterialAnalysis() {
  const {
    referenceMaterial,
    setReferenceMaterial,
    testMaterials,
    magnitude,
    setMagnitude,
    distance,
    setDistance,
    trials,
    setTrials,
    siteSoil,
    setSiteSoil,
    instrument,
    setInstrument,
    status,
    error,
    result,
    toggleMaterial,
    handleRunAnalysis,
  } = useMaterialAnalysis();

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
              onChange={(e) => setReferenceMaterial(e.target.value as typeof referenceMaterial)}
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
              onChange={(e) => setSiteSoil(e.target.value as typeof siteSoil)}
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
              onChange={(e) => setInstrument(e.target.value as typeof instrument)}
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
