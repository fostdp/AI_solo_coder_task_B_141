import { Sliders, Scale, Activity, Target, CircleGauge, Loader2, CheckSquare, Square } from "lucide-react";
import { INSTRUMENT_OPTIONS, MATERIAL_OPTIONS, SITE_SOIL_OPTIONS } from "@/types";
import { cn } from "@/lib/utils";
import { useInstrumentComparison } from "./hooks/useInstrumentComparison";
import { RocChart } from "./components/RocChart";
import { MiniHeatmap } from "./components/MiniHeatmap";
import {
  INSTRUMENT_COLORS,
  INSTRUMENT_LABELS,
  MATERIAL_LABELS,
} from "./types";

export default function InstrumentComparison() {
  const {
    magnitudeMin,
    setMagnitudeMin,
    magnitudeMax,
    setMagnitudeMax,
    distanceMin,
    setDistanceMin,
    distanceMax,
    setDistanceMax,
    siteSoil,
    setSiteSoil,
    gridSteps,
    setGridSteps,
    monteCarloTrials,
    setMonteCarloTrials,
    selectedInstruments,
    selectedMaterials,
    result,
    loading,
    hoveredMetric,
    setHoveredMetric,
    soilAmp,
    toggleInstrument,
    toggleMaterial,
    handleRunAnalysis,
    heatmapGrids,
    rocData,
  } = useInstrumentComparison();

  return (
    <div className="space-y-5">
      <div className="bronze-panel p-5">
        <div className="card-heading">
          <Sliders className="w-4 h-4 text-gold-500" />
          <span>仪器对比参数配置</span>
          <span className="text-bronze-500 text-sm ml-auto">多仪器灵敏度对比分析</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="form-label mb-0">最小震级 (M)</label>
                  <span className="text-xs text-gold-400 font-mono tabular-nums">{magnitudeMin}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={magnitudeMin}
                  onChange={(e) => setMagnitudeMin(parseFloat(e.target.value))}
                  className="w-full accent-gold-500"
                  disabled={loading}
                />
              </div>
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="form-label mb-0">最大震级 (M)</label>
                  <span className="text-xs text-gold-400 font-mono tabular-nums">{magnitudeMax}</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={10}
                  step={0.5}
                  value={magnitudeMax}
                  onChange={(e) => setMagnitudeMax(parseFloat(e.target.value))}
                  className="w-full accent-gold-500"
                  disabled={loading}
                />
              </div>
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="form-label mb-0">最小距离 (km)</label>
                  <span className="text-xs text-gold-400 font-mono tabular-nums">{distanceMin}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={distanceMin}
                  onChange={(e) => setDistanceMin(parseFloat(e.target.value))}
                  className="w-full accent-gold-500"
                  disabled={loading}
                />
              </div>
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="form-label mb-0">最大距离 (km)</label>
                  <span className="text-xs text-gold-400 font-mono tabular-nums">{distanceMax}</span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={1500}
                  step={50}
                  value={distanceMax}
                  onChange={(e) => setDistanceMax(parseFloat(e.target.value))}
                  className="w-full accent-gold-500"
                  disabled={loading}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="form-label mb-0 flex items-center gap-1.5">
                  场地土类型
                </label>
                <span className="text-xs text-gold-400 font-mono tabular-nums">×{soilAmp.toFixed(2)}</span>
              </div>
              <select
                value={siteSoil}
                onChange={(e) => setSiteSoil(e.target.value as typeof siteSoil)}
                disabled={loading}
                className="w-full h-9 rounded-md border border-bronze-700/40 bg-ink-950/60 px-3 text-sm text-bronze-100 focus:border-gold-500/60 focus:outline-none"
              >
                {SITE_SOIL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} · 放大 {opt.amplification.toFixed(2)}x
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="form-label mb-0">网格步数</label>
                <span className="text-xs text-gold-400 font-mono tabular-nums">{gridSteps} × {gridSteps}</span>
              </div>
              <input
                type="range"
                min={6}
                max={24}
                step={2}
                value={gridSteps}
                onChange={(e) => setGridSteps(parseInt(e.target.value))}
                className="w-full accent-gold-500"
                disabled={loading}
              />
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="form-label mb-0">Monte Carlo 试验次数</label>
                <span className="text-xs text-gold-400 font-mono tabular-nums">{monteCarloTrials.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={50}
                max={1000}
                step={50}
                value={monteCarloTrials}
                onChange={(e) => setMonteCarloTrials(parseInt(e.target.value))}
                className="w-full accent-gold-500"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="form-label mb-2 flex items-center gap-1.5">
                <Scale className="w-3 h-3" />
                仪器选择
              </label>
              <div className="space-y-2">
                {INSTRUMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggleInstrument(opt.value)}
                    disabled={loading}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md border text-left text-sm transition-all",
                      selectedInstruments.includes(opt.value)
                        ? "border-gold-500/60 bg-gold-500/10 text-gold-300"
                        : "border-bronze-700/40 bg-ink-950/40 text-bronze-300/70 hover:border-bronze-500/40"
                    )}
                  >
                    {selectedInstruments.includes(opt.value) ? (
                      <CheckSquare className="w-4 h-4 text-gold-500" />
                    ) : (
                      <Square className="w-4 h-4 text-bronze-500/50" />
                    )}
                    <span className="font-serif">{opt.label}</span>
                    <span className="ml-auto text-xs font-mono opacity-70">
                      {opt.sensitivityFactor.toFixed(1)}×
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label mb-2 flex items-center gap-1.5">
                <Activity className="w-3 h-3" />
                材料选择
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MATERIAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggleMaterial(opt.value)}
                    disabled={loading}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm transition-all",
                      selectedMaterials.includes(opt.value)
                        ? "border-gold-500/60 bg-gold-500/10 text-gold-300"
                        : "border-bronze-700/40 bg-ink-950/40 text-bronze-300/70 hover:border-bronze-500/40"
                    )}
                  >
                    {selectedMaterials.includes(opt.value) ? (
                      <CheckSquare className="w-3.5 h-3.5 text-gold-500" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-bronze-500/50" />
                    )}
                    <span className="font-serif">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-bronze-700/30 flex items-center justify-between">
          <div className="text-xs text-bronze-400/70">
            已选仪器: <span className="text-gold-400">{selectedInstruments.length}</span> /{" "}
            已选材料: <span className="text-gold-400">{selectedMaterials.length}</span>
          </div>
          <button
            onClick={handleRunAnalysis}
            disabled={loading || selectedInstruments.length === 0 || selectedMaterials.length === 0}
            className="bronze-btn-primary shadow-gold disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CircleGauge className="w-4 h-4" />
            )}
            <span className="font-serif">
              {loading ? "对比分析中..." : "运行对比分析"}
            </span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="bronze-panel p-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-gold-500 animate-spin" />
          <div className="text-gold-400 font-serif text-lg">正在执行 Monte Carlo 模拟分析...</div>
          <div className="text-bronze-400/70 text-sm">
            试验次数: {monteCarloTrials.toLocaleString()} · 网格: {gridSteps} × {gridSteps}
          </div>
        </div>
      )}

      {result && !loading && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bronze-panel p-5">
              <div className="card-heading">
                <Target className="w-4 h-4 text-gold-500" />
                <span>ROC 曲线叠加对比</span>
                <span className="text-bronze-500 text-sm ml-auto">
                  震级 {magnitudeMin}-{magnitudeMax} × 距离 {distanceMin}-{distanceMax}km
                </span>
              </div>
              <RocChart rocData={rocData} />
              <div className="mt-4 flex flex-wrap gap-4">
                {rocData.map((item) => (
                  <div key={item.key} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-bronze-300">{item.label}</span>
                    <span className="text-gold-400 font-mono">
                      J = {item.youdenJ.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bronze-panel p-5">
              <div className="card-heading">
                <Activity className="w-4 h-4 text-gold-500" />
                <span>ROC 关键指标</span>
              </div>
              <div className="space-y-3">
                {rocData.map((item) => {
                  const optPoint = item.roc.find(
                    (p) => Math.abs(p.threshold - item.optimalThreshold) < 0.2
                  ) ?? item.roc[0];
                  const auc = item.roc.length > 1
                    ? item.roc.slice(0, -1).reduce((s, p, i) => {
                        const n = item.roc[i + 1];
                        return s + (p.fpr - n.fpr) * (p.tpr + n.tpr) / 2;
                      }, 0)
                    : 0;
                  return (
                    <div
                      key={item.key}
                      className="p-3 rounded-md border border-bronze-700/30 bg-ink-950/40 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gold-400 font-serif text-sm font-semibold">
                          {item.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-bronze-400/70">AUC</div>
                          <div className="text-gold-400 font-mono">{auc.toFixed(3)}</div>
                        </div>
                        <div>
                          <div className="text-bronze-400/70">最优阈值</div>
                          <div className="text-gold-400 font-mono">{item.optimalThreshold.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-bronze-400/70">TPR @ 最优</div>
                          <div className="text-gold-400 font-mono">{optPoint.tpr.toFixed(3)}</div>
                        </div>
                        <div>
                          <div className="text-bronze-400/70">FPR @ 最优</div>
                          <div className="text-gold-400 font-mono">{optPoint.fpr.toFixed(3)}</div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-bronze-400/70">Youden J 指数</div>
                          <div className="text-gold-400 font-mono text-lg">{item.youdenJ.toFixed(4)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bronze-panel p-5">
            <div className="card-heading">
              <Activity className="w-4 h-4 text-gold-500" />
              <span>检测概率热力图对比</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.comparisons.map((comp) => {
                const key = `${comp.instrument}-${comp.material}`;
                const grid = heatmapGrids.get(key);
                if (!grid) return null;
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: INSTRUMENT_COLORS[comp.instrument] }}
                        />
                        <span className="text-gold-400 font-serif text-sm font-semibold">
                          {INSTRUMENT_LABELS[comp.instrument]}
                        </span>
                      </div>
                      <span className="text-xs text-bronze-400/70">
                        {MATERIAL_LABELS[comp.material]}
                      </span>
                    </div>
                    <MiniHeatmap
                      grid={grid}
                      title={`检测概率 ${(comp.avg_detection_probability * 100).toFixed(1)}%`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bronze-panel p-5">
            <div className="card-heading">
              <Scale className="w-4 h-4 text-gold-500" />
              <span>仪器关键指标对比</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bronze-700/40">
                    <th className="text-left py-3 px-3 text-bronze-300/80 font-medium">仪器名称</th>
                    <th className="text-left py-3 px-3 text-bronze-300/80 font-medium">材料</th>
                    <th className="text-right py-3 px-3 text-bronze-300/80 font-medium">灵敏度系数</th>
                    <th className="text-right py-3 px-3 text-bronze-300/80 font-medium">检测面积 (km²)</th>
                    <th className="text-right py-3 px-3 text-bronze-300/80 font-medium">平均检测概率</th>
                    <th className="text-right py-3 px-3 text-bronze-300/80 font-medium">平均误报率</th>
                    <th className="text-right py-3 px-3 text-bronze-300/80 font-medium">平均触发时间 (s)</th>
                    <th className="text-right py-3 px-3 text-bronze-300/80 font-medium">Youden J</th>
                  </tr>
                </thead>
                <tbody>
                  {result.comparisons.map((comp) => (
                    <tr
                      key={`${comp.instrument}-${comp.material}`}
                      onMouseEnter={() => setHoveredMetric(comp)}
                      onMouseLeave={() => setHoveredMetric(null)}
                      className={cn(
                        "border-b border-bronze-700/20 transition-colors",
                        hoveredMetric?.instrument === comp.instrument &&
                        hoveredMetric?.material === comp.material
                          ? "bg-gold-500/5"
                          : "hover:bg-bronze-700/10"
                      )}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: INSTRUMENT_COLORS[comp.instrument] }}
                          />
                          <span className="font-serif text-gold-300">
                            {INSTRUMENT_LABELS[comp.instrument]}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-bronze-300 font-serif">
                        {MATERIAL_LABELS[comp.material]}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gold-400">
                        {comp.sensitivity_factor.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-bronze-200">
                        {Math.round(comp.detection_area_km2).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-400">
                        {(comp.avg_detection_probability * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-cinnabar-400">
                        {(comp.avg_false_alarm_rate * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-bronze-200">
                        {comp.avg_trigger_time_sec.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gold-400 font-semibold">
                        {comp.youden_j.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="bronze-panel p-12 flex flex-col items-center justify-center gap-3 text-center">
          <Scale className="w-12 h-12 text-bronze-500/50" />
          <div className="text-bronze-400 font-serif text-lg">请配置参数后运行对比分析</div>
          <div className="text-bronze-500/70 text-sm max-w-md">
            选择需要对比的仪器和材料，设置震级范围、距离范围、场地土类型等参数，
            点击"运行对比分析"按钮开始多仪器灵敏度对比。
          </div>
        </div>
      )}
    </div>
  );
}
