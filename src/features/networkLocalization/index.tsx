import {
  MapPin,
  Plus,
  Trash2,
  Zap,
  Target,
  Radio,
  RotateCcw,
  Crosshair,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNetworkLocalization } from "./hooks/useNetworkLocalization";
import { LocalizationMap } from "./components/LocalizationMap";
import { METHOD_OPTIONS } from "./types";

export default function NetworkLocalization() {
  const {
    stations,
    method,
    setMethod,
    readings,
    localizationResult,
    isProcessing,
    quakeParams,
    setQuakeParams,
    addStation,
    removeStation,
    updateStation,
    runLocalizationProcess,
    triggerRandomQuake,
    resetAll,
    coordToSvg,
    mapSize,
  } = useNetworkLocalization();

  return (
    <div className="space-y-4">
      <div className="bronze-panel p-4">
        <div className="card-heading">
          <Crosshair className="w-4 h-4 text-gold-500" />
          <span>定位方法选择</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {METHOD_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setMethod(opt.value)}
                className={cn(
                  "relative text-left rounded-lg border px-4 py-3 transition-all duration-200",
                  method === opt.value
                    ? "border-gold-500/60 bg-gold-500/10 shadow-inner"
                    : "border-bronze-700/30 bg-ink-900/30 hover:border-bronze-600/50 hover:bg-bronze-900/20"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      "w-4 h-4",
                      method === opt.value ? "text-gold-400" : "text-bronze-400"
                    )}
                  />
                  <span className="font-serif text-sm text-bronze-100">{opt.label}</span>
                </div>
                <div className="text-[10px] text-bronze-400/70 mt-1">{opt.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <div className="bronze-panel p-4 max-h-[500px] overflow-y-auto">
            <div className="card-heading">
              <MapPin className="w-4 h-4 text-gold-500" />
              <span>台站配置</span>
              <button
                onClick={addStation}
                className="ml-auto bronze-btn !px-2 !py-1 text-xs"
              >
                <Plus className="w-3 h-3" />
                添加
              </button>
            </div>
            <div className="space-y-3">
              {stations.map((station) => (
                <div
                  key={station.device_id}
                  className={cn(
                    "rounded-lg border p-3 transition-all",
                    readings.some((r) => r.device_id === station.device_id)
                      ? "border-cinnabar-500/50 bg-cinnabar-500/5"
                      : "border-bronze-700/30 bg-ink-900/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CircleDot
                        className={cn(
                          "w-3 h-3",
                          readings.some((r) => r.device_id === station.device_id)
                            ? "text-cinnabar-400"
                            : "text-bronze-400"
                        )}
                      />
                      <span className="font-mono text-sm text-gold-300">{station.device_id}</span>
                    </div>
                    <button
                      onClick={() => removeStation(station.device_id)}
                      className="text-bronze-500 hover:text-cinnabar-400 transition-colors"
                      disabled={stations.length <= 2}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="form-label">设备ID</label>
                      <input
                        type="text"
                        className="form-input text-xs"
                        value={station.device_id}
                        onChange={(e) => updateStation(station.device_id, "device_id", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="form-label">纬度 (°N)</label>
                        <input
                          type="number"
                          className="form-input text-xs"
                          step="0.1"
                          min="18"
                          max="54"
                          value={station.latitude_deg}
                          onChange={(e) =>
                            updateStation(station.device_id, "latitude_deg", parseFloat(e.target.value))
                          }
                        />
                      </div>
                      <div>
                        <label className="form-label">经度 (°E)</label>
                        <input
                          type="number"
                          className="form-input text-xs"
                          step="0.1"
                          min="73"
                          max="135"
                          value={station.longitude_deg}
                          onChange={(e) =>
                            updateStation(station.device_id, "longitude_deg", parseFloat(e.target.value))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">海拔 (m)</label>
                      <input
                        type="number"
                        className="form-input text-xs"
                        value={station.elevation_m ?? 0}
                        onChange={(e) =>
                          updateStation(station.device_id, "elevation_m", parseFloat(e.target.value))
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bronze-panel p-4">
            <div className="card-heading">
              <Zap className="w-4 h-4 text-gold-500" />
              <span>模拟地震参数</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-bronze-300">震级 (M)</span>
                  <span className="font-mono text-gold-400">{quakeParams.magnitude.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="8"
                  step="0.1"
                  value={quakeParams.magnitude}
                  onChange={(e) =>
                    setQuakeParams({ ...quakeParams, magnitude: parseFloat(e.target.value) })
                  }
                  className="w-full accent-gold-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="form-label">震中纬度</label>
                  <input
                    type="number"
                    className="form-input text-xs"
                    step="0.1"
                    value={quakeParams.epicenterLat}
                    onChange={(e) =>
                      setQuakeParams({ ...quakeParams, epicenterLat: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="form-label">震中经度</label>
                  <input
                    type="number"
                    className="form-input text-xs"
                    step="0.1"
                    value={quakeParams.epicenterLon}
                    onChange={(e) =>
                      setQuakeParams({ ...quakeParams, epicenterLon: parseFloat(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={triggerRandomQuake}
                  disabled={isProcessing || stations.length < 2}
                  className="flex-1 bronze-btn-primary shadow-gold disabled:opacity-50 text-xs"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span className="font-serif">{isProcessing ? "处理中..." : "生成地震"}</span>
                </button>
                <button
                  onClick={runLocalizationProcess}
                  disabled={isProcessing || readings.length < 2}
                  className="flex-1 bronze-btn disabled:opacity-50 text-xs"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span className="font-serif">定位计算</span>
                </button>
              </div>
              <button
                onClick={resetAll}
                className="w-full bronze-btn text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="font-serif">重置所有</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bronze-panel p-4">
            <div className="card-heading">
              <MapPin className="w-4 h-4 text-gold-500" />
              <span>台站分布与震中定位图</span>
              <span className="ml-auto text-xs text-bronze-400 font-mono">
                {readings.length}/{stations.length} 台站触发
              </span>
            </div>
            <div className="aspect-[7/5] w-full bg-ink-950/50 rounded-lg border border-bronze-700/20 overflow-hidden">
              <LocalizationMap
                stations={stations}
                readings={readings}
                localizationResult={localizationResult}
                quakeParams={quakeParams}
                coordToSvg={coordToSvg}
                width={mapSize.width}
                height={mapSize.height}
              />
            </div>
          </div>

          {localizationResult && (
            <div className="bronze-panel p-4 mt-4">
              <div className="card-heading">
                <Target className="w-4 h-4 text-gold-500" />
                <span>震中估计结果</span>
                <span className={cn(
                  "ml-auto text-xs px-2 py-0.5 rounded-full",
                  localizationResult.converged
                    ? "bg-ink-600/40 text-ink-200"
                    : "bg-cinnabar-500/20 text-cinnabar-400"
                )}>
                  {localizationResult.converged ? "已收敛" : "未收敛"}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="value-card">
                  <div className="value-label">纬度</div>
                  <div className="value-number">
                    {localizationResult.best_estimate.latitude_deg.toFixed(3)}°N
                  </div>
                </div>
                <div className="value-card">
                  <div className="value-label">经度</div>
                  <div className="value-number">
                    {localizationResult.best_estimate.longitude_deg.toFixed(3)}°E
                  </div>
                </div>
                <div className="value-card">
                  <div className="value-label">不确定度</div>
                  <div className="value-number">
                    {localizationResult.best_estimate.uncertainty_km.toFixed(1)} km
                  </div>
                </div>
                <div className="value-card">
                  <div className="value-label">置信度</div>
                  <div className="value-number">
                    {(localizationResult.best_estimate.confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="value-card">
                  <div className="value-label">估算震级</div>
                  <div className="value-number text-cinnabar-400">
                    M{localizationResult.best_estimate.estimated_magnitude.toFixed(1)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div className="value-card !py-3">
                  <div className="value-label">定位方法</div>
                  <div className="text-sm font-serif text-gold-300">
                    {METHOD_OPTIONS.find(m => m.value === localizationResult.best_estimate.method)?.label || localizationResult.best_estimate.method}
                  </div>
                </div>
                <div className="value-card !py-3">
                  <div className="value-label">有效台站</div>
                  <div className="text-sm font-mono text-gold-300">
                    {localizationResult.valid_stations} 台
                  </div>
                </div>
                <div className="value-card !py-3">
                  <div className="value-label">残差均值</div>
                  <div className="text-sm font-mono text-gold-300">
                    {localizationResult.residual_mean.toFixed(2)} km
                  </div>
                </div>
                <div className="value-card !py-3">
                  <div className="value-label">残差标准差</div>
                  <div className="text-sm font-mono text-gold-300">
                    {localizationResult.residual_std.toFixed(2)} km
                  </div>
                </div>
              </div>
              {localizationResult.candidate_estimates && localizationResult.candidate_estimates.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-bronze-300 mb-2 font-serif">候选估计点</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {localizationResult.candidate_estimates.map((cand, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded-lg border border-bronze-700/30 bg-ink-900/30 px-3 py-2">
                        <span className="text-gold-400 font-mono text-sm">#{idx + 1}</span>
                        <div className="flex-1 text-xs font-mono">
                          <span className="text-bronze-300">{cand.latitude_deg.toFixed(2)}°N, {cand.longitude_deg.toFixed(2)}°E</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-bronze-700/30 text-bronze-300">
                          {cand.method}
                        </span>
                        <span className="text-[10px] font-mono text-gold-400">
                          {(cand.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="bronze-panel p-4 max-h-[600px] overflow-y-auto">
            <div className="card-heading">
              <Radio className="w-4 h-4 text-gold-500" />
              <span>台站读数</span>
            </div>
            {readings.length === 0 ? (
              <div className="text-center py-8 text-bronze-400/60">
                <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无台站读数</p>
                <p className="text-xs mt-1">点击"生成地震"开始模拟</p>
              </div>
            ) : (
              <div className="space-y-3">
                {readings.map((reading) => {
                  const station = stations.find((s) => s.device_id === reading.device_id);
                  return (
                    <div
                      key={reading.device_id}
                      className="rounded-lg border border-cinnabar-500/40 bg-cinnabar-500/5 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm text-cinnabar-300">{reading.device_id}</span>
                        <span className="status-dot bg-cinnabar-500 animate-pulse" />
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-bronze-400">触发时间</span>
                          <span className="font-mono text-gold-300">{reading.trigger_time_sec.toFixed(3)} s</span>
                        </div>
                        {reading.azimuth_deg !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-bronze-400">方位角</span>
                            <span className="font-mono text-gold-300">{reading.azimuth_deg.toFixed(1)}°</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-bronze-400">峰值加速度</span>
                          <span className="font-mono text-gold-300">{(reading.peak_acceleration * 1000).toFixed(1)} mm/s²</span>
                        </div>
                        {reading.signal_to_noise !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-bronze-400">信噪比</span>
                            <span className="font-mono text-gold-300">{reading.signal_to_noise.toFixed(1)} dB</span>
                          </div>
                        )}
                        {reading.dragon_index !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-bronze-400">触发龙首</span>
                            <span className="font-mono text-gold-300">#{reading.dragon_index}</span>
                          </div>
                        )}
                        {station && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-bronze-500">位置</span>
                            <span className="font-mono text-bronze-400">
                              {station.latitude_deg.toFixed(1)}°N, {station.longitude_deg.toFixed(1)}°E
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
