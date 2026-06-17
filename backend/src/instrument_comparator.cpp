#include "instrument_comparator.h"
#include <algorithm>
#include <numeric>
#include <cmath>
#include <sstream>
#include <iomanip>
#include <chrono>

namespace {
    constexpr double PI = 3.14159265358979323846;
}

static std::string generateComparatorId() {
    std::ostringstream oss;
    auto now = std::chrono::system_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()).count();
    oss << "CMP-" << ms;
    return oss.str();
}

double InstrumentComparator::integrateDetectionArea(
    const std::vector<HeatmapCell>& heatmap,
    double mag_min, double mag_max,
    double dist_min, double dist_max,
    double threshold) {

    double area = 0.0;
    double dM = (mag_max - mag_min) / std::sqrt(heatmap.size());
    double dD = (dist_max - dist_min) / std::sqrt(heatmap.size());

    for (const auto& cell : heatmap) {
        if (cell.detection_probability >= threshold) {
            double lat_rad = cell.magnitude * PI / 180.0;
            area += dM * 111.0 * dD * 111.0 * std::cos(lat_rad);
        }
    }
    return area;
}

InstrumentComparisonMetrics InstrumentComparator::computeInstrumentMetrics(
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
    params.damping_ratio = (0.03 + material_props.damping_ratio) / 2.0;

    SensitivityResult sensitivity = analyzer.analyze(params);
    metrics.heatmap = sensitivity.heatmap;
    metrics.roc_curve = sensitivity.roc_curve;
    metrics.optimal_threshold = sensitivity.optimal_threshold;
    metrics.youden_j = sensitivity.youden_j;

    metrics.detection_area_km2 = integrateDetectionArea(
        sensitivity.heatmap,
        request.magnitude_min, request.magnitude_max,
        request.distance_min, request.distance_max);

    double total_detection = 0, total_far = 0;
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

ComparisonResult InstrumentComparator::runInstrumentComparison(
    const ComparisonRequest& request) {

    ComparisonResult result;
    result.request_id = generateComparatorId();
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
