import { vi } from 'vitest'
import type {
  SensorRecord,
  SimulationParams,
  SimulationResult,
  SensitivityResult,
  AlertItem,
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
} from '@/types'

const DRAGON_DIRECTIONS = [
  { id: 0, direction: '北', angle: 0 },
  { id: 1, direction: '东北', angle: 45 },
  { id: 2, direction: '东', angle: 90 },
  { id: 3, direction: '东南', angle: 135 },
  { id: 4, direction: '南', angle: 180 },
  { id: 5, direction: '西南', angle: 225 },
  { id: 6, direction: '西', angle: 270 },
  { id: 7, direction: '西北', angle: 315 },
]

export function mockDragons(triggers: number[] = []): SensorRecord['dragons'] {
  return DRAGON_DIRECTIONS.map((d) => ({
    ...d,
    triggered: triggers.includes(d.id),
    ball_dropped: triggers.includes(d.id),
    trigger_time_ms: triggers.includes(d.id) ? Date.now() : undefined,
  }))
}

export function mockSensorRecord(deviceId = 'DDY-001'): SensorRecord {
  return {
    device_id: deviceId,
    timestamp: new Date().toISOString(),
    pillar: {
      displacement_x: 0,
      displacement_y: 0,
      angle: 0,
      angular_velocity: 0,
    },
    wave: {
      acceleration: 0,
      frequency: 0,
      amplitude: 0,
      history: Array(128).fill(0),
    },
    dragons: mockDragons(),
  }
}

export function mockSimulationResult(params: Partial<SimulationParams> = {}): SimulationResult {
  return {
    simulation_id: 'SIM-TEST-001',
    created_at: new Date().toISOString(),
    params: {
      magnitude: 5,
      epicenter_distance: 100,
      pillar_mass: 100,
      pillar_height: 2,
      damping_ratio: 0.05,
      duration: 30,
      ...params,
    } as SimulationParams,
    pillar_trajectory: [
      { t: 0, x: 0, y: 0, angle: 0, angular_vel: 0, wave_acc: 0 },
      { t: 1, x: 0.001, y: 0.001, angle: 1, angular_vel: 1, wave_acc: 0.1 },
      { t: 2, x: 0.002, y: 0.002, angle: 2, angular_vel: 2, wave_acc: 0.15 },
    ],
    triggered_dragons: [0],
    trigger_time: 1.5,
    max_angle: 3.5,
  }
}

export function mockSensitivityResult(): SensitivityResult {
  const grid: SensitivityResult['grid'] = []
  for (let i = 0; i < 8; i++) {
    const row: SensitivityResult['grid'][0] = []
    for (let j = 0; j < 10; j++) {
      row.push({
        row: i,
        col: j,
        value: 0.5,
        label: '50%',
        magnitude: 2 + i * 0.6,
        distance: 20 + j * 80,
        detection_prob: 0.5,
        false_alarm_rate: 0.05,
        avg_trigger_time: 2.5,
      })
    }
    grid.push(row)
  }

  return {
    analysis_id: 'SA-TEST-001',
    grid,
    roc_curve: [
      { threshold: 0, tpr: 0, fpr: 0 },
      { threshold: 0.5, tpr: 0.5, fpr: 0.05 },
      { threshold: 1, tpr: 0.8, fpr: 0.1 },
      { threshold: 1.5, tpr: 0.9, fpr: 0.07 },
      { threshold: 2, tpr: 0.95, fpr: 0.05 },
    ],
    optimal_threshold: 1.2,
    detection_area_km2: 125600,
  }
}

