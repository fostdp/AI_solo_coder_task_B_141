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

class InstrumentComparator {
public:
    InstrumentComparator() = default;

    ComparisonResult runInstrumentComparison(const ComparisonRequest& request);

private:
    InstrumentComparisonMetrics computeInstrumentMetrics(
        InstrumentType instrument,
        MaterialType material,
        const ComparisonRequest& request);

    static double integrateDetectionArea(const std::vector<HeatmapCell>& heatmap,
                                          double mag_min, double mag_max,
                                          double dist_min, double dist_max,
                                          double threshold = 0.5);
};
