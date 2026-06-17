import {
  Settings2,
  Gauge,
  Compass,
  Layers,
  Box,
  Mountain,
  ChevronDown,
  ChevronUp,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import SceneCanvas from "@/components/Didongyi3D/SceneCanvas";
import SeismicWaveform from "@/components/Visuals/SeismicWaveform";
import {
  INSTRUMENT_OPTIONS,
  MATERIAL_OPTIONS,
  SITE_SOIL_OPTIONS,
  type InstrumentType,
  type MaterialType,
  type SiteSoilType,
} from "@/types";
import { cn } from "@/lib/utils";
import { useVirtualExperience } from "./hooks/useVirtualExperience";
import { DirectionCompass } from "./components/DirectionCompass";
import { TriggerButton } from "./components/TriggerButton";

export default function VirtualExperience() {
  const {
    pillar,
    dragons,
    params,
    setParams,
    advancedOpen,
    setAdvancedOpen,
    isTriggering,
    isPlaying,
    progress,
    currentTime,
    triggered,
    triggeredDragon,
    triggerTime,
    waveData,
    currentAngle,
    currentAngularVel,
    ballDropAnimation,
    handleTrigger,
    handleReset,
    handleDirectionClick,
    handleAngleChange,
    DIRECTION_NAMES,
  } = useVirtualExperience();

  const isLocked = isPlaying || isTriggering;

  return (
    <div className="min-h-screen bg-starfield bg-ancient-grid bg-grid-size p-4 md:p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-gold-400 mb-3 text-shadow-glow">
            候风地动仪虚拟体验
          </h1>
          <p className="text-bronze-300 text-base md:text-lg max-w-3xl mx-auto">
            亲手触发地震，观察千年神器的神奇响应 —— 探索张衡地动仪的科学奥秘
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bronze-panel p-4">
              <div className="card-heading">
                <Gauge className="w-4 h-4 text-gold-500" />
                <span>地震参数</span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-bronze-300">震级 (M)</span>
                    <span className="font-mono text-gold-400">{params.magnitude.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={10.0}
                    step={0.1}
                    value={params.magnitude}
                    onChange={(e) => setParams({ ...params, magnitude: parseFloat(e.target.value) })}
                    disabled={isLocked}
                    className="w-full accent-gold-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-bronze-300">震中距 (km)</span>
                    <span className="font-mono text-gold-400">{params.distance}</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={1000}
                    step={10}
                    value={params.distance}
                    onChange={(e) => setParams({ ...params, distance: parseFloat(e.target.value) })}
                    disabled={isLocked}
                    className="w-full accent-gold-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-bronze-300">持续时间 (s)</span>
                    <span className="font-mono text-gold-400">{params.duration}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={120}
                    step={5}
                    value={params.duration}
                    onChange={(e) => setParams({ ...params, duration: parseFloat(e.target.value) })}
                    disabled={isLocked}
                    className="w-full accent-gold-500"
                  />
                </div>
              </div>
            </div>

            <div className="bronze-panel p-4">
              <div className="card-heading">
                <Compass className="w-4 h-4 text-gold-500" />
                <span>地震方向</span>
              </div>
              <DirectionCompass
                earthquakeDirection={params.earthquake_direction_deg}
                onDirectionChange={(deg) => setParams({ ...params, earthquake_direction_deg: deg })}
                disabled={isLocked}
              />
            </div>

            <div className="bronze-panel p-4">
              <div className="card-heading">
                <Layers className="w-4 h-4 text-gold-500" />
                <span>仪器选择</span>
              </div>
              <select
                value={params.instrument_type}
                onChange={(e) => setParams({ ...params, instrument_type: e.target.value as InstrumentType })}
                disabled={isLocked}
                className="form-input"
              >
                {INSTRUMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-bronze-400/70 mt-2">
                {INSTRUMENT_OPTIONS.find((o) => o.value === params.instrument_type)?.description}
              </p>
            </div>

            <div className="bronze-panel p-4">
              <div className="card-heading">
                <Box className="w-4 h-4 text-gold-500" />
                <span>材料选择</span>
              </div>
              <select
                value={params.material_type}
                onChange={(e) => setParams({ ...params, material_type: e.target.value as MaterialType })}
                disabled={isLocked}
                className="form-input"
              >
                {MATERIAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
                <div className="text-bronze-400">密度: <span className="text-gold-400 font-mono">{MATERIAL_OPTIONS.find((o) => o.value === params.material_type)?.density}</span></div>
                <div className="text-bronze-400">阻尼: <span className="text-gold-400 font-mono">{MATERIAL_OPTIONS.find((o) => o.value === params.material_type)?.damping}</span></div>
              </div>
            </div>

            <div className="bronze-panel p-4">
              <div className="card-heading">
                <Mountain className="w-4 h-4 text-gold-500" />
                <span>场地土类型</span>
              </div>
              <select
                value={params.site_soil}
                onChange={(e) => setParams({ ...params, site_soil: e.target.value as SiteSoilType })}
                disabled={isLocked}
                className="form-input"
              >
                {SITE_SOIL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-bronze-400/70 mt-2">
                放大系数: <span className="text-gold-400 font-mono">×{SITE_SOIL_OPTIONS.find((o) => o.value === params.site_soil)?.amplification.toFixed(2)}</span>
              </p>
            </div>

            <div className="bronze-panel p-4">
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                disabled={isLocked}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="card-heading mb-0 border-0 pb-0">
                  <Settings2 className="w-4 h-4 text-gold-500" />
                  <span>高级参数</span>
                </div>
                {advancedOpen ? (
                  <ChevronUp className="w-4 h-4 text-bronze-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-bronze-400" />
                )}
              </button>
              {advancedOpen && (
                <div className="space-y-3 mt-4 pt-4 border-t border-bronze-700/30">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-bronze-300">支柱质量 (kg)</span>
                      <span className="font-mono text-gold-400">{params.pillar_mass}</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={2000}
                      step={50}
                      value={params.pillar_mass}
                      onChange={(e) => setParams({ ...params, pillar_mass: parseFloat(e.target.value) })}
                      disabled={isLocked}
                      className="w-full accent-gold-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-bronze-300">支柱高度 (m)</span>
                      <span className="font-mono text-gold-400">{params.pillar_height?.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={1.0}
                      max={6.0}
                      step={0.1}
                      value={params.pillar_height}
                      onChange={(e) => setParams({ ...params, pillar_height: parseFloat(e.target.value) })}
                      disabled={isLocked}
                      className="w-full accent-gold-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-bronze-300">阻尼比</span>
                      <span className="font-mono text-gold-400">{params.damping_ratio?.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.001}
                      max={0.2}
                      step={0.001}
                      value={params.damping_ratio}
                      onChange={(e) => setParams({ ...params, damping_ratio: parseFloat(e.target.value) })}
                      disabled={isLocked}
                      className="w-full accent-gold-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-bronze-300">触发角阈值 (°)</span>
                      <span className="font-mono text-gold-400">{params.trigger_angle_threshold?.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={1.0}
                      max={15.0}
                      step={0.5}
                      value={params.trigger_angle_threshold}
                      onChange={(e) => setParams({ ...params, trigger_angle_threshold: parseFloat(e.target.value) })}
                      disabled={isLocked}
                      className="w-full accent-gold-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col">
            <div className="bronze-panel flex-1 min-h-[500px] lg:min-h-[600px] p-2 relative overflow-hidden">
              <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
                <div className={cn(
                  "status-dot",
                  isPlaying ? "bg-green-500 animate-pulse" : isTriggering ? "bg-yellow-500 animate-pulse" : "bg-bronze-500"
                )} />
                <span className="text-xs font-serif text-bronze-200">
                  {isPlaying ? "地震进行中" : isTriggering ? "计算中..." : "待机状态"}
                </span>
              </div>
              {(isPlaying || isTriggering) && (
                <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
                  <Clock className="w-3 h-3 text-gold-500" />
                  <span className="text-xs font-mono text-gold-400">
                    {currentTime.toFixed(1)}s / {params.duration}s
                  </span>
                </div>
              )}
              <SceneCanvas
                pillarState={pillar}
                dragons={dragons.map((d) => ({
                  id: d.id,
                  direction: d.direction,
                  triggered: d.triggered,
                  ball_dropped: d.ball_dropped,
                }))}
                isSimulating={isPlaying}
                seismicIntensity={isPlaying ? currentAngle / 10 : 0}
              />
            </div>

            {(isPlaying || isTriggering) && (
              <div className="mt-3 bronze-panel p-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-bronze-300 whitespace-nowrap">模拟进度</span>
                  <div className="flex-1 h-3 bg-ink-900/80 rounded-full overflow-hidden border border-bronze-700/40">
                    <div
                      className={cn(
                        "h-full transition-all duration-100 rounded-full",
                        isTriggering
                          ? "bg-gradient-to-r from-yellow-500 to-gold-500 animate-pulse"
                          : "bg-gradient-to-r from-gold-600 via-gold-500 to-gold-400"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gold-400 w-12 text-right">
                    {progress.toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            <div className="mt-4">
              <TriggerButton
                isTriggering={isTriggering}
                isPlaying={isPlaying}
                onTrigger={handleTrigger}
                onReset={handleReset}
              />
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="bronze-panel p-4">
              <div className="card-heading">
                <Activity className="w-4 h-4 text-gold-500" />
                <span>实时数据</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-ink-900/50 rounded-lg border border-bronze-700/30">
                  <div>
                    <div className="text-xs text-bronze-400">都柱摆动角度</div>
                    <div className="text-2xl font-serif font-bold text-gold-400 font-mono">
                      {currentAngle.toFixed(2)}°
                    </div>
                  </div>
                  <Gauge className={cn(
                    "w-8 h-8",
                    currentAngle > 5 ? "text-red-500" : currentAngle > 2 ? "text-yellow-500" : "text-bronze-500"
                  )} />
                </div>
                <div className="flex items-center justify-between p-3 bg-ink-900/50 rounded-lg border border-bronze-700/30">
                  <div>
                    <div className="text-xs text-bronze-400">角速度</div>
                    <div className="text-2xl font-serif font-bold text-gold-400 font-mono">
                      {currentAngularVel.toFixed(2)}°/s
                    </div>
                  </div>
                  <Activity className="w-8 h-8 text-bronze-500" />
                </div>
              </div>
            </div>

            <div className="bronze-panel p-4">
              <div className="card-heading">
                <AlertTriangle className="w-4 h-4 text-gold-500" />
                <span>触发状态</span>
              </div>
              <div className="space-y-3">
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  triggered
                    ? "bg-red-900/30 border-red-500/50"
                    : "bg-ink-900/50 border-bronze-700/30"
                )}>
                  {triggered ? (
                    <CheckCircle2 className="w-6 h-6 text-red-500 animate-pulse" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-bronze-500/50" />
                  )}
                  <div>
                    <div className="text-xs text-bronze-400">触发状态</div>
                    <div className={cn(
                      "font-serif font-bold",
                      triggered ? "text-red-400" : "text-green-400"
                    )}>
                      {triggered ? "已触发" : "未触发"}
                    </div>
                  </div>
                </div>

                {triggered && triggeredDragon !== null && (
                  <div className="p-3 bg-gold-500/10 rounded-lg border border-gold-500/40">
                    <div className="text-xs text-bronze-400 mb-1">触发龙首</div>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center text-ink-950 font-serif font-bold shadow-gold">
                        {DIRECTION_NAMES[triggeredDragon]}
                      </div>
                      <div>
                        <div className="font-serif font-bold text-gold-400">
                          {DIRECTION_NAMES[triggeredDragon]}方龙首
                        </div>
                        <div className="text-xs text-bronze-400">
                          触发时间: <span className="font-mono text-gold-400">{triggerTime?.toFixed(2)}s</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {ballDropAnimation && (
                  <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/40 animate-pulse">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gold-400 shadow-gold animate-bounce" />
                      <span className="text-sm font-serif text-yellow-400">
                        铜球下落，落入蟾蜍口中！
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-1">
                  {DIRECTION_NAMES.map((name, i) => (
                    <div
                      key={name}
                      className={cn(
                        "aspect-square flex items-center justify-center rounded text-[10px] font-serif transition-all duration-300",
                        triggeredDragon === i
                          ? "bg-red-500 text-white shadow-lg shadow-red-500/50 scale-110"
                          : dragons[i]?.triggered
                          ? "bg-gold-500 text-ink-950"
                          : "bg-ink-900/50 text-bronze-400 border border-bronze-700/30"
                      )}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bronze-panel p-4">
              <div className="card-heading">
                <Activity className="w-4 h-4 text-gold-500" />
                <span>地震波加速度</span>
              </div>
              <SeismicWaveform
                data={waveData}
                height={160}
                title=""
              />
            </div>

            <div className="bronze-panel p-4">
              <div className="card-heading">
                <Settings2 className="w-4 h-4 text-gold-500" />
                <span>当前参数</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-bronze-400">仪器:</span>
                  <span className="text-gold-400 font-serif">
                    {INSTRUMENT_OPTIONS.find((o) => o.value === params.instrument_type)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bronze-400">材料:</span>
                  <span className="text-gold-400 font-serif">
                    {MATERIAL_OPTIONS.find((o) => o.value === params.material_type)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bronze-400">场地土:</span>
                  <span className="text-gold-400 font-serif">
                    {SITE_SOIL_OPTIONS.find((o) => o.value === params.site_soil)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bronze-400">震级:</span>
                  <span className="text-gold-400 font-mono">M {params.magnitude}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bronze-400">震中距:</span>
                  <span className="text-gold-400 font-mono">{params.distance} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bronze-400">方向:</span>
                  <span className="text-gold-400 font-mono">{params.earthquake_direction_deg}° ({DIRECTION_NAMES[Math.round(params.earthquake_direction_deg / 45) % 8]})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