export function mockAlerts(limit = 10, level?: AlertItem['level']): AlertItem[] {
  const templates: Array<Omit<AlertItem, 'id' | 'timestamp'>> = [
    { type: 'misfire', level: 'warning', message: '东北方位触发但波形加速度低于阈值 0.15 m/s²，疑似误触发', mqtt_delivered: true, device_id: 'DDY-001' },
    { type: 'system', level: 'info', message: '设备 DDY-001 连接已恢复', mqtt_delivered: true, device_id: 'DDY-001' },
    { type: 'sensitivity_drop', level: 'critical', message: '过去 30 分钟检测率降至 62%，低于阈值 75%', mqtt_delivered: false },
    { type: 'misfire', level: 'critical', message: '西、西北连续两次误触发，建议校准支柱机械结构', mqtt_delivered: true, device_id: 'DDY-001' },
    { type: 'system', level: 'warning', message: 'MQTT 消息队列积压超过 200 条', mqtt_delivered: false },
  ]

  const pool = level ? templates.filter((a) => a.level === level) : templates
  const n = Math.min(limit, pool.length * 3)
  const out: AlertItem[] = []

  for (let i = 0; i < n; i++) {
    const tpl = pool[i % pool.length]
    out.push({
      id: `AL-TEST-${i + 1}`,
      timestamp: new Date(Date.now() - i * 1000 * 60 * (3 + Math.random() * 10)).toISOString(),
      ...tpl,
    })
  }

  return out
}

export function mockInstruments(): InstrumentInfo[] {
  return [
    { id: 'didongyi', name: 'didongyi', sensitivity_factor: 1.0, noise_floor: 0.005, response_lag_sec: 0 },
    { id: 'water_clock_armillary', name: 'water_clock_armillary', sensitivity_factor: 0.35, noise_floor: 0.02, response_lag_sec: 0.8 },
    { id: 'modern_seismometer', name: 'modern_seismometer', sensitivity_factor: 25.0, noise_floor: 1e-8, response_lag_sec: 0.001 },
  ]
}

export function mockMaterials(): MaterialInfo[] {
  return [
    { id: 'copper', name: 'copper', density_kgm3: 8960, youngs_modulus_pa: 110e9, yield_strength_pa: 70e6, damping_ratio: 0.05, poissons_ratio: 0.34, thermal_expansion: 16.5e-6, cost_factor: 1.0 },
    { id: 'iron', name: 'iron', density_kgm3: 7870, youngs_modulus_pa: 200e9, yield_strength_pa: 240e6, damping_ratio: 0.03, poissons_ratio: 0.29, thermal_expansion: 11.8e-6, cost_factor: 0.6 },
    { id: 'wood', name: 'wood', density_kgm3: 600, youngs_modulus_pa: 10e9, yield_strength_pa: 40e6, damping_ratio: 0.08, poissons_ratio: 0.35, thermal_expansion: 5e-6, cost_factor: 0.15 },
    { id: 'steel', name: 'steel', density_kgm3: 7850, youngs_modulus_pa: 206e9, yield_strength_pa: 350e6, damping_ratio: 0.02, poissons_ratio: 0.30, thermal_expansion: 11.7e-6, cost_factor: 1.5 },
  ]
}

