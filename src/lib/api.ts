import type {
  SensorRecord,
  SimulationParams,
  SimulationResult,
  SensitivityResult,
  AlertItem,
  TrajectoryPoint,
  HeatmapCell,
  ROCPoint,
  DragonStatus,
  InstrumentType,
  MaterialType,
  InstrumentInfo,
  MaterialInfo,
  ComparisonRequest,
  ComparisonResult,
  MaterialAnalysisRequest,
  MaterialAnalysisResult,
  LocalizationRequest,
  LocalizationResult,
  EarthquakeTriggerRequest,
  EarthquakeTriggerResult,
} from "@/types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const DRAGON_DIRECTIONS = [
  { id: 0, direction: "北", angle: 0 },
  { id: 1, direction: "东北", angle: 45 },
  { id: 2, direction: "东", angle: 90 },
  { id: 3, direction: "东南", angle: 135 },
  { id: 4, direction: "南", angle: 180 },
  { id: 5, direction: "西南", angle: 225 },
  { id: 6, direction: "西", angle: 270 },
  { id: 7, direction: "西北", angle: 315 },
];

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function mockDragons(triggers: number[] = []): DragonStatus[] {
  return DRAGON_DIRECTIONS.map((d) => ({
    ...d,
    triggered: triggers.includes(d.id),
    ball_dropped: triggers.includes(d.id),
    trigger_time_ms: triggers.includes(d.id) ? Date.now() : undefined,
  }));
}

function mockSensorRecord(deviceId = "DDY-001"): SensorRecord {
  const acc = (Math.random() - 0.5) * 0.2;
  const angle = (Math.random() - 0.5) * 0.3;
  const triggers: number[] = [];
  if (Math.abs(acc) > 0.15) {
    const nearest = Math.round((Math.atan2(acc, Math.abs(acc)) * 180 / Math.PI + 360) % 360 / 45);
    triggers.push(((nearest % 8) + 8) % 8);
  }
  return {
    device_id: deviceId,
    timestamp: new Date().toISOString(),
    pillar: {
      displacement_x: (Math.random() - 0.5) * 0.005,
      displacement_y: (Math.random() - 0.5) * 0.005,
      angle: angle,
      angular_velocity: (Math.random() - 0.5) * 0.5,
    },
    wave: {
      acceleration: acc,
      frequency: 2 + Math.random() * 3,
      amplitude: 0.001 + Math.random() * 0.003,
      history: Array(128).fill(0).map(() => (Math.random() - 0.5) * 0.1),
    },
    dragons: mockDragons(triggers),
    magnitude: Math.random() > 0.8 ? 3 + Math.random() * 3 : undefined,
    epicenter_distance: Math.random() > 0.8 ? 50 + Math.random() * 500 : undefined,
  };
}

function mockSimulationResult(params: SimulationParams): SimulationResult {
  const sampleRate = params.sample_rate ?? 100;
  const totalSamples = Math.floor(params.duration * sampleRate);
  const direction = (params.earthquake_direction ?? 0) * Math.PI / 180;
  const triggerAccel = Math.max(0.1, (params.magnitude - 3) * 0.15);
  const falloff = Math.exp(-params.epicenter_distance / 300);
  const amp = triggerAccel * falloff;

  const trajectory: TrajectoryPoint[] = [];
  let triggeredIds: number[] = [];
  let triggerTime = -1;
  let maxAngle = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const waveAcc = amp * Math.sin(2 * Math.PI * 2 * t) * Math.exp(-t * params.damping_ratio * 2);
    const angDeg = waveAcc * params.pillar_height * 50;
    maxAngle = Math.max(maxAngle, Math.abs(angDeg));
    trajectory.push({
      t,
      x: waveAcc * Math.sin(direction) * 0.01,
      y: waveAcc * Math.cos(direction) * 0.01,
      angle: angDeg,
      angular_vel: waveAcc * 10,
      wave_acc: waveAcc,
    });
    if (triggerTime < 0 && Math.abs(angDeg) > 2.5) {
      triggerTime = t;
      const nearestIdx = Math.round((params.earthquake_direction ?? 0) / 45);
      const dragonId = ((nearestIdx % 8) + 8) % 8;
      triggeredIds = [dragonId];
    }
  }

  return {
    simulation_id: genId("SIM"),
    created_at: new Date().toISOString(),
    params,
    pillar_trajectory: trajectory,
    triggered_dragons: triggeredIds,
    trigger_time: triggerTime,
    max_angle: maxAngle,
  };
}

