#pragma once

#include <vector>
#include <string>
#include "simulation_engine.h"

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
    double elastic_damping_ratio;
    double structural_damping_ratio;
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

class MaterialAnalyzer {
public:
    MaterialAnalyzer() = default;

    MaterialAnalysisResult runMaterialAnalysis(const MaterialAnalysisRequest& request);

private:
    MaterialMetrics computeMaterialMetrics(
        MaterialType material,
        const MaterialAnalysisRequest& request);
};