export function mockComparisonResult(request: Partial<ComparisonRequest> = {}): ComparisonResult {
  const instruments = request.instruments || ['didongyi', 'water_clock_armillary', 'modern_seismometer']
  const materials = request.materials || ['copper']
  const comparisons: ComparisonResult['comparisons'] = []

  for (const inst of instruments) {
    for (const mat of materials) {
      const sensitivity = inst === 'modern_seismometer' ? 25.0 : inst === 'didongyi' ? 1.0 : 0.35
      const baseProb = inst === 'modern_seismometer' ? 0.9 : inst === 'didongyi' ? 0.6 : 0.25
      const far = inst === 'modern_seismometer' ? 0.01 : inst === 'didongyi' ? 0.08 : 0.15

      const heatmap: ComparisonResult['comparisons'][0]['heatmap'] = []
      for (let mi = 0; mi < (request.magnitude_steps || 12); mi++) {
        for (let di = 0; di < (request.distance_steps || 12); di++) {
          const mag = (request.magnitude_min || 2) + mi * ((request.magnitude_max || 8) - (request.magnitude_min || 2)) / ((request.magnitude_steps || 12) - 1)
          const dist = (request.distance_min || 10) + di * ((request.distance_max || 800) - (request.distance_min || 10)) / ((request.distance_steps || 12) - 1)
          const prob = Math.min(0.99, Math.max(0, baseProb * Math.min(1, (mag - 2) / 4) * Math.exp(-dist / 300)))
          heatmap.push({ magnitude: mag, distance: dist, detection_probability: prob, false_alarm_rate: far * prob })
        }
      }

      const roc: SensitivityResult['roc_curve'] = []
      for (let t = 0; t <= 20; t++) {
        const threshold = t * 0.25
        const tpr = Math.min(1, Math.max(0, 1 - Math.exp(-threshold * sensitivity * 0.5)))
        const fpr = Math.min(0.3, threshold * 0.02 * sensitivity)
        roc.push({ threshold: Math.round(threshold * 10) / 10, tpr: Math.round(tpr * 100) / 100, fpr: Math.round(fpr * 100) / 100 })
      }

      comparisons.push({
        instrument: inst,
        material: mat,
        sensitivity_factor: sensitivity,
        noise_floor: inst === 'modern_seismometer' ? 1e-8 : inst === 'didongyi' ? 0.005 : 0.02,
        response_lag: inst === 'modern_seismometer' ? 0.001 : inst === 'didongyi' ? 0 : 0.8,
        optimal_threshold: 3.5,
        youden_j: baseProb - far,
        detection_area_km2: baseProb * 500000,
        avg_detection_probability: baseProb,
        avg_false_alarm_rate: far,
        avg_trigger_time_sec: inst === 'modern_seismometer' ? 0.5 : inst === 'didongyi' ? 2.5 : 5.0,
        avg_max_angle_deg: inst === 'modern_seismometer' ? 1.5 : inst === 'didongyi' ? 6.5 : 3.5,
        heatmap,
        roc_curve: roc,
      })
    }
  }

  return {
    request_id: 'CMP-TEST-001',
    comparisons,
    magnitude_min: request.magnitude_min || 2,
    magnitude_max: request.magnitude_max || 8,
    magnitude_steps: request.magnitude_steps || 12,
    distance_min: request.distance_min || 10,
    distance_max: request.distance_max || 800,
    distance_steps: request.distance_steps || 12,
  }
}

export function mockMaterialAnalysisResult(request: Partial<MaterialAnalysisRequest> = {}): MaterialAnalysisResult {
  const materials = request.test_materials || ['copper', 'iron', 'wood', 'steel']
  const metrics: MaterialAnalysisResult['material_metrics'] = []

  const refDensity = request.reference_material === 'copper' ? 8960 : 7870

  for (const mat of materials) {
    const info = {
      copper: { density: 8960, youngs: 110e9, damping: 0.05, yield: 70e6, cost: 1.0 },
      iron: { density: 7870, youngs: 200e9, damping: 0.03, yield: 240e6, cost: 0.6 },
      wood: { density: 600, youngs: 10e9, damping: 0.08, yield: 40e6, cost: 0.15 },
      steel: { density: 7850, youngs: 206e9, damping: 0.02, yield: 350e6, cost: 1.5 },
    }[mat] || { density: 8960, youngs: 110e9, damping: 0.05, yield: 70e6, cost: 1.0 }

    const massRatio = info.density / refDensity
    const baseTrigger = 2.0 + Math.random() * 1.0
    const triggerTime = baseTrigger * massRatio
    const baseAngle = 5.0 + Math.random() * 2.0
    const maxAngle = baseAngle * (1 + (1 - massRatio) * 0.5)

    const trials = request.trials || 10
    const triggerTimes = Array.from({ length: trials }, () => triggerTime + (Math.random() - 0.5) * 0.5)
    const maxAngles = Array.from({ length: trials }, () => maxAngle + (Math.random() - 0.5) * 1.0)

    const avgTrigger = triggerTimes.reduce((a, b) => a + b, 0) / triggerTimes.length
    const avgAngle = maxAngles.reduce((a, b) => a + b, 0) / maxAngles.length
    const stdTrigger = Math.sqrt(triggerTimes.reduce((s, t) => s + (t - avgTrigger) ** 2, 0) / triggerTimes.length)
    const stdAngle = Math.sqrt(maxAngles.reduce((s, t) => s + (t - avgAngle) ** 2, 0) / maxAngles.length)

    const mag = request.magnitude || 5
    const dist = request.distance || 100
    const detectionProb = Math.min(0.99, Math.max(0, (1 - Math.exp(-mag / 4)) * Math.exp(-dist / 400) / massRatio))
    const falseAlarmRate = Math.min(0.2, 0.01 * (1 / info.damping) * massRatio)

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
    })
  }

  return {
    request_id: 'MAT-TEST-001',
    reference_material: request.reference_material || 'copper',
    material_metrics: metrics,
    magnitude: request.magnitude || 5,
    distance: request.distance || 100,
    trials: request.trials || 10,
  }
}

