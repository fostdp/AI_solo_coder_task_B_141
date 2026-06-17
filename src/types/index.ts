export type SiteSoilType = "I0" | "I1" | "II" | "III" | "IV"
export type InstrumentType = "didongyi" | "water_clock_armillary" | "modern_seismometer"
export type MaterialType = "copper" | "iron" | "wood" | "steel"
export type LocalizationMethod = "auto" | "bearing" | "tdoa" | "fused"

export const SITE_SOIL_OPTIONS: Array<{ value: SiteSoilType; label: string; amplification: number; description: string }> = [
  { value: "I0", label: "I₀ 类岩石", amplification: 0.85, description: "坚硬岩石，放大系数 0.85" },
  { value: "I1", label: "I₁ 类坚硬土", amplification: 1.0, description: "坚硬土/岩石，放大系数 1.00" },
  { value: "II", label: "II 类中硬土", amplification: 1.25, description: "中硬场地土，放大系数 1.25" },
  { value: "III", label: "III 类中软土", amplification: 1.65, description: "中软场地土，放大系数 1.65" },
  { value: "IV", label: "IV 类软弱土", amplification: 2.1, description: "软弱场地土，放大系数 2.10" },
]

export interface DragonStatus {
  id: number;
  direction: string;
  angle: number;
  triggered: boolean;
  ball_dropped: boolean;
  trigger_time_ms?: number;
}

export interface PillarState {
  displacement_x: number;
  displacement_y: number;
  angle: number;
  angular_velocity: number;
  velocity_x?: number;
  velocity_y?: number;
}

export interface WaveData {
  acceleration: number;
  frequency: number;
  amplitude: number;
  history?: number[];
}

export interface SensorSample {
  id: number;
  timestamp: number;
  displacement_x: number;
  displacement_y: number;
  tilt_angle: number;
  acceleration: number;
  waveform_sample: number;
}

export interface SensorRecord {
  device_id: string;
  timestamp: string;
  pillar: PillarState;
  wave: WaveData;
  dragons: DragonStatus[];
  magnitude?: number;
  epicenter_distance?: number;
  sample?: SensorSample;
}

export interface SimulationParams {
  magnitude: number;
  epicenter_distance: number;
  pillar_mass: number;
  pillar_height: number;
  damping_ratio: number;
  duration: number;
  earthquake_direction?: number;
  sample_rate?: number;
  site_soil?: SiteSoilType;
  limit_angle?: number;
  penalty_stiffness?: number;
  friction_coeff?: number;
}

export interface TrajectoryPoint {
  t: number;
  x: number;
  y: number;
  angle: number;
  angular_vel: number;
  wave_acc: number;
}

export interface SimulationResult {
  simulation_id: string;
  created_at?: string;
  params: SimulationParams;
  pillar_trajectory: TrajectoryPoint[];
  triggered_dragons: number[];
  trigger_time: number;
  max_angle: number;
}

export interface HeatmapCell {
  row: number;
  col: number;
  label?: string;
  value: number;
  magnitude: number;
  distance: number;
  detection_prob: number;
  false_alarm_rate: number;
  avg_trigger_time: number;
}

export interface ROCPoint {
  threshold: number;
  tpr: number;
  fpr: number;
}

export interface SensitivityResult {
  analysis_id: string;
  grid: HeatmapCell[][];
  roc_curve: ROCPoint[];
  optimal_threshold: number;
  detection_area_km2: number;
}

export interface AlertItem {
  id: string;
  timestamp: string;
  type: "misfire" | "sensitivity_drop" | "system";
  level: "info" | "warning" | "critical";
  message: string;
  mqtt_delivered: boolean;
  device_id?: string;
}

export interface AlertConfig {
  misfire_wave_threshold: number;
  sensitivity_min_rate: number;
  sensitivity_window_min: number;
}

export interface AppToast {
  id: string;
  type: "success" | "warning" | "error" | "info";
  message: string;
}

export const INSTRUMENT_OPTIONS: Array<{ value: InstrumentType; label: string; sensitivityFactor: number; description: string }> = [
  { value: "didongyi", label: "候风地动仪", sensitivityFactor: 1.0, description: "东汉张衡发明，纯机械触发，灵敏度基准" },
  { value: "water_clock_armillary", label: "水运仪象台", sensitivityFactor: 0.35, description: "北宋苏颂发明，水运浑天仪，含阻尼较大" },
  { value: "modern_seismometer", label: "现代地震仪", sensitivityFactor: 25.0, description: "电子放大+惯性传感器，高灵敏度" },
]

export const MATERIAL_OPTIONS: Array<{ value: MaterialType; label: string; density: number; youngsModulus: number; damping: number; costFactor: number }> = [
  { value: "copper", label: "青铜", density: 8960, youngsModulus: 110e9, damping: 0.05, costFactor: 1.0 },
  { value: "iron", label: "熟铁", density: 7870, youngsModulus: 200e9, damping: 0.03, costFactor: 0.6 },
  { value: "wood", label: "硬木", density: 600, youngsModulus: 10e9, damping: 0.08, costFactor: 0.15 },
  { value: "steel", label: "钢材", density: 7850, youngsModulus: 206e9, damping: 0.02, costFactor: 1.5 },
]

