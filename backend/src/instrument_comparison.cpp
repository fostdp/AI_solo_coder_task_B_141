#include "instrument_comparison.h"
#include <algorithm>
#include <numeric>
#include <cmath>
#include <sstream>
#include <iomanip>

static std::string generateId() {
    std::ostringstream oss;
    auto now = std::chrono::system_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()).count();
    oss << "CMP-" << ms;
    return oss.str();
}

double InstrumentComparisonEngine::integrateDetectionArea(
    const std::vector<HeatmapCell>& heatmap,
    double mag_min, double mag_max,
    double dist_min, double dist_max,
    double threshold) {

    double area = 0.0;
    double dM = (mag_max - mag_min) / std::sqrt(heatmap.size());
    double dD = (dist_max - dist_min) / std::sqrt(heatmap.size());

    for (const auto& cell : heatmap) {
        if (cell.detection_probability >= threshold) {
            double lat_rad = cell.magnitude * M_PI / 180.0;
            area += dM * 111.0 * dD * 111.0 * std::cos(lat_rad);
        }
    }
    return area;
}

InstrumentComparisonMetrics InstrumentComparisonEngine::computeInstrumentMetrics(
    InstrumentType instrument,
    MaterialType material,
    const ComparisonRequest& request) {

    InstrumentComparisonMetrics metrics;
    metrics.instrument = instrument;
    metrics.material = material;
    metrics.sensitivity_factor = SimulationEngine::instrumentSensitivityFactor(instrument);
    metrics.noise_floor = SimulationEngine::instrumentNoiseFloor(instrument);
    metrics.response_lag = SimulationEngine::instrumentResponseLag(instrument);

    SimulationEngine engine;
    SensitivityAnalyzer analyzer;

    SensitivityParameters params;
    params.magnitude_min = request.magnitude_min;
    params.magnitude_max = request.magnitude_max;
    params.magnitude_steps = request.magnitude_steps;
    params.distance_min = request.distance_min;
    params.distance_max = request.distance_max;
    params.distance_steps = request.distance_steps;
    params.monte_carlo_trials = request.monte_carlo_trials;
    params.site_soil = request.site_soil;
    params.duration = 30.0;
    params.dt = 0.001;

    MaterialProperties material_props = SimulationEngine::getMaterialProperties(material);
    params.pillar_mass = 500.0;
    params.pillar_height = 1.8;
    params.pillar_diameter = 0.12;
    params.height_diameter_ratio = 6.0;
    params.damping_ratio = (0.03 + material_props.damping_ratio) / 2.0;
    params.wave_model = EarthquakeWaveModel::SIMPLE_SINE;

    SensitivityResult sensitivity = analyzer.analyze(params);
    metrics.heatmap = sensitivity.heatmap;
    metrics.roc_curve = sensitivity.roc_curve;
    metrics.optimal_threshold = sensitivity.optimal_threshold;
    metrics.youden_j = sensitivity.youden_j;

    metrics.detection_area_km2 = integrateDetectionArea(
        sensitivity.heatmap,
        request.magnitude_min, request.magnitude_max,
        request.distance_min, request.distance_max);

    double total_detection = 0, total_far = 0, total_trigger = 0;
    int count = 0;
    for (const auto& cell : sensitivity.heatmap) {
        total_detection += cell.detection_probability;
        total_far += cell.false_alarm_rate;
        count++;
    }
    metrics.avg_detection_probability = count > 0 ? total_detection / count : 0;
    metrics.avg_false_alarm_rate = count > 0 ? total_far / count : 0;

    SimulationParameters sim_params;
    sim_params.instrument_type = instrument;
    sim_params.material_type = material;
    sim_params.magnitude = (request.magnitude_min + request.magnitude_max) / 2;
    sim_params.distance = (request.distance_min + request.distance_max) / 2;
    sim_params.site_soil = request.site_soil;
    sim_params.pillar_mass = params.pillar_mass;
    sim_params.pillar_height = params.pillar_height;
    sim_params.damping_ratio = params.damping_ratio;
    sim_params.duration = 30.0;
    sim_params.dt = 0.001;

    double sum_trigger = 0, sum_angle = 0;
    int sim_count = 0;
    for (int i = 0; i < 10; i++) {
        auto result = engine.runSimulation(sim_params);
        if (result.triggered) {
            sum_trigger += result.trigger.trigger_time;
            sim_count++;
        }
        sum_angle += result.max_angle;
    }
    metrics.avg_trigger_time_sec = sim_count > 0 ? sum_trigger / sim_count : 30.0;
    metrics.avg_max_angle_deg = sum_angle / 10.0;

    return metrics;
}

ComparisonResult InstrumentComparisonEngine::runInstrumentComparison(
    const ComparisonRequest& request) {

    ComparisonResult result;
    result.request_id = generateId();
    result.instruments = request.instruments;
    result.materials = request.materials;
    result.magnitude_min = request.magnitude_min;
    result.magnitude_max = request.magnitude_max;
    result.magnitude_steps = request.magnitude_steps;
    result.distance_min = request.distance_min;
    result.distance_max = request.distance_max;
    result.distance_steps = request.distance_steps;

    for (auto instrument : request.instruments) {
        for (auto material : request.materials) {
            auto metrics = computeInstrumentMetrics(instrument, material, request);
            result.comparisons.push_back(metrics);
        }
    }

    return result;
}

