import { useState, useEffect, useRef, useCallback } from "react";
import {
  Settings2,
  Zap,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Compass,
  Gauge,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Box,
  Mountain,
} from "lucide-react";
import SceneCanvas from "@/components/Didongyi3D/SceneCanvas";
import SeismicWaveform from "@/components/Visuals/SeismicWaveform";
import { triggerEarthquake } from "@/lib/api";
import { useRealtimeStore } from "@/store/realtimeStore";
import {
  INSTRUMENT_OPTIONS,
  MATERIAL_OPTIONS,
  SITE_SOIL_OPTIONS,
  DIRECTION_NAMES,
  type InstrumentType,
  type MaterialType,
  type SiteSoilType,
  type EarthquakeTriggerRequest,
  type EarthquakeTriggerResult,
} from "@/types";
import { cn } from "@/lib/utils";

const DIRECTION_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export default function VirtualExperience() {
  const {
    pillar,
    dragons,
    setDisplacementX,
    setDisplacementY,
    setTiltAngle,
    setAcceleration,
    triggerDragon,
    resetDragons,
    addWaveSample,
  } = useRealtimeStore();

  const [params, setParams] = useState<EarthquakeTriggerRequest>({
    magnitude: 5.5,
    distance: 100,
    duration: 30,
    instrument_type: "didongyi",
    material_type: "copper",
    earthquake_direction_deg: 90,
    site_soil: "II",
    pillar_mass: 500,
    pillar_height: 3.0,
    damping_ratio: 0.05,
    trigger_angle_threshold: 5.0,
  });

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const [triggeredDragon, setTriggeredDragon] = useState<number | null>(null);
  const [triggerTime, setTriggerTime] = useState<number | null>(null);
  const [waveData, setWaveData] = useState<number[]>(new Array(300).fill(0));
  const [currentAngle, setCurrentAngle] = useState(0);
  const [currentAngularVel, setCurrentAngularVel] = useState(0);
  const [ballDropAnimation, setBallDropAnimation] = useState(false);

  const animationRef = useRef<number | null>(null);
  const trajectoryRef = useRef<EarthquakeTriggerResult["trajectory"]>([]);
  const resultRef = useRef<EarthquakeTriggerResult | null>(null);
  const startTimeRef = useRef<number>(0);
  const waveHistoryRef = useRef<number[]>([]);

  const handleTrigger = useCallback(async () => {
    if (isTriggering || isPlaying) return;

    setIsTriggering(true);
    setProgress(0);
    setCurrentTime(0);
    setTriggered(false);
    setTriggeredDragon(null);
    setTriggerTime(null);
    setBallDropAnimation(false);
    resetDragons();
    waveHistoryRef.current = [];
    setWaveData(new Array(300).fill(0));

    try {
      const result = await triggerEarthquake(params);
      resultRef.current = result;
      trajectoryRef.current = result.trajectory;

      setIsTriggering(false);
      setIsPlaying(true);
      startTimeRef.current = performance.now();

      if (result.triggered) {
        setTimeout(() => {
          setBallDropAnimation(true);
        }, result.trigger.trigger_time * 1000 + 500);
      }

      const animate = () => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        const totalDuration = params.duration || 30;
        const progressPct = Math.min(100, (elapsed / totalDuration) * 100);

        setProgress(progressPct);
        setCurrentTime(Math.min(elapsed, totalDuration));

        if (trajectoryRef.current.length > 0) {
          const frameIndex = Math.min(
            Math.floor((elapsed / totalDuration) * trajectoryRef.current.length),
            trajectoryRef.current.length - 1
          );

          if (frameIndex >= 0 && frameIndex < trajectoryRef.current.length) {
            const frame = trajectoryRef.current[frameIndex];
            const angleX = frame.theta_x * (180 / Math.PI);
            const angleY = frame.theta_y * (180 / Math.PI);
            const totalAngle = Math.sqrt(angleX * angleX + angleY * angleY);
            const omegaX = frame.omega_x * (180 / Math.PI);
            const omegaY = frame.omega_y * (180 / Math.PI);
            const totalOmega = Math.sqrt(omegaX * omegaX + omegaY * omegaY);

            setCurrentAngle(totalAngle);
            setCurrentAngularVel(totalOmega);
            setDisplacementX(frame.theta_x * 10);
            setDisplacementY(frame.theta_y * 10);
            setTiltAngle(totalAngle);
            setAcceleration(frame.contact_force_x + frame.contact_force_y);

            const waveAcc = frame.omega_x * 10 + frame.omega_y * 10;
            waveHistoryRef.current.push(waveAcc);
            if (waveHistoryRef.current.length > 300) {
              waveHistoryRef.current.shift();
            }
            setWaveData([...waveHistoryRef.current]);
            addWaveSample(waveAcc);

            if (resultRef.current?.triggered && triggeredDragon === null) {
              const triggerT = resultRef.current.trigger.trigger_time;
              if (elapsed >= triggerT) {
                const dragonIdx = resultRef.current.trigger.dragon_index;
                setTriggered(true);
                setTriggeredDragon(dragonIdx);
                setTriggerTime(triggerT);
                triggerDragon(dragonIdx);
              }
            }
          }
        }

        if (elapsed < totalDuration) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsPlaying(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    } catch (error) {
      setIsTriggering(false);
      console.error("触发地震失败:", error);
    }
  }, [params, isTriggering, isPlaying, resetDragons, setDisplacementX, setDisplacementY, setTiltAngle, setAcceleration, addWaveSample, triggerDragon, triggeredDragon]);

  const handleReset = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsTriggering(false);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setTriggered(false);
    setTriggeredDragon(null);
    setTriggerTime(null);
    setBallDropAnimation(false);
    setCurrentAngle(0);
    setCurrentAngularVel(0);
    resetDragons();
    setDisplacementX(0);
    setDisplacementY(0);
    setTiltAngle(0);
    setAcceleration(0);
    waveHistoryRef.current = [];
    setWaveData(new Array(300).fill(0));
  }, [resetDragons, setDisplacementX, setDisplacementY, setTiltAngle, setAcceleration]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleDirectionClick = (index: number) => {
    if (isPlaying || isTriggering) return;
    setParams({ ...params, earthquake_direction_deg: DIRECTION_ANGLES[index] });
  };

  const handleAngleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPlaying || isTriggering) return;
    setParams({ ...params, earthquake_direction_deg: parseFloat(e.target.value) });
  };

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
                    disabled={isPlaying || isTriggering}
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
                    disabled={isPlaying || isTriggering}
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
                    disabled={isPlaying || isTriggering}
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
              <div className="relative w-36 h-36 mx-auto mb-3">
                <div className="absolute inset-0 rounded-full border-2 border-gold-500/40 bg-ink-900/50" />
                {DIRECTION_NAMES.map((name, i) => {
                  const angle = (DIRECTION_ANGLES[i] * Math.PI) / 180;
                  const radius = 58;
                  const x = 72 + Math.sin(angle) * radius;
                  const y = 72 - Math.cos(angle) * radius;
                  const isSelected = params.earthquake_direction_deg === DIRECTION_ANGLES[i];
                  return (
                    <button
                      key={name}
                      onClick={() => handleDirectionClick(i)}
                      disabled={isPlaying || isTriggering}
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
                    transform: `translate(-50%, -100%) rotate(${params.earthquake_direction_deg}deg)`,
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
                  value={params.earthquake_direction_deg}
                  onChange={handleAngleChange}
                  disabled={isPlaying || isTriggering}
                  className="flex-1 accent-gold-500"
                />
                <span className="text-xs font-mono text-gold-400 w-12 text-right">
                  {params.earthquake_direction_deg}°
                </span>
              </div>
            </div>

            <div className="bronze-panel p-4">
              <div className="card-heading">
                <Layers className="w-4 h-4 text-gold-500" />
                <span>仪器选择</span>
              </div>
              <select
                value={params.instrument_type}
                onChange={(e) => setParams({ ...params, instrument_type: e.target.value as InstrumentType })}
                disabled={isPlaying || isTriggering}
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
                disabled={isPlaying || isTriggering}
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
                disabled={isPlaying || isTriggering}
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
                disabled={isPlaying || isTriggering}
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
                      disabled={isPlaying || isTriggering}
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
                      disabled={isPlaying || isTriggering}
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
                      disabled={isPlaying || isTriggering}
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
                      disabled={isPlaying || isTriggering}
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

            <div className="mt-4 flex items-center justify-center gap-4">
              <button
                onClick={handleTrigger}
                disabled={isTriggering || isPlaying}
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
                onClick={handleReset}
                disabled={isTriggering}
                className="bronze-btn px-6 py-4 text-lg"
              >
                <RotateCcw className="w-5 h-5 inline mr-2" />
                重置
              </button>
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
