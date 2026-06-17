#include "vr_seismoscope.h"
#include <algorithm>
#include <numeric>
#include <cmath>
#include <sstream>
#include <iomanip>

namespace {
    constexpr double PI = 3.14159265358979323846;
}

VRSeismoscopeEngine::VRSeismoscopeEngine() {
    config_.target_fps = 60;
    config_.frame_sampling_interval = 0.016;
    config_.camera_shake_gain = 0.3;
    config_.haptic_gain = 0.8;
    config_.visual_intensity_gain = 1.0;
    config_.motion_sickness_filter = 0.5;
    config_.enable_post_processing = true;
    config_.bloom_intensity = 0.4;
    config_.color_grading = 1.0;
}

void VRSeismoscopeEngine::setConfig(const VRExperienceConfig& config) {
    config_ = config;
}

VRExperienceConfig VRSeismoscopeEngine::getConfig() const {
    return config_;
}

std::string VRSeismoscopeEngine::generateVRRequestId() {
    std::ostringstream oss;
    auto now = std::chrono::system_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()).count();
    oss << "VR-" << ms;
    return oss.str();
}

SimulationParameters VRSeismoscopeEngine::buildSimParams(
    const VREarthquakeTriggerRequest& request) const {

    SimulationParameters params;
    params.magnitude = request.magnitude;
    params.distance = request.distance_km;
    params.duration = request.duration_sec;
    params.site_soil = request.site_soil;
    params.instrument_type = request.instrument_type;
    params.material_type = request.material_type;
    params.earthquake_direction_deg = request.earthquake_direction_deg;
    params.pillar_mass = 500.0;
    params.pillar_height = 1.8;
    params.pillar_diameter = 0.12;
    params.height_diameter_ratio = 6.0;
    params.damping_ratio = 0.03;
    params.dt = 0.001;
    params.frequency = 1.0;
    params.decay_alpha = 0.5;
    params.trigger_angle_threshold = 5.0;
    params.limit_angle = 8.0;
    params.penalty_stiffness = 5.0e6;
    params.penalty_damping = 1.2e3;
    params.friction_coeff = 0.15;
    params.wave_model = EarthquakeWaveModel::KANAI_TAJIMI;
    params.noise_level = 0.001;
    params.instrument_sensitivity = request.intensity_scale;
    return params;
}

double VRSeismoscopeEngine::computeHapticIntensity(
    double theta_x, double theta_y, double omega_x, double omega_y) {

    double angle = std::sqrt(theta_x * theta_x + theta_y * theta_y);
    double ang_vel = std::sqrt(omega_x * omega_x + omega_y * omega_y);
    return std::min(1.0, 0.3 * angle * (180.0 / PI) / 5.0 + 0.7 * ang_vel);
}

double VRSeismoscopeEngine::computeVisualIntensity(
    double peak_accel, double max_angle_deg) {

    double accel_factor = std::min(1.0, peak_accel / 9.81);
    double angle_factor = std::min(1.0, max_angle_deg / 8.0);
    return 0.5 * accel_factor + 0.5 * angle_factor;
}

VRFrameData VRSeismoscopeEngine::interpolateFrame(
    const PillarState& prev,
    const PillarState& curr,
    double t,
    const SimulationParameters& params,
    const VRExperienceConfig& config) {

    VRFrameData frame;
    double alpha = (t - prev.time) / std::max(1e-9, curr.time - prev.time);
    alpha = std::max(0.0, std::min(1.0, alpha));

    frame.timestamp_sec = t;
    frame.pillar_theta_x_rad = prev.theta_x + alpha * (curr.theta_x - prev.theta_x);
    frame.pillar_theta_y_rad = prev.theta_y + alpha * (curr.theta_y - prev.theta_y);
    frame.pillar_omega_x_rad_s = prev.omega_x + alpha * (curr.omega_x - prev.omega_x);
    frame.pillar_omega_y_rad_s = prev.omega_y + alpha * (curr.omega_y - prev.omega_y);

    double phase_rad = params.earthquake_direction_deg * PI / 180.0;
    double A = SimulationEngine::computePeakAcceleration(
        params.magnitude, params.distance, params.site_soil);
    double ground_accel = SimulationEngine::seismicAcceleration(
        t, A, params.frequency, params.decay_alpha, phase_rad);
    frame.ground_acceleration_x_m_s2 = ground_accel * std::cos(phase_rad);
    frame.ground_acceleration_y_m_s2 = ground_accel * std::sin(phase_rad);
    frame.ground_acceleration_z_m_s2 = 0.0;

    frame.camera_shake_x_deg = config.camera_shake_gain *
        frame.pillar_theta_x_rad * (180.0 / PI) * 0.5;
    frame.camera_shake_y_deg = config.camera_shake_gain *
        frame.pillar_theta_y_rad * (180.0 / PI) * 0.5;
    frame.camera_shake_z_deg = config.camera_shake_gain *
        ground_accel * 0.1;

    frame.haptic_intensity = computeHapticIntensity(
        frame.pillar_theta_x_rad, frame.pillar_theta_y_rad,
        frame.pillar_omega_x_rad_s, frame.pillar_omega_y_rad_s) * config.haptic_gain;
    frame.visual_intensity = computeVisualIntensity(
        std::abs(ground_accel),
        std::sqrt(frame.pillar_theta_x_rad * frame.pillar_theta_x_rad +
                  frame.pillar_theta_y_rad * frame.pillar_theta_y_rad) * (180.0 / PI))
        * config.visual_intensity_gain;

    double angle_deg = std::sqrt(frame.pillar_theta_x_rad * frame.pillar_theta_x_rad +
                                  frame.pillar_theta_y_rad * frame.pillar_theta_y_rad) * (180.0 / PI);
    frame.dragon_triggered = angle_deg > params.trigger_angle_threshold;

    if (frame.dragon_triggered) {
        double angle_rad = std::atan2(frame.pillar_theta_y_rad, frame.pillar_theta_x_rad);
        if (angle_rad < 0) angle_rad += 2.0 * PI;
        int idx = static_cast<int>(std::round(angle_rad * 180.0 / PI / 45.0)) % 8;
        frame.dragon_direction_index = idx;
        static const std::array<std::string, 8> dirs = {"E", "NE", "N", "NW", "W", "SW", "S", "SE"};
        frame.dragon_direction_name = (idx >= 0 && idx < 8) ? dirs[idx] : "UNKNOWN";
    } else {
        frame.dragon_direction_index = -1;
        frame.dragon_direction_name = "";
    }

    return frame;
}

