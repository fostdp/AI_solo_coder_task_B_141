import { useState, useMemo, useCallback } from "react";
import {
  MapPin,
  Plus,
  Trash2,
  Zap,
  Target,
  Navigation,
  Radio,
  Layers,
  RotateCcw,
  Crosshair,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { runLocalization, triggerEarthquake } from "@/lib/api";
import type {
  StationConfig,
  StationReading,
  LocalizationMethod,
  LocalizationResult,
  EpicenterEstimate,
} from "@/types";

const METHOD_OPTIONS: Array<{
  value: LocalizationMethod;
  label: string;
  icon: typeof Target;
  description: string;
}> = [
  {
    value: "auto",
    label: "自动融合",
    icon: Layers,
    description: "自动选择最优方法组合",
  },
  {
    value: "bearing",
    label: "方位交汇",
    icon: Navigation,
    description: "基于多台站方位角交会定位",
  },
  {
    value: "tdoa",
    label: "TDOA",
    icon: Radio,
    description: "基于到达时间差定位",
  },
  {
    value: "fused",
    label: "融合定位",
    icon: Target,
    description: "方位角+时间差联合反演",
  },
];

const CHINA_BOUNDS = {
  minLat: 18,
  maxLat: 54,
  minLon: 73,
  maxLon: 135,
};

const MAJOR_CITIES = [
  { name: "北京", lat: 39.9, lon: 116.4 },
  { name: "上海", lat: 31.2, lon: 121.5 },
  { name: "广州", lat: 23.1, lon: 113.3 },
  { name: "成都", lat: 30.7, lon: 104.1 },
  { name: "西安", lat: 34.3, lon: 109.0 },
  { name: "武汉", lat: 30.6, lon: 114.3 },
  { name: "兰州", lat: 36.1, lon: 103.8 },
  { name: "昆明", lat: 25.0, lon: 102.7 },
  { name: "哈尔滨", lat: 45.8, lon: 126.5 },
  { name: "乌鲁木齐", lat: 43.8, lon: 87.6 },
];

const DEFAULT_STATIONS: StationConfig[] = [
  { device_id: "DDY-001", latitude_deg: 39.9, longitude_deg: 116.4, elevation_m: 43 },
  { device_id: "DDY-002", latitude_deg: 31.2, longitude_deg: 121.5, elevation_m: 4 },
  { device_id: "DDY-003", latitude_deg: 23.1, longitude_deg: 113.3, elevation_m: 11 },
  { device_id: "DDY-004", latitude_deg: 30.7, longitude_deg: 104.1, elevation_m: 500 },
];

export default function NetworkLocalization() {
  const [stations, setStations] = useState<StationConfig[]>(DEFAULT_STATIONS);
  const [method, setMethod] = useState<LocalizationMethod>("auto");
  const [readings, setReadings] = useState<StationReading[]>([]);
  const [localizationResult, setLocalizationResult] = useState<LocalizationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quakeParams, setQuakeParams] = useState({
    magnitude: 5.5,
    epicenterLat: 34.3,
    epicenterLon: 109.0,
    depthKm: 10,
  });

  const coordToSvg = useCallback(
    (lat: number, lon: number, width: number, height: number) => {
      const x =
        ((lon - CHINA_BOUNDS.minLon) / (CHINA_BOUNDS.maxLon - CHINA_BOUNDS.minLon)) * width;
      const y =
        ((CHINA_BOUNDS.maxLat - lat) / (CHINA_BOUNDS.maxLat - CHINA_BOUNDS.minLat)) * height;
      return { x, y };
    },
    []
  );

  const svgToCoord = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const lon = (x / width) * (CHINA_BOUNDS.maxLon - CHINA_BOUNDS.minLon) + CHINA_BOUNDS.minLon;
      const lat = CHINA_BOUNDS.maxLat - (y / height) * (CHINA_BOUNDS.maxLat - CHINA_BOUNDS.minLat);
      return { lat, lon };
    },
    []
  );

  const addStation = () => {
    const newId = `DDY-${String(stations.length + 1).padStart(3, "0")}`;
    setStations([
      ...stations,
      {
        device_id: newId,
        latitude_deg: 35 + (Math.random() - 0.5) * 10,
        longitude_deg: 110 + (Math.random() - 0.5) * 15,
        elevation_m: Math.round(Math.random() * 500),
      },
    ]);
  };

  const removeStation = (deviceId: string) => {
    setStations(stations.filter((s) => s.device_id !== deviceId));
    setReadings(readings.filter((r) => r.device_id !== deviceId));
    if (localizationResult) {
      setLocalizationResult({
        ...localizationResult,
        stations: localizationResult.stations.filter((s) => s.device_id !== deviceId),
        readings: localizationResult.readings.filter((r) => r.device_id !== deviceId),
      });
    }
  };

  const updateStation = (deviceId: string, field: keyof StationConfig, value: string | number) => {
    setStations(
      stations.map((s) =>
        s.device_id === deviceId ? { ...s, [field]: value } : s
      )
    );
  };

  const generateRandomReadings = useCallback(async () => {
    if (stations.length < 2) return;

    const { epicenterLat, epicenterLon, magnitude, depthKm } = quakeParams;
    const newReadings: StationReading[] = [];
    let baseTime = Math.random() * 2;

    for (const station of stations) {
      const dx = (station.longitude_deg - epicenterLon) * 111 * Math.cos((station.latitude_deg * Math.PI) / 180);
      const dy = (station.latitude_deg - epicenterLat) * 111;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const travelTime = distance / 6;
      const azimuth = (Math.atan2(dx, dy) * 180) / Math.PI;
      const peakAccel = Math.min(9.8, Math.pow(10, (magnitude - 4) / 2) * Math.exp(-distance / 200));

      try {
        const result = await triggerEarthquake({
          magnitude,
          distance,
          duration: 30,
          earthquake_direction_deg: azimuth,
          instrument_type: "didongyi",
          material_type: "copper",
        });

        if (result.triggered) {
          newReadings.push({
            device_id: station.device_id,
            trigger_time_sec: baseTime + travelTime + (Math.random() - 0.5) * 0.3,
            azimuth_deg: azimuth + (Math.random() - 0.5) * 5,
            peak_acceleration: result.peak_acceleration,
            signal_to_noise: 10 + Math.random() * 20,
            dragon_index: result.trigger.dragon_index,
          });
        }
      } catch {
        if (peakAccel > 0.05) {
          newReadings.push({
            device_id: station.device_id,
            trigger_time_sec: baseTime + travelTime + (Math.random() - 0.5) * 0.3,
            azimuth_deg: azimuth + (Math.random() - 0.5) * 5,
            peak_acceleration: peakAccel,
            signal_to_noise: 10 + Math.random() * 20,
          });
        }
      }
    }

    setReadings(newReadings);
    return newReadings;
  }, [stations, quakeParams]);

  const runLocalizationProcess = async () => {
    if (readings.length < 2) {
      alert("至少需要2个台站的有效读数才能进行定位");
      return;
    }

    setIsProcessing(true);
    try {
      const request = {
        stations,
        readings,
        method,
        wave_velocity_km_sec: 6.0,
      };
      const result = await runLocalization(request);
      setLocalizationResult(result);
    } catch (error) {
      console.error("定位失败:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerRandomQuake = async () => {
    setIsProcessing(true);
    try {
      const newReadings = await generateRandomReadings();
      if (newReadings && newReadings.length >= 2) {
        const request = {
          stations,
          readings: newReadings,
          method,
          wave_velocity_km_sec: 6.0,
        };
        const result = await runLocalization(request);
        setLocalizationResult(result);
      }
    } catch (error) {
      console.error("模拟地震失败:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setStations(DEFAULT_STATIONS);
    setReadings([]);
    setLocalizationResult(null);
    setMethod("auto");
  };

  const mapSize = { width: 700, height: 500 };

  const renderMap = useMemo(() => {
    const { width, height } = mapSize;
    const latLines = [];
    const lonLines = [];

    for (let lat = 20; lat <= 50; lat += 10) {
      const { y } = coordToSvg(lat, CHINA_BOUNDS.minLon, width, height);
      latLines.push(
        <line
          key={`lat-${lat}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke="rgba(212,175,55,0.15)"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      );
    }

    for (let lon = 75; lon <= 135; lon += 10) {
      const { x } = coordToSvg(CHINA_BOUNDS.minLat, lon, width, height);
      lonLines.push(
        <line
          key={`lon-${lon}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke="rgba(212,175,55,0.15)"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      );
    }

    const cityMarkers = MAJOR_CITIES.map((city) => {
      const { x, y } = coordToSvg(city.lat, city.lon, width, height);
      return (
        <g key={city.name}>
          <circle cx={x} cy={y} r={2} fill="rgba(184,115,51,0.6)" />
          <text
            x={x + 6}
            y={y + 4}
            fill="rgba(200,170,120,0.7)"
            fontSize={10}
            fontFamily="serif"
          >
            {city.name}
          </text>
        </g>
      );
    });

    const stationMarkers = stations.map((station) => {
      const { x, y } = coordToSvg(
        station.latitude_deg,
        station.longitude_deg,
        width,
        height
      );
      const reading = readings.find((r) => r.device_id === station.device_id);
      const hasReading = !!reading;

      return (
        <g key={station.device_id}>
          <circle
            cx={x}
            cy={y}
            r={10}
            fill={hasReading ? "rgba(194,59,34,0.2)" : "rgba(10,14,39,0.8)"}
            stroke={hasReading ? "#C23B22" : "#B87333"}
            strokeWidth={2}
          />
          <circle cx={x} cy={y} r={5} fill="#D4AF37" />
          <text
            x={x + 14}
            y={y + 4}
            fill="#D4AF37"
            fontSize={10}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {station.device_id}
          </text>
          <text
            x={x + 14}
            y={y + 16}
            fill="rgba(200,170,120,0.6)"
            fontSize={9}
            fontFamily="monospace"
          >
            {station.latitude_deg.toFixed(1)}°N, {station.longitude_deg.toFixed(1)}°E
          </text>
        </g>
      );
    });

    const directionLines = readings
      .map((reading) => {
        const station = stations.find((s) => s.device_id === reading.device_id);
        if (!station || reading.azimuth_deg === undefined) return null;

        const { x: sx, y: sy } = coordToSvg(
          station.latitude_deg,
          station.longitude_deg,
          width,
          height
        );

        const azimuthRad = (reading.azimuth_deg * Math.PI) / 180;
        const lineLength = 200;
        const dx = Math.sin(azimuthRad) * lineLength;
        const dy = -Math.cos(azimuthRad) * lineLength;

        return (
          <g key={`dir-${reading.device_id}`}>
            <line
              x1={sx}
              y1={sy}
              x2={sx + dx}
              y2={sy + dy}
              stroke="rgba(194,59,34,0.6)"
              strokeWidth={1.5}
              strokeDasharray="8,4"
            />
            <polygon
              points={`${sx + dx},${sy + dy} ${sx + dx - 8},${sy + dy - 4} ${sx + dx - 4},${sy + dy} ${sx + dx - 8},${sy + dy + 4}`}
              fill="rgba(194,59,34,0.8)"
            />
          </g>
        );
      })
      .filter(Boolean);

    const epicenterMarker = localizationResult?.best_estimate ? (() => {
      const est = localizationResult.best_estimate;
      const { x, y } = coordToSvg(est.latitude_deg, est.longitude_deg, width, height);
      const kmPerDeg = 111;
      const ellipseScale = width / (CHINA_BOUNDS.maxLon - CHINA_BOUNDS.minLon) / kmPerDeg;

      return (
        <g>
          <ellipse
            cx={x}
            cy={y}
            rx={(est.error_ellipse.major_axis_km * ellipseScale * Math.cos((est.latitude_deg * Math.PI) / 180)) || 10}
            ry={(est.error_ellipse.minor_axis_km * ellipseScale) || 10}
            transform={`rotate(${est.error_ellipse.orientation_deg}, ${x}, ${y})`}
            fill="rgba(194,59,34,0.15)"
            stroke="rgba(194,59,34,0.6)"
            strokeWidth={1.5}
            strokeDasharray="6,3"
          />
          <circle cx={x} cy={y} r={20} fill="url(#epicenterGlow)" opacity={0.8}>
            <animate
              attributeName="r"
              values="15;25;15"
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.8;0.3;0.8"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx={x} cy={y} r={8} fill="#C23B22" stroke="#D4AF37" strokeWidth={2} />
          <circle cx={x} cy={y} r={3} fill="#D4AF37" />
          <text
            x={x + 16}
            y={y - 10}
            fill="#D4AF37"
            fontSize={11}
            fontFamily="monospace"
            fontWeight="bold"
          >
            M{est.estimated_magnitude.toFixed(1)}
          </text>
          <text
            x={x + 16}
            y={y + 4}
            fill="#e5cba5"
            fontSize={9}
            fontFamily="monospace"
          >
            {est.latitude_deg.toFixed(2)}°N
          </text>
          <text
            x={x + 16}
            y={y + 16}
            fill="#e5cba5"
            fontSize={9}
            fontFamily="monospace"
          >
            {est.longitude_deg.toFixed(2)}°E
          </text>
        </g>
      );
    })() : null;

    const candidateMarkers = localizationResult?.candidate_estimates?.map((cand, idx) => {
      const { x, y } = coordToSvg(cand.latitude_deg, cand.longitude_deg, width, height);
      return (
        <g key={`cand-${idx}`}>
          <circle
            cx={x}
            cy={y}
            r={5}
            fill="none"
            stroke="rgba(212,175,55,0.5)"
            strokeWidth={1.5}
            strokeDasharray="3,2"
          />
          <text
            x={x + 8}
            y={y + 3}
            fill="rgba(212,175,55,0.6)"
            fontSize={8}
            fontFamily="monospace"
          >
            #{idx + 1}
          </text>
        </g>
      );
    });

    const trueEpicenterMarker = (() => {
      const { x, y } = coordToSvg(quakeParams.epicenterLat, quakeParams.epicenterLon, width, height);
      return (
        <g>
          <crosshair cx={x} cy={y} r={12} stroke="rgba(212,175,55,0.4)" strokeWidth={1} />
          <line x1={x - 15} y1={y} x2={x + 15} y2={y} stroke="rgba(212,175,55,0.4)" strokeWidth={1} />
          <line x1={x} y1={y - 15} x2={x} y2={y + 15} stroke="rgba(212,175,55,0.4)" strokeWidth={1} />
        </g>
      );
    })();

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <radialGradient id="epicenterGlow">
            <stop offset="0%" stopColor="#C23B22" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#C23B22" stopOpacity="0" />
          </radialGradient>
          <pattern id="mapGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke="rgba(212,175,55,0.08)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        <rect width={width} height={height} fill="url(#mapGrid)" />

        <rect
          x={1}
          y={1}
          width={width - 2}
          height={height - 2}
          fill="none"
          stroke="rgba(184,115,51,0.3)"
          strokeWidth={1.5}
          rx={4}
        />

        {latLines}
        {lonLines}

        <polygon
          points="
            80,400 120,420 160,410 200,430 250,420 300,440 350,430 400,450
            450,440 500,460 550,450 600,470 620,460 640,430 660,400 650,350
            640,300 620,250 600,200 580,150 550,120 500,80 450,60 400,50
            350,70 300,60 250,80 200,100 150,130 120,180 100,230 90,280
            85,330 80,370 80,400
          "
          fill="rgba(10,14,39,0.5)"
          stroke="rgba(184,115,51,0.5)"
          strokeWidth={1.5}
        />

        {cityMarkers}
        {directionLines}
        {candidateMarkers}
        {trueEpicenterMarker}
        {stationMarkers}
        {epicenterMarker}

        <g transform={`translate(10, ${height - 60})`}>
          <rect width={180} height={50} fill="rgba(10,14,39,0.8)" stroke="rgba(184,115,51,0.4)" rx={4} />
          <circle cx={15} cy={15} r={5} fill="#D4AF37" />
          <text x={28} y={19} fill="#e5cba5" fontSize={10}>台站</text>
          <circle cx={15} cy={35} r={6} fill="#C23B22" />
          <text x={28} y={39} fill="#e5cba5" fontSize={10}>震中估计</text>
          <line x1={100} y1={15} x2={130} y2={15} stroke="rgba(194,59,34,0.6)" strokeWidth={1.5} strokeDasharray="8,4" />
          <text x={138} y={19} fill="#e5cba5" fontSize={10}>方位线</text>
        </g>
      </svg>
    );
  }, [stations, readings, localizationResult, quakeParams, coordToSvg]);

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
              {stations.map((station, idx) => (
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
              {renderMap}
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