function mockSensitivityAnalysis(): SensitivityResult {
  const magSteps = 8;
  const distSteps = 10;
  const grid: HeatmapCell[][] = [];
  for (let i = 0; i < magSteps; i++) {
    const row: HeatmapCell[] = [];
    const mag = 2 + i * 0.6;
    for (let j = 0; j < distSteps; j++) {
      const dist = 20 + j * 80;
      const baseProb = Math.min(1, Math.max(0, (mag - 3) / 3));
      const distFactor = Math.exp(-dist / 400);
      const prob = Math.round(baseProb * distFactor * 100) / 100;
      row.push({
        row: i,
        col: j,
        value: prob,
        label: `${prob * 100}%`,
        magnitude: Math.round(mag * 10) / 10,
        distance: dist,
        detection_prob: prob,
        false_alarm_rate: Math.round((1 - prob) * 0.08 * 100) / 100,
        avg_trigger_time: prob > 0.3 ? Math.round((1.2 + Math.random() * 1.5) * 10) / 10 : -1,
      });
    }
    grid.push(row);
  }

  const roc_curve: ROCPoint[] = [];
  for (let t = 0; t <= 20; t++) {
    const threshold = t * 0.1;
    const tpr = Math.min(1, Math.max(0, 1 - Math.exp(-threshold * 1.2)));
    const fpr = Math.min(0.3, threshold * 0.08);
    roc_curve.push({
      threshold: Math.round(threshold * 10) / 10,
      tpr: Math.round(tpr * 100) / 100,
      fpr: Math.round(fpr * 100) / 100,
    });
  }

  return {
    analysis_id: genId("SA"),
    grid,
    roc_curve,
    optimal_threshold: 1.2,
    detection_area_km2: 125600,
  };
}