std::vector<VRFrameData> VRSeismoscopeEngine::generateVRFrames(
    const SimulationResult& sim_result,
    const SimulationParameters& sim_params,
    const VRExperienceConfig& config) {

    std::vector<VRFrameData> frames;
    if (sim_result.trajectory.empty()) return frames;

    double total_duration = sim_result.trajectory.back().time;
    double dt = config.frame_sampling_interval;
    int num_frames = static_cast<int>(total_duration / dt) + 1;

    frames.reserve(num_frames);

    for (int i = 0; i < num_frames; i++) {
        double t = i * dt;
        if (t > total_duration) break;

        size_t lo = 0, hi = sim_result.trajectory.size() - 1;
        while (lo < hi - 1) {
            size_t mid = (lo + hi) / 2;
            if (sim_result.trajectory[mid].time < t) lo = mid;
            else hi = mid;
        }

        VRFrameData frame = interpolateFrame(
            sim_result.trajectory[lo], sim_result.trajectory[hi],
            t, sim_params, config);
        frames.push_back(frame);
    }

    return frames;
}

double VRSeismoscopeEngine::computeIntensity(
    double magnitude, double distance_km, SiteSoilType soil) {

    double I = magnitude * 1.5 - std::log10(distance_km) * 1.2 - 1.0;
    switch (soil) {
        case SiteSoilType::I0: I -= 0.5; break;
        case SiteSoilType::I1: I -= 0.2; break;
        case SiteSoilType::II: break;
        case SiteSoilType::III: I += 0.3; break;
        case SiteSoilType::IV: I += 0.8; break;
    }
    return std::max(0.0, std::min(12.0, I));
}

std::string VRSeismoscopeEngine::intensityDescription(double intensity) {
    if (intensity < 1.0) return "I. 无感";
    if (intensity < 2.0) return "II. 极微震";
    if (intensity < 3.0) return "III. 微震";
    if (intensity < 4.0) return "IV. 轻震";
    if (intensity < 5.0) return "V. 中震";
    if (intensity < 6.0) return "VI. 强震";
    if (intensity < 7.0) return "VII. 烈震";
    if (intensity < 8.0) return "VIII. 大震";
    if (intensity < 9.0) return "IX. 剧震";
    if (intensity < 10.0) return "X. 大破震";
    return "XI+. 毁灭性";
}

VREarthquakeTriggerResponse VRSeismoscopeEngine::triggerEarthquake(
    const VREarthquakeTriggerRequest& request) {

    VREarthquakeTriggerResponse response;
    response.request_id = generateVRRequestId();
    response.session_id = request.session_id;
    response.success = false;

    try {
        SimulationParameters sim_params = buildSimParams(request);
        SimulationEngine engine;
        SimulationResult result = engine.runSimulation(sim_params);

        response.simulation_result = result;
        response.triggered = result.triggered;
        response.trigger_time_sec = result.trigger.trigger_time;
        response.max_pillar_angle_deg = result.max_angle;
        response.peak_ground_acceleration_m_s2 = result.peak_acceleration;
        response.estimated_intensity = computeIntensity(
            request.magnitude, request.distance_km, request.site_soil);
        response.dragon_direction = result.trigger.direction;
        response.dragon_index = result.trigger.dragon_index;
        response.dragon_heads = result.dragon_heads;

        if (request.playback_speed > 0 && request.playback_speed != 1.0) {
            VRExperienceConfig adjusted_config = config_;
            adjusted_config.frame_sampling_interval = config_.frame_sampling_interval / request.playback_speed;
            response.vr_frames = generateVRFrames(result, sim_params, adjusted_config);
        } else {
            response.vr_frames = generateVRFrames(result, sim_params, config_);
        }

        response.success = true;

    } catch (const std::exception& e) {
        response.error_message = e.what();
        response.success = false;
    }

    return response;
}