export function mockLocalizationResult(request: Partial<LocalizationRequest> = {}): LocalizationResult {
  const stations = request.stations || []
  const readings = request.readings || []

  if (stations.length < 2 || readings.length < 2) {
    return {
      status: 'ok',
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
        method: 'insufficient_data',
        error_ellipse: { major_axis_km: 200, minor_axis_km: 200, orientation_deg: 0 },
      },
      candidate_estimates: [],
      stations,
      readings,
    }
  }

  const avgLat = stations.reduce((s, st) => s + st.latitude_deg, 0) / stations.length
  const avgLon = stations.reduce((s, st) => s + st.longitude_deg, 0) / stations.length

  const perturbation = (Math.random() - 0.5) * 0.2
  const bestLat = avgLat + perturbation
  const bestLon = avgLon + perturbation

  const uncertainty = Math.max(5, 50 / Math.min(readings.length, 6))

  return {
    status: 'ok',
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
      method: request.method || 'auto',
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
        method: 'bearing',
        error_ellipse: { major_axis_km: uncertainty * 1.8, minor_axis_km: uncertainty * 1.2, orientation_deg: 30 },
      },
      {
        latitude_deg: bestLat - 0.03,
        longitude_deg: bestLon - 0.03,
        uncertainty_km: uncertainty * 1.8,
        confidence: 0.5,
        estimated_magnitude: 5.2,
        estimated_depth_km: 8,
        method: 'tdoa',
        error_ellipse: { major_axis_km: uncertainty * 2.2, minor_axis_km: uncertainty * 1.4, orientation_deg: 60 },
      },
    ],
    stations,
    readings,
  }
}