export interface InstrumentInfo {
  id: InstrumentType
  name: string
  sensitivity_factor: number
  noise_floor: number
  response_lag_sec: number
}

export interface MaterialInfo {
  id: MaterialType
  name: string
  density_kgm3: number
  youngs_modulus_pa: number
  yield_strength_pa: number
  damping_ratio: number
  poissons_ratio: number
  thermal_expansion: number
  cost_factor: number
}

export interface ComparisonRequest {
  instruments: InstrumentType[]
  materials: MaterialType[]
  magnitude_min?: number
  magnitude_max?: number
  magnitude_steps?: number
  distance_min?: number
  distance_max?: number
  distance_steps?: number
  monte_carlo_trials?: number
  site_soil?: SiteSoilType
}

export interface InstrumentComparisonMetrics {
  instrument: InstrumentType
  material: MaterialType
  sensitivity_factor: number
  noise_floor: number
  response_lag: number
  optimal_threshold: number
  youden_j: number
  detection_area_km2: number
  avg_detection_probability: number
  avg_false_alarm_rate: number
  avg_trigger_time_sec: number
  avg_max_angle_deg: number
  heatmap: Array<{ magnitude: number; distance: number; detection_probability: number; false_alarm_rate: number }>
  roc_curve: ROCPoint[]
}

export interface ComparisonResult {
  request_id: string
  comparisons: InstrumentComparisonMetrics[]
  magnitude_min: number
  magnitude_max: number
  magnitude_steps: number
  distance_min: number
  distance_max: number
  distance_steps: number
}

export interface MaterialAnalysisRequest {
  reference_material?: MaterialType
  test_materials: MaterialType[]
  magnitude?: number
  distance?: number
  duration?: number
  trials?: number
  site_soil?: SiteSoilType
  instrument?: InstrumentType
}

export interface MaterialMetrics {
  material: MaterialType
  material_name: string
  density_kgm3: number
  youngs_modulus_pa: number
  damping_ratio: number
  yield_strength_pa: number
  cost_factor: number
  avg_trigger_time_sec: number
  trigger_time_std: number
  avg_max_angle_deg: number
  max_angle_std: number
  avg_peak_acceleration: number
  detection_probability: number
  false_alarm_rate: number
  response_ratio: number
  cost_efficiency: number
  trigger_times: number[]
  max_angles: number[]
}

export interface MaterialAnalysisResult {
  request_id: string
  reference_material: MaterialType
  material_metrics: MaterialMetrics[]
  magnitude: number
  distance: number
  trials: number
}

export interface StationConfig {
  device_id: string
  latitude_deg: number
  longitude_deg: number
  elevation_m?: number
  time_uncertainty_sec?: number
  azimuth_uncertainty_deg?: number
}

export interface StationReading {
  device_id: string
  trigger_time_sec: number
  azimuth_deg?: number
  peak_acceleration: number
  signal_to_noise?: number
  dragon_index?: number
}

export interface EpicenterEstimate {
  latitude_deg: number
  longitude_deg: number
  uncertainty_km: number
  confidence: number
  estimated_magnitude: number
  estimated_depth_km: number
  method: string
  error_ellipse: {
    major_axis_km: number
    minor_axis_km: number
    orientation_deg: number
  }
}

export interface LocalizationResult {
  status: string
  converged: boolean
  valid_stations: number
  residual_mean: number
  residual_std: number
  best_estimate: EpicenterEstimate
  candidate_estimates: EpicenterEstimate[]
  stations: StationConfig[]
  readings: StationReading[]
}

export interface LocalizationRequest {
  stations: StationConfig[]
  readings: StationReading[]
  method?: LocalizationMethod
  wave_velocity_km_sec?: number
}

export interface EarthquakeTriggerRequest {
  magnitude: number
  distance?: number
  distance?: number
  duration?: number
  instrument_type?: InstrumentType
  material_type?: MaterialType
  earthquake_direction_deg?: number
  site_soil?: SiteSoilType
  pillar_mass?: number
  pillar_height?: number
  damping_ratio?: number
  frequency?: number
  decay_alpha?: number
  trigger_angle_threshold?: number
  limit_angle?: number
  penalty_stiffness?: number
  penalty_damping?: number
  friction_coeff?: number
}

export interface EarthquakeTriggerResult {
  status: string
  triggered: boolean
  max_angle: number
  peak_acceleration: number
  trigger: {
    dragon_index: number
    direction: string
    trigger_time: number
    angle_at_trigger: number
  }
  dragon_heads: boolean[]
  trajectory: Array<{
    t: number
    theta_x: number
    theta_y: number
    omega_x: number
    omega_y: number
    contact_force_x: number
    contact_force_y: number
  }>
  params: {
    magnitude: number
    distance: number
    duration: number
    instrument_type: InstrumentType
    material_type: MaterialType
    earthquake_direction_deg: number
  }
}