MaterialMetrics InstrumentComparisonEngine::computeMaterialMetrics(
    MaterialType material,
    const MaterialAnalysisRequest& request) {

    MaterialMetrics metrics;
    metrics.material = material;
    metrics.material_name = SimulationEngine::materialTypeName(material);

    MaterialProperties props = SimulationEngine::getMaterialProperties(material);
    metrics.density_kgm3 = props.density_kgm3;
    metrics.youngs_modulus_pa = props.youngs_modulus_pa;
    metrics.damping_ratio = props.damping_ratio;
    metrics.elastic_damping_ratio = props.elastic_damping_ratio;
    metrics.structural_damping_ratio = props.structural_damping_ratio;
    metrics.yield_strength_pa = props.yield_strength_pa;
    metrics.cost_factor = props.cost_factor;

    SimulationEngine engine;
    SimulationParameters sim_params;
    sim_params.instrument_type = request.instrument;
    sim_params.material_type = material;
    sim_params.magnitude = request.magnitude;
    sim_params.distance = request.distance;
    sim_params.site_soil = request.site_soil;
    sim_params.pillar_mass = 500.0 * (props.density_kgm3 / 8960.0);
    sim_params.pillar_height = 1.8;
    sim_params.pillar_diameter = 0.12;
    sim_params.height_diameter_ratio = 6.0;
    sim_params.damping_ratio = (0.03 + props.damping_ratio) / 2.0;
    sim_params.duration = request.duration;
    sim_params.dt = 0.001;
    sim_params.frequency = 1.0;
    sim_params.decay_alpha = 0.5;
    sim_params.wave_model = EarthquakeWaveModel::SIMPLE_SINE;
    sim_params.trigger_angle_threshold = 5.0;
    sim_params.limit_angle = 8.0;
    sim_params.penalty_stiffness = 5.0e6;
    sim_params.penalty_damping = 1.2e3;
    sim_params.friction_coeff = 0.15;

    int triggered = 0;
    double sum_peak_accel = 0;

    for (int i = 0; i < request.trials; i++) {
        auto result = engine.runSimulation(sim_params);
        sum_peak_accel += result.peak_acceleration;
        if (result.triggered) {
            triggered++;
            metrics.trigger_times.push_back(result.trigger.trigger_time);
        }
        metrics.max_angles.push_back(result.max_angle);
    }

    if (!metrics.trigger_times.empty()) {
        double sum = std::accumulate(metrics.trigger_times.begin(),
                                      metrics.trigger_times.end(), 0.0);
        metrics.avg_trigger_time_sec = sum / metrics.trigger_times.size();
        double sq_sum = 0;
        for (auto t : metrics.trigger_times) {
            sq_sum += (t - metrics.avg_trigger_time_sec) * (t - metrics.avg_trigger_time_sec);
        }
        metrics.trigger_time_std = std::sqrt(sq_sum / metrics.trigger_times.size());
    } else {
        metrics.avg_trigger_time_sec = request.duration;
        metrics.trigger_time_std = 0;
    }

    if (!metrics.max_angles.empty()) {
        double sum = std::accumulate(metrics.max_angles.begin(),
                                      metrics.max_angles.end(), 0.0);
        metrics.avg_max_angle_deg = sum / metrics.max_angles.size();
        double sq_sum = 0;
        for (auto a : metrics.max_angles) {
            sq_sum += (a - metrics.avg_max_angle_deg) * (a - metrics.avg_max_angle_deg);
        }
        metrics.max_angle_std = std::sqrt(sq_sum / metrics.max_angles.size());
    }

    metrics.avg_peak_acceleration = sum_peak_accel / request.trials;
    metrics.detection_probability = static_cast<double>(triggered) / request.trials;

    SimulationParameters noise_params = sim_params;
    noise_params.magnitude = 0;
    int false_triggers = 0;
    for (int i = 0; i < request.trials; i++) {
        auto result = engine.runSimulation(noise_params);
        if (result.triggered) false_triggers++;
    }
    metrics.false_alarm_rate = static_cast<double>(false_triggers) / request.trials;

    MaterialProperties ref_props = SimulationEngine::getMaterialProperties(request.reference_material);
    if (ref_props.density_kgm3 > 0 && metrics.avg_trigger_time_sec > 0) {
        double ref_mass_ratio = ref_props.density_kgm3 / 8960.0;
        double test_mass_ratio = props.density_kgm3 / 8960.0;
        metrics.response_ratio = (ref_mass_ratio / test_mass_ratio) *
                                 (metrics.avg_trigger_time_sec > 0 ?
                                  1.0 / (metrics.avg_trigger_time_sec / 2.0) : 1.0);
    } else {
        metrics.response_ratio = 1.0;
    }

    if (props.cost_factor > 0 && metrics.detection_probability > 0) {
        metrics.cost_efficiency = metrics.detection_probability / props.cost_factor;
    } else {
        metrics.cost_efficiency = 0;
    }

    return metrics;
}

MaterialAnalysisResult InstrumentComparisonEngine::runMaterialAnalysis(
    const MaterialAnalysisRequest& request) {

    MaterialAnalysisResult result;
    result.request_id = generateId();
    result.reference_material = request.reference_material;
    result.magnitude = request.magnitude;
    result.distance = request.distance;
    result.trials = request.trials;

    result.material_metrics.push_back(
        computeMaterialMetrics(request.reference_material, request));

    for (auto material : request.test_materials) {
        if (material != request.reference_material) {
            result.material_metrics.push_back(
                computeMaterialMetrics(material, request));
        }
    }

    return result;
}