export function mockEarthquakeTriggerResult(request: Partial<EarthquakeTriggerRequest> = {}): EarthquakeTriggerResult {
  const mag = request.magnitude || 5
  const dur = request.duration || 30
  const sampleRate = 100
  const totalSamples = Math.floor(dur * sampleRate)
  const directionRad = ((request.earthquake_direction_deg || 0) * Math.PI) / 180

  const maxAmp = Math.min(1, Math.pow(10, (mag - 4) / 2))
  const triggerAccel = 0.05 * (request.instrument_type === 'modern_seismometer' ? 1 : 2)
  let triggered = false
  let triggerTime = -1
  let triggerAngle = 0
  let dragonIndex = -1
  let maxAngle = 0
  let peakAccel = 0

  const trajectory: EarthquakeTriggerResult['trajectory'] = []
  const dragonHeads: boolean[] = Array(8).fill(false)
  const directions = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE']

  for (let i = 0; i < totalSamples; i += Math.max(1, Math.floor(totalSamples / 200))) {
    const t = i / sampleRate
    const envelope = Math.exp(-Math.abs(t - dur / 3) * 0.15)
    const waveAcc = maxAmp * envelope *
      (0.6 * Math.sin(2 * Math.PI * 2 * t) +
       0.3 * Math.sin(2 * Math.PI * 3 * t + 0.7) +
       0.1 * Math.sin(2 * Math.PI * 1 * t + 1.3))
    peakAccel = Math.max(peakAccel, Math.abs(waveAcc))

    const angDeg = waveAcc * 80
    maxAngle = Math.max(maxAngle, Math.abs(angDeg))

    const thetaX = (angDeg * Math.PI / 180) * Math.sin(directionRad)
    const thetaY = (angDeg * Math.PI / 180) * Math.cos(directionRad)
    const omegaX = (waveAcc * 2 * Math.PI * 2 * 80 * Math.PI / 180) * Math.sin(directionRad) / 100
    const omegaY = (waveAcc * 2 * Math.PI * 2 * 80 * Math.PI / 180) * Math.cos(directionRad) / 100

    trajectory.push({
      t,
      theta_x: thetaX,
      theta_y: thetaY,
      omega_x: omegaX,
      omega_y: omegaY,
      contact_force_x: 0,
      contact_force_y: 0,
    })

    if (!triggered && Math.abs(angDeg) > (request.trigger_angle_threshold || 5)) {
      triggered = true
      triggerTime = t
      triggerAngle = Math.abs(angDeg)
      const bearing = Math.atan2(thetaX, thetaY) * 180 / Math.PI
      dragonIndex = Math.round(((bearing + 360) % 360) / 45) % 8
    }

    if (triggered) {
      dragonHeads[dragonIndex] = true
    }
  }

  return {
    status: 'ok',
    triggered,
    max_angle: maxAngle,
    peak_acceleration: peakAccel,
    trigger: {
      dragon_index: dragonIndex,
      direction: dragonIndex >= 0 ? directions[dragonIndex] : '',
      trigger_time: triggerTime,
      angle_at_trigger: triggerAngle,
    },
    dragon_heads: dragonHeads,
    trajectory,
    params: {
      magnitude: mag,
      distance: request.distance || 100,
      duration: dur,
      instrument_type: request.instrument_type || 'didongyi',
      material_type: request.material_type || 'copper',
      earthquake_direction_deg: request.earthquake_direction_deg || 0,
    },
  }
}

export const mockApi = {
  postSensor: vi.fn(async (data: Partial<SensorRecord>): Promise<SensorRecord> => ({
    ...mockSensorRecord(data.device_id),
    ...data,
  })),
  getRealtime: vi.fn(async (deviceId?: string): Promise<SensorRecord> => mockSensorRecord(deviceId)),
  runSimulation: vi.fn(async (params: SimulationParams): Promise<SimulationResult> => mockSimulationResult(params)),
  runSensitivityAnalysis: vi.fn(async (): Promise<SensitivityResult> => mockSensitivityResult()),
  getAlerts: vi.fn(async (limit?: number, level?: AlertItem['level']): Promise<AlertItem[]> => mockAlerts(limit, level)),
  getInstruments: vi.fn(async (): Promise<InstrumentInfo[]> => mockInstruments()),
  getMaterials: vi.fn(async (): Promise<MaterialInfo[]> => mockMaterials()),
  runInstrumentComparison: vi.fn(async (request: ComparisonRequest): Promise<ComparisonResult> => mockComparisonResult(request)),
  runMaterialAnalysis: vi.fn(async (request: MaterialAnalysisRequest): Promise<MaterialAnalysisResult> => mockMaterialAnalysisResult(request)),
  runLocalization: vi.fn(async (request: LocalizationRequest): Promise<LocalizationResult> => mockLocalizationResult(request)),
  triggerEarthquake: vi.fn(async (request: EarthquakeTriggerRequest): Promise<EarthquakeTriggerResult> => mockEarthquakeTriggerResult(request)),
  BASE_URL: 'http://localhost:8080',
}

export default mockApi
