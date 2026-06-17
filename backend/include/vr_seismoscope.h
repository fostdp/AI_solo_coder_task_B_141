#pragma once

#include <vector>
#include <string>
#include <array>
#include <chrono>
#include "simulation_engine.h"

struct VREarthquakeTriggerRequest {
    std::string session_id;
    double magnitude = 5.0;
    double distance_km = 100.0;
    double duration_sec = 30.0;
    SiteSoilType site_soil = SiteSoilType::II;
    InstrumentType instrument_type = InstrumentType::DIDONGYI;
    MaterialType material_type = MaterialType::COPPER;
    double earthquake_direction_deg = 0.0;
    double intensity_scale = 1.0;
    bool enable_haptic_feedback = true;
    bool enable_audio = true;
    double user_height_m = 1.7;
    double playback_speed = 1.0;
};

struct VRFrameData {
    double timestamp_sec;
    double pillar_theta_x_rad;
    double pillar_theta_y_rad;
    double pillar_omega_x_rad_s;
    double pillar_omega_y_rad_s;
    double ground_acceleration_x_m_s2;
    double ground_acceleration_y_m_s2;
    double ground_acceleration_z_m_s2;
    double camera_shake_x_deg;
    double camera_shake_y_deg;
    double camera_shake_z_deg;
    double haptic_intensity;
    double visual_intensity;
    bool dragon_triggered;
    int dragon_direction_index;
    std::string dragon_direction_name;
};

struct VREarthquakeTriggerResponse {
    std::string request_id;
    std::string session_id;
    bool success = false;
    bool triggered = false;
    double trigger_time_sec = 0.0;
    double max_pillar_angle_deg = 0.0;
    double peak_ground_acceleration_m_s2 = 0.0;
    double estimated_intensity = 0.0;
    std::string dragon_direction;
    int dragon_index = -1;
    std::array<bool, 8> dragon_heads = {};
    std::vector<VRFrameData> vr_frames;
    SimulationResult simulation_result;
    std::string error_message;
};

struct VRExperienceConfig {
    int target_fps = 60;
    double frame_sampling_interval = 0.016;
    double camera_shake_gain = 0.3;
    double haptic_gain = 0.8;
    double visual_intensity_gain = 1.0;
    double motion_sickness_filter = 0.5;
    bool enable_post_processing = true;
    double bloom_intensity = 0.4;
    double color_grading = 1.0;
};

class VRSeismoscopeEngine {
public:
    VRSeismoscopeEngine();

    VREarthquakeTriggerResponse triggerEarthquake(const VREarthquakeTriggerRequest& request);

    void setConfig(const VRExperienceConfig& config);
    VRExperienceConfig getConfig() const;

    static std::vector<VRFrameData> generateVRFrames(
        const SimulationResult& sim_result,
        const SimulationParameters& sim_params,
        const VRExperienceConfig& config);

    static double computeIntensity(double magnitude, double distance_km, SiteSoilType soil);

    static std::string intensityDescription(double intensity);

private:
    VRExperienceConfig config_;

    SimulationParameters buildSimParams(const VREarthquakeTriggerRequest& request) const;

    static VRFrameData interpolateFrame(
        const PillarState& prev,
        const PillarState& curr,
        double t,
        const SimulationParameters& params,
        const VRExperienceConfig& config);

    static double computeHapticIntensity(double theta_x, double theta_y, double omega_x, double omega_y);

    static double computeVisualIntensity(double peak_accel, double max_angle_deg);

    static std::string generateVRRequestId();
};
