#pragma once

#include <vector>
#include <string>
#include <array>
#include "simulation_engine.h"
#include "sensitivity_analyzer.h"

struct ComparisonRequest {
    std::vector<InstrumentType> instruments;
    std::vector<MaterialType> materials;
    double magnitude_min = 2.0;
    double magnitude_max = 8.0;
    int magnitude_steps = 12;
    double distance_min = 10.0;
    double distance_max = 800.0;
    int distance_steps = 12;
    int monte_carlo_trials = 20;
    SiteSoilType site_soil = SiteSoilType::II;
};

struct InstrumentComparisonMetrics {
    InstrumentType instrument;
    MaterialType material;
    std::vector<HeatmapCell> heatmap;
    std::vector<ROCPoint> roc_curve;
    double optimal_threshold;
    double youden_j;
    double detection_area_km2;
    double avg_detection_probability;
    double avg_false_alarm_rate;
    double avg_trigger_time_sec;
    double avg_max_angle_deg;
    double sensitivity_factor;
    double noise_floor;
    double response_lag;
};

struct ComparisonResult {
    std::string request_id;
    std::vector<InstrumentComparisonMetrics> comparisons;
    std::vector<InstrumentType> instruments;
    std::vector<MaterialType> materials;
    double magnitude_min;
    double magnitude_max;
    int magnitude_steps;
    double distance_min;
    double distance_max;
    int distance_steps;
};

struct MaterialAnalysisRequest {
    MaterialType reference_material = MaterialType::COPPER;
    std::vector<MaterialType> test_materials;
    double magnitude = 5.0;
    double distance = 100.0;
    double duration = 30.0;
    SiteSoilType site_soil = SiteSoilType::II;
    int trials = 10;
    InstrumentType instrument = InstrumentType::DIDONGYI;
};

struct MaterialMetrics {
    MaterialType material;
    std::string material_name;
    double density_kgm3;
    double youngs_modulus_pa;
    double damping_ratio;
    double yield_strength_pa;
    double cost_factor;
    double avg_trigger_time_sec;
    double trigger_time_std;
    double avg_max_angle_deg;
    double max_angle_std;
    double avg_peak_acceleration;
    double detection_probability;
    double false_alarm_rate;
    double response_ratio;
    double cost_efficiency;
    std::vector<double> trigger_times;
    std::vector<double> max_angles;
};

struct MaterialAnalysisResult {
    std::string request_id;
    MaterialType reference_material;
    std::vector<MaterialMetrics> material_metrics;
    double magnitude;
    double distance;
    int trials;
};

class InstrumentComparisonEngine {
public:
    InstrumentComparisonEngine() = default;

    ComparisonResult runInstrumentComparison(const ComparisonRequest& request);

    MaterialAnalysisResult runMaterialAnalysis(const MaterialAnalysisRequest& request);

private:
    InstrumentComparisonMetrics computeInstrumentMetrics(
        InstrumentType instrument,
        MaterialType material,
        const ComparisonRequest& request);

    MaterialMetrics computeMaterialMetrics(
        MaterialType material,
        const MaterialAnalysisRequest& request);

    static double integrateDetectionArea(const std::vector<HeatmapCell>& heatmap,
                                          double mag_min, double mag_max,
                                          double dist_min, double dist_max,
                                          double threshold = 0.5);
};