function mockAlerts(limit: number, level?: AlertItem["level"]): AlertItem[] {
  const templates: Array<Omit<AlertItem, "id" | "timestamp">> = [
    { type: "misfire", level: "warning", message: "东北方位触发但波形加速度低于阈值 0.15 m/s²，疑似误触发", mqtt_delivered: true, device_id: "DDY-001" },
    { type: "system", level: "info", message: "设备 DDY-001 连接已恢复", mqtt_delivered: true, device_id: "DDY-001" },
    { type: "sensitivity_drop", level: "critical", message: "过去 30 分钟检测率降至 62%，低于阈值 75%", mqtt_delivered: false },
    { type: "misfire", level: "critical", message: "西、西北连续两次误触发，建议校准支柱机械结构", mqtt_delivered: true, device_id: "DDY-001" },
    { type: "system", level: "warning", message: "MQTT 消息队列积压超过 200 条", mqtt_delivered: false },
    { type: "sensitivity_drop", level: "warning", message: "远距离 (>400km) 事件检测率下降至 51%", mqtt_delivered: true },
    { type: "system", level: "info", message: "ClickHouse 归档完成，已写入 10,482 条记录", mqtt_delivered: true },
  ];
  const pool = level ? templates.filter((a) => a.level === level) : templates;
  const n = Math.min(limit, pool.length * 3);
  const out: AlertItem[] = [];
  for (let i = 0; i < n; i++) {
    const tpl = pool[i % pool.length];
    out.push({
      id: genId("AL"),
      timestamp: new Date(Date.now() - i * 1000 * 60 * (3 + Math.random() * 10)).toISOString(),
      ...tpl,
    });
  }
  return out;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function postSensor(data: Partial<SensorRecord>): Promise<SensorRecord> {
  try {
    return await request<SensorRecord>("/api/sensor", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch {
    const rec = mockSensorRecord(data.device_id ?? "DDY-001");
    return { ...rec, ...data };
  }
}

export async function getRealtime(deviceId = "DDY-001"): Promise<SensorRecord> {
  try {
    return await request<SensorRecord>(`/api/realtime/${deviceId}`);
  } catch {
    return mockSensorRecord(deviceId);
  }
}

export async function runSimulation(params: SimulationParams): Promise<SimulationResult> {
  try {
    return await request<SimulationResult>("/api/simulation/run", {
      method: "POST",
      body: JSON.stringify(params),
    });
  } catch {
    return mockSimulationResult(params);
  }
}

export async function runSensitivityAnalysis(params: Partial<SimulationParams> = {}): Promise<SensitivityResult> {
  try {
    return await request<SensitivityResult>("/api/sensitivity/run", {
      method: "POST",
      body: JSON.stringify(params),
    });
  } catch {
    return mockSensitivityAnalysis();
  }
}

export async function getAlerts(limit = 50, level?: AlertItem["level"]): Promise<AlertItem[]> {
  try {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (level) qs.set("level", level);
    return await request<AlertItem[]>(`/api/alerts?${qs.toString()}`);
  } catch {
    return mockAlerts(limit, level);
  }
}

export async function getInstruments(): Promise<InstrumentInfo[]> {
  try {
    return await request<InstrumentInfo[]>("/api/instruments");
  } catch {
    return [
      { id: "didongyi", name: "didongyi", sensitivity_factor: 1.0, noise_floor: 0.005, response_lag_sec: 0 },
      { id: "water_clock_armillary", name: "water_clock_armillary", sensitivity_factor: 0.35, noise_floor: 0.02, response_lag_sec: 0.8 },
      { id: "modern_seismometer", name: "modern_seismometer", sensitivity_factor: 25.0, noise_floor: 1e-8, response_lag_sec: 0.001 },
    ];
  }
}

export async function getMaterials(): Promise<MaterialInfo[]> {
  try {
    return await request<MaterialInfo[]>("/api/materials");
  } catch {
    return [
      { id: "copper", name: "copper", density_kgm3: 8960, youngs_modulus_pa: 110e9, yield_strength_pa: 70e6, damping_ratio: 0.05, poissons_ratio: 0.34, thermal_expansion: 16.5e-6, cost_factor: 1.0 },
      { id: "iron", name: "iron", density_kgm3: 7870, youngs_modulus_pa: 200e9, yield_strength_pa: 240e6, damping_ratio: 0.03, poissons_ratio: 0.29, thermal_expansion: 11.8e-6, cost_factor: 0.6 },
      { id: "wood", name: "wood", density_kgm3: 600, youngs_modulus_pa: 10e9, yield_strength_pa: 40e6, damping_ratio: 0.08, poissons_ratio: 0.35, thermal_expansion: 5e-6, cost_factor: 0.15 },
      { id: "steel", name: "steel", density_kgm3: 7850, youngs_modulus_pa: 206e9, yield_strength_pa: 350e6, damping_ratio: 0.02, poissons_ratio: 0.30, thermal_expansion: 11.7e-6, cost_factor: 1.5 },
    ];
  }
}

function mockComparisonResult(request: ComparisonRequest): ComparisonResult {
  const instruments = request.instruments || ["didongyi", "water_clock_armillary", "modern_seismometer"];
  const materials = request.materials || ["copper"];
  const comparisons: ComparisonResult["comparisons"] = [];

  for (const inst of instruments) {
    for (const mat of materials) {
      const sensitivity = inst === "modern_seismometer" ? 25.0 : inst === "didongyi" ? 1.0 : 0.35;
      const baseProb = inst === "modern_seismometer" ? 0.9 : inst === "didongyi" ? 0.6 : 0.25;
      const far = inst === "modern_seismometer" ? 0.01 : inst === "didongyi" ? 0.08 : 0.15;

      const heatmap: ComparisonResult["comparisons"][0]["heatmap"] = [];
      for (let mi = 0; mi < (request.magnitude_steps || 12); mi++) {
        for (let di = 0; di < (request.distance_steps || 12); di++) {
          const mag = (request.magnitude_min || 2) + mi * ((request.magnitude_max || 8) - (request.magnitude_min || 2)) / ((request.magnitude_steps || 12) - 1);
          const dist = (request.distance_min || 10) + di * ((request.distance_max || 800) - (request.distance_min || 10)) / ((request.distance_steps || 12) - 1);
          const prob = Math.min(0.99, Math.max(0, baseProb * Math.min(1, (mag - 2) / 4) * Math.exp(-dist / 300)));
          heatmap.push({ magnitude: mag, distance: dist, detection_probability: prob, false_alarm_rate: far * prob });
        }
      }

      const roc: ROCPoint[] = [];
      for (let t = 0; t <= 20; t++) {
        const threshold = t * 0.25;
        const tpr = Math.min(1, Math.max(0, 1 - Math.exp(-threshold * sensitivity * 0.5)));
        const fpr = Math.min(0.3, threshold * 0.02 * sensitivity);
        roc.push({ threshold: Math.round(threshold * 10) / 10, tpr: Math.round(tpr * 100) / 100, fpr: Math.round(fpr * 100) / 100 });
      }

      comparisons.push({
        instrument: inst,
        material: mat,
        sensitivity_factor: sensitivity,
        noise_floor: inst === "modern_seismometer" ? 1e-8 : inst === "didongyi" ? 0.005 : 0.02,
        response_lag: inst === "modern_seismometer" ? 0.001 : inst === "didongyi" ? 0 : 0.8,
        optimal_threshold: 3.5,
        youden_j: baseProb - far,
        detection_area_km2: baseProb * 500000,
        avg_detection_probability: baseProb,
        avg_false_alarm_rate: far,
        avg_trigger_time_sec: inst === "modern_seismometer" ? 0.5 : inst === "didongyi" ? 2.5 : 5.0,
        avg_max_angle_deg: inst === "modern_seismometer" ? 1.5 : inst === "didongyi" ? 6.5 : 3.5,
        heatmap,
        roc_curve: roc,
      });
    }
  }

  return {
    request_id: genId("CMP"),
    comparisons,
    magnitude_min: request.magnitude_min || 2,
    magnitude_max: request.magnitude_max || 8,
    magnitude_steps: request.magnitude_steps || 12,
    distance_min: request.distance_min || 10,
    distance_max: request.distance_max || 800,
    distance_steps: request.distance_steps || 12,
  };
}

export async function runInstrumentComparison(request: ComparisonRequest): Promise<ComparisonResult> {
  try {
    return await request<ComparisonResult>("/api/instrument/compare", {
      method: "POST",
      body: JSON.stringify(request),
    });
  } catch {
    return mockComparisonResult(request);
  }
}

function mockMaterialAnalysisResult(request: MaterialAnalysisRequest): MaterialAnalysisResult {
  const materials = request.test_materials || ["copper", "iron", "wood", "steel"];
  const metrics: MaterialAnalysisResult["material_metrics"] = [];

  const refDensity = request.reference_material === "copper" ? 8960 : 7870;

  for (const mat of materials) {
    const info = {
      copper: { density: 8960, youngs: 110e9, damping: 0.05, yield: 70e6, cost: 1.0 },
      iron: { density: 7870, youngs: 200e9, damping: 0.03, yield: 240e6, cost: 0.6 },
      wood: { density: 600, youngs: 10e9, damping: 0.08, yield: 40e6, cost: 0.15 },
      steel: { density: 7850, youngs: 206e9, damping: 0.02, yield: 350e6, cost: 1.5 },
    }[mat] || { density: 8960, youngs: 110e9, damping: 0.05, yield: 70e6, cost: 1.0 };

    const massRatio = info.density / refDensity;
    const baseTrigger = 2.0 + Math.random() * 1.0;
    const triggerTime = baseTrigger * massRatio;
    const baseAngle = 5.0 + Math.random() * 2.0;
    const maxAngle = baseAngle * (1 + (1 - massRatio) * 0.5);

    const triggerTimes = Array.from({ length: request.trials || 10 }, () => triggerTime + (Math.random() - 0.5) * 0.5);
    const maxAngles = Array.from({ length: request.trials || 10 }, () => maxAngle + (Math.random() - 0.5) * 1.0);

    const avgTrigger = triggerTimes.reduce((a, b) => a + b, 0) / triggerTimes.length;
    const avgAngle = maxAngles.reduce((a, b) => a + b, 0) / maxAngles.length;
    const stdTrigger = Math.sqrt(triggerTimes.reduce((s, t) => s + (t - avgTrigger) ** 2, 0) / triggerTimes.length);
    const stdAngle = Math.sqrt(maxAngles.reduce((s, t) => s + (t - avgAngle) ** 2, 0) / maxAngles.length);

    const mag = request.magnitude || 5;
    const dist = request.distance || 100;
    const detectionProb = Math.min(0.99, Math.max(0, (1 - Math.exp(-mag / 4)) * Math.exp(-dist / 400) / massRatio));
    const falseAlarmRate = Math.min(0.2, 0.01 * (1 / info.damping) * massRatio);

    metrics.push({
      material: mat,
      material_name: mat,
      density_kgm3: info.density,
      youngs_modulus_pa: info.youngs,
      damping_ratio: info.damping,
      yield_strength_pa: info.yield,
      cost_factor: info.cost,
      avg_trigger_time_sec: avgTrigger,
      trigger_time_std: stdTrigger,
      avg_max_angle_deg: avgAngle,
      max_angle_std: stdAngle,
      avg_peak_acceleration: 0.1 * mag * (1 + Math.random() * 0.2),
      detection_probability: detectionProb,
      false_alarm_rate: falseAlarmRate,
      response_ratio: 1.0 / massRatio,
      cost_efficiency: detectionProb / info.cost,
      trigger_times: triggerTimes,
      max_angles: maxAngles,
    });
  }

  return {
    request_id: genId("MAT"),
    reference_material: request.reference_material || "copper",
    material_metrics: metrics,
    magnitude: request.magnitude || 5,
    distance: request.distance || 100,
    trials: request.trials || 10,
  };
}

export async function runMaterialAnalysis(request: MaterialAnalysisRequest): Promise<MaterialAnalysisResult> {
  try {
    return await request<MaterialAnalysisResult>("/api/material/analyze", {
      method: "POST",
      body: JSON.stringify(request),
    });
  } catch {
    return mockMaterialAnalysisResult(request);
  }
}

function mockLocalizationResult(request: LocalizationRequest): LocalizationResult {
  const stations = request.stations || [];
  const readings = request.readings || [];

  if (stations.length < 2 || readings.length < 2) {
    return {
      status: "ok",
      converged: false,
      valid_stations: readings.length,
      residual_mean: 0,
      residual_std: 0,
      best_estimate: {
        latitude_deg: stations[0]?.latitude_deg || 39.9,
        longitude_deg: stations[0]?.longitude_deg || 116.4,
        uncertainty_km: 200,
        confidence: 0.05,
        estimated_magnitude: 5.0,
        estimated_depth_km: 10,
        method: "insufficient_data",
        error_ellipse: { major_axis_km: 200, minor_axis_km: 200, orientation_deg: 0 },
      },
      candidate_estimates: [],
      stations,
      readings,
    };
  }

  const avgLat = stations.reduce((s, st) => s + st.latitude_deg, 0) / stations.length;
  const avgLon = stations.reduce((s, st) => s + st.longitude_deg, 0) / stations.length;

  const perturbation = (Math.random() - 0.5) * 0.2;
  const bestLat = avgLat + perturbation;
  const bestLon = avgLon + perturbation;

  const uncertainty = Math.max(5, 50 / Math.min(readings.length, 6));

  return {
    status: "ok",
    converged: true,
    valid_stations: readings.length,
    residual_mean: 5 + Math.random() * 5,
    residual_std: 2 + Math.random() * 2,
    best_estimate: {
      latitude_deg: bestLat,
      longitude_deg: bestLon,
      uncertainty_km: uncertainty,
      confidence: Math.min(0.95, Math.max(0.1, 1 - uncertainty / 100)),
      estimated_magnitude: readings.reduce((s, r) => s + Math.sqrt(r.peak_acceleration * 1e6), 0) / readings.length * 0.1 + 2,
      estimated_depth_km: 10 + Math.random() * 10,
      method: request.method || "auto",
      error_ellipse: { major_axis_km: uncertainty * 1.2, minor_axis_km: uncertainty * 0.8, orientation_deg: 45 },
    },
    candidate_estimates: [
      {
        latitude_deg: bestLat + 0.05,
        longitude_deg: bestLon + 0.05,
        uncertainty_km: uncertainty * 1.5,
        confidence: 0.6,
        estimated_magnitude: 5.0,
        estimated_depth_km: 12,
        method: "bearing",
        error_ellipse: { major_axis_km: uncertainty * 1.8, minor_axis_km: uncertainty * 1.2, orientation_deg: 30 },
      },
      {
        latitude_deg: bestLat - 0.03,
        longitude_deg: bestLon - 0.03,
        uncertainty_km: uncertainty * 1.8,
        confidence: 0.5,
        estimated_magnitude: 5.2,
        estimated_depth_km: 8,
        method: "tdoa",
        error_ellipse: { major_axis_km: uncertainty * 2.2, minor_axis_km: uncertainty * 1.4, orientation_deg: 60 },
      },
    ],
    stations,
    readings,
  };
}

export async function runLocalization(request: LocalizationRequest): Promise<LocalizationResult> {
  try {
    return await request<LocalizationResult>("/api/network/localize", {
      method: "POST",
      body: JSON.stringify(request),
    });
  } catch {
    return mockLocalizationResult(request);
  }
}

function mockEarthquakeTriggerResult(request: EarthquakeTriggerRequest): EarthquakeTriggerResult {
  const mag = request.magnitude || 5;
  const dur = request.duration || 30;
  const sampleRate = 100;
  const totalSamples = Math.floor(dur * sampleRate);
  const directionRad = ((request.earthquake_direction_deg || 0) * Math.PI) / 180;

  const maxAmp = Math.min(1, Math.pow(10, (mag - 4) / 2));
  const triggerAccel = 0.05 * (request.instrument_type === "modern_seismometer" ? 1 : 2);
  let triggered = false;
  let triggerTime = -1;
  let triggerAngle = 0;
  let dragonIndex = -1;
  let maxAngle = 0;
  let peakAccel = 0;

  const trajectory: EarthquakeTriggerResult["trajectory"] = [];
  const dragonHeads: boolean[] = Array(8).fill(false);

  for (let i = 0; i < totalSamples; i += Math.max(1, Math.floor(totalSamples / 200))) {
    const t = i / sampleRate;
    const envelope = Math.exp(-Math.abs(t - dur / 3) * 0.15);
    const waveAcc = maxAmp * envelope *
      (0.6 * Math.sin(2 * Math.PI * 2 * t) +
       0.3 * Math.sin(2 * Math.PI * 3 * t + 0.7) +
       0.1 * Math.sin(2 * Math.PI * 1 * t + 1.3));
    peakAccel = Math.max(peakAccel, Math.abs(waveAcc));

    const angDeg = waveAcc * 80;
    maxAngle = Math.max(maxAngle, Math.abs(angDeg));

    const thetaX = (angDeg * Math.PI / 180) * Math.sin(directionRad);
    const thetaY = (angDeg * Math.PI / 180) * Math.cos(directionRad);
    const omegaX = (waveAcc * 2 * Math.PI * 2 * 80 * Math.PI / 180) * Math.sin(directionRad) / 100;
    const omegaY = (waveAcc * 2 * Math.PI * 2 * 80 * Math.PI / 180) * Math.cos(directionRad) / 100;

    trajectory.push({
      t,
      theta_x: thetaX,
      theta_y: thetaY,
      omega_x: omegaX,
      omega_y: omegaY,
      contact_force_x: 0,
      contact_force_y: 0,
    });

    if (!triggered && Math.abs(angDeg) > (request.trigger_angle_threshold || 5)) {
      triggered = true;
      triggerTime = t;
      triggerAngle = Math.abs(angDeg);
      const bearing = Math.atan2(thetaX, thetaY) * 180 / Math.PI;
      dragonIndex = Math.round(((bearing + 360) % 360) / 45) % 8;
    }

    if (triggered) {
      dragonHeads[dragonIndex] = true;
    }
  }

  const directions = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"];

  return {
    status: "ok",
    triggered,
    max_angle: maxAngle,
    peak_acceleration: peakAccel,
    trigger: {
      dragon_index: dragonIndex,
      direction: dragonIndex >= 0 ? directions[dragonIndex] : "",
      trigger_time: triggerTime,
      angle_at_trigger: triggerAngle,
    },
    dragon_heads: dragonHeads,
    trajectory,
    params: {
      magnitude: mag,
      distance: request.distance || 100,
      duration: dur,
      instrument_type: request.instrument_type || "didongyi",
      material_type: request.material_type || "copper",
      earthquake_direction_deg: request.earthquake_direction_deg || 0,
    },
  };
}

export async function triggerEarthquake(request: EarthquakeTriggerRequest): Promise<EarthquakeTriggerResult> {
  try {
    return await request<EarthquakeTriggerResult>("/api/earthquake/trigger", {
      method: "POST",
      body: JSON.stringify(request),
    });
  } catch {
    return mockEarthquakeTriggerResult(request);
  }
}

export { BASE_URL };
