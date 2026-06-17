#include "material_analyzer.h"
#include <algorithm>
#include <numeric>
#include <cmath>
#include <sstream>
#include <iomanip>
#include <chrono>

static std::string generateMaterialAnalyzerId() {
    std::ostringstream oss;
    auto now = std::chrono::system_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()).count();
    oss << "MAT-" << ms;
    return oss.str();
}

MaterialMetrics MaterialAnalyzer::computeMaterialMetrics(
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

MaterialAnalysisResult MaterialAnalyzer::runMaterialAnalysis(
    const MaterialAnalysisRequest& request) {

    MaterialAnalysisResult result;
    result.request_id = generateMaterialAnalyzerId();
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
