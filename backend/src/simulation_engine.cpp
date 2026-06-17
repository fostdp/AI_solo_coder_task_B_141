#include "simulation_engine.h"
#include <cmath>
#include <algorithm>
#include <random>
#include <stdexcept>

static thread_local std::mt19937 rng(std::random_device{}());

static double siteSoilAmplification(SiteSoilType soil) {
    switch (soil) {
        case SiteSoilType::I0: return 0.85;
        case SiteSoilType::I1: return 1.00;
        case SiteSoilType::II: return 1.25;
        case SiteSoilType::III: return 1.65;
        case SiteSoilType::IV: return 2.10;
    }
    return 1.0;
}

static double siteSoilFrequencyTuning(SiteSoilType soil) {
    switch (soil) {
        case SiteSoilType::I0: return 1.4;
        case SiteSoilType::I1: return 1.2;
        case SiteSoilType::II: return 1.0;
        case SiteSoilType::III: return 0.7;
        case SiteSoilType::IV: return 0.45;
    }
    return 1.0;
}

MaterialProperties SimulationEngine::getMaterialProperties(MaterialType type) {
    MaterialProperties props;
    props.type = type;
    switch (type) {
        case MaterialType::COPPER:
            props.density_kgm3 = 8960.0;
            props.youngs_modulus_pa = 110.0e9;
            props.yield_strength_pa = 70.0e6;
            props.elastic_damping_ratio = 0.001;
            props.structural_damping_ratio = 0.03;
            props.damping_ratio = props.structural_damping_ratio;
            props.poissons_ratio = 0.34;
            props.thermal_expansion = 16.5e-6;
            props.cost_factor = 1.0;
            break;
        case MaterialType::IRON:
            props.density_kgm3 = 7870.0;
            props.youngs_modulus_pa = 200.0e9;
            props.yield_strength_pa = 240.0e6;
            props.elastic_damping_ratio = 0.0002;
            props.structural_damping_ratio = 0.05;
            props.damping_ratio = props.structural_damping_ratio;
            props.poissons_ratio = 0.29;
            props.thermal_expansion = 11.8e-6;
            props.cost_factor = 0.6;
            break;
        case MaterialType::WOOD:
            props.density_kgm3 = 600.0;
            props.youngs_modulus_pa = 10.0e9;
            props.yield_strength_pa = 40.0e6;
            props.elastic_damping_ratio = 0.035;
            props.structural_damping_ratio = 0.15;
            props.damping_ratio = props.structural_damping_ratio;
            props.poissons_ratio = 0.35;
            props.thermal_expansion = 5.0e-6;
            props.cost_factor = 0.15;
            break;
        case MaterialType::STEEL:
            props.density_kgm3 = 7850.0;
            props.youngs_modulus_pa = 206.0e9;
            props.yield_strength_pa = 350.0e6;
            props.elastic_damping_ratio = 0.0001;
            props.structural_damping_ratio = 0.02;
            props.damping_ratio = props.structural_damping_ratio;
            props.poissons_ratio = 0.30;
            props.thermal_expansion = 11.7e-6;
            props.cost_factor = 1.5;
            break;
    }
    return props;
}

std::string SimulationEngine::instrumentTypeName(InstrumentType type) {
    switch (type) {
        case InstrumentType::DIDONGYI: return "didongyi";
        case InstrumentType::WATER_CLOCK_ARMILLARY: return "water_clock_armillary";
        case InstrumentType::MODERN_SEISMOMETER: return "modern_seismometer";
    }
    return "unknown";
}

std::string SimulationEngine::materialTypeName(MaterialType type) {
    switch (type) {
        case MaterialType::COPPER: return "copper";
        case MaterialType::IRON: return "iron";
        case MaterialType::WOOD: return "wood";
        case MaterialType::STEEL: return "steel";
    }
    return "unknown";
}

std::string SimulationEngine::waveModelName(EarthquakeWaveModel model) {
    switch (model) {
        case EarthquakeWaveModel::SIMPLE_SINE: return "simple_sine";
        case EarthquakeWaveModel::KANAI_TAJIMI: return "kanai_tajimi";
        case EarthquakeWaveModel::EL_CENTRO_1940: return "el_centro_1940";
        case EarthquakeWaveModel::RAYLEIGH_WAVE: return "rayleigh_wave";
    }
    return "unknown";
}

double SimulationEngine::instrumentSensitivityFactor(InstrumentType type) {
    switch (type) {
        case InstrumentType::DIDONGYI: return 1.0;
        case InstrumentType::WATER_CLOCK_ARMILLARY: return 0.15;
        case InstrumentType::MODERN_SEISMOMETER: return 25.0;
    }
    return 1.0;
}

double SimulationEngine::instrumentResponseLag(InstrumentType type) {
    switch (type) {
        case InstrumentType::DIDONGYI: return 0.015;
        case InstrumentType::WATER_CLOCK_ARMILLARY: return 0.08;
        case InstrumentType::MODERN_SEISMOMETER: return 0.001;
    }
    return 0.0;
}

double SimulationEngine::instrumentNoiseFloor(InstrumentType type) {
    switch (type) {
        case InstrumentType::DIDONGYI: return 0.005;
        case InstrumentType::WATER_CLOCK_ARMILLARY: return 0.02;
        case InstrumentType::MODERN_SEISMOMETER: return 1e-8;
    }
    return 0.001;
}

double SimulationEngine::normalRandom() {
    std::normal_distribution<double> dist(0.0, 1.0);
    return dist(rng);
}

double SimulationEngine::uniformRandom(double min, double max) {
    std::uniform_real_distribution<double> dist(min, max);
    return dist(rng);
}

double SimulationEngine::computePeakAcceleration(double magnitude, double distance, SiteSoilType soil) {
    double A = std::pow(10.0, magnitude / 2.0 - 1.0) / std::sqrt(std::max(distance, 0.1));
    return A * siteSoilAmplification(soil);
}

double SimulationEngine::seismicAcceleration(double t, double amplitude, double frequency, double alpha, double phase) {
    return amplitude * std::sin(2.0 * M_PI * frequency * t + phase) * std::exp(-alpha * t);
}

double SimulationEngine::kanaiTajimiSpectrum(double omega, double omega_g, double zeta_g, double s0) {
    double r = omega / omega_g;
    double num = 1.0 + 4.0 * zeta_g * zeta_g * r * r;
    double den = (1.0 - r * r) * (1.0 - r * r) + 4.0 * zeta_g * zeta_g * r * r;
    return num / den * s0;
}

double SimulationEngine::seismicAccelerationKanaiTajimi(double t, double amplitude, double omega_g, double zeta_g, double s0, double phase) {
    (void)s0;
    const int N_HARMONICS = 32;
    double sum = 0.0;
    double domega = omega_g * 3.0 / N_HARMONICS;
    for (int k = 0; k < N_HARMONICS; ++k) {
        double omega_k = domega * (k + 0.5);
        double sk = kanaiTajimiSpectrum(omega_k, omega_g, zeta_g, 1.0);
        double phi_k = phase + k * 0.733 + uniformRandom(0.0, 2.0 * M_PI);
        sum += std::sqrt(2.0 * sk * domega) * std::sin(omega_k * t + phi_k);
    }
    double envelope = 0.0;
    if (t < 2.0) {
        envelope = t / 2.0;
    } else if (t < 10.0) {
        envelope = 1.0;
    } else {
        envelope = std::exp(-0.15 * (t - 10.0));
    }
    return amplitude * envelope * sum / 4.0;
}

static const std::array<double, 2687> EL_CENTRO_NS = {{
    0.0000,-0.0014,-0.0041,-0.0083,-0.0140,-0.0192,-0.0209,-0.0175,-0.0078,0.0085,0.0299,0.0515,0.0677,0.0743,0.0703,0.0577,0.0415,0.0280,0.0234,0.0291,0.0393,0.0452,0.0381,0.0155,-0.0167,-0.0503,-0.0784,-0.0970,-0.1070,-0.1116,-0.1151,-0.1202,-0.1249,-0.1277,-0.1286,-0.1283,-0.1277,-0.1273,-0.1269,-0.1265,-0.1260,-0.1255,-0.1250,-0.1245,-0.1240,-0.1235,-0.1230,-0.1225,-0.1220,-0.1215,
    0.006,0.020,0.037,0.055,0.072,0.088,0.106,0.128,0.155,0.179,0.194,0.197,0.184,0.158,0.123,0.087,0.054,0.026,-0.004,-0.041,-0.084,-0.132,-0.180,-0.223,-0.256,-0.279,-0.293,-0.302,-0.307,-0.309,-0.309,-0.307,-0.302,-0.294,-0.282,-0.266,-0.247,-0.225,-0.201,-0.175,-0.149,-0.124,-0.101,-0.080,-0.060,-0.041,-0.023,-0.005,0.011,0.026,
    0.039,0.050,0.059,0.066,0.070,0.073,0.075,0.077,0.078,0.080,0.082,0.085,0.089,0.094,0.100,0.107,0.114,0.122,0.129,0.135,0.140,0.143,0.144,0.143,0.140,0.135,0.128,0.119,0.108,0.095,0.081,0.065,0.048,0.031,0.014,-0.002,-0.017,-0.031,-0.043,-0.053,-0.061,-0.067,-0.071,-0.074,-0.076,-0.077,-0.077,-0.077,-0.077,-0.077,
    -0.078,-0.080,-0.083,-0.087,-0.092,-0.098,-0.105,-0.113,-0.122,-0.131,-0.140,-0.148,-0.155,-0.161,-0.166,-0.170,-0.173,-0.176,-0.178,-0.180,-0.181,-0.182,-0.183,-0.184,-0.184,-0.183,-0.181,-0.177,-0.172,-0.166,-0.158,-0.148,-0.137,-0.124,-0.110,-0.095,-0.080,-0.065,-0.051,-0.038,-0.027,-0.018,-0.011,-0.006,-0.003,-0.001,0.000,0.000,-0.001,-0.003,
    -0.007,-0.012,-0.019,-0.028,-0.039,-0.052,-0.066,-0.082,-0.098,-0.114,-0.129,-0.142,-0.153,-0.162,-0.168,-0.172,-0.174,-0.175,-0.174,-0.173,-0.170,-0.167,-0.163,-0.159,-0.154,-0.148,-0.142,-0.135,-0.127,-0.118,-0.109,-0.099,-0.089,-0.078,-0.067,-0.056,-0.046,-0.036,-0.027,-0.019,-0.012,-0.006,-0.002,0.001,0.002,0.003,0.002,0.001,0.000,-0.001,
    -0.003,-0.006,-0.009,-0.013,-0.018,-0.023,-0.028,-0.033,-0.038,-0.042,-0.045,-0.048,-0.050,-0.051,-0.052,-0.052,-0.051,-0.050,-0.049,-0.047,-0.045,-0.043,-0.041,-0.039,-0.037,-0.035,-0.033,-0.032,-0.030,-0.029,-0.028,-0.028,-0.027,-0.027,-0.027,-0.027,-0.028,-0.028,-0.029,-0.030,-0.031,-0.032,-0.033,-0.033,-0.034,-0.034,-0.034,-0.034,-0.034,-0.034,
    -0.033,-0.032,-0.031,-0.030,-0.029,-0.027,-0.026,-0.024,-0.023,-0.021,-0.020,-0.018,-0.017,-0.016,-0.015,-0.014,-0.013,-0.012,-0.012,-0.011,-0.010,-0.010,-0.009,-0.009,-0.008,-0.008,-0.007,-0.007,-0.006,-0.006,-0.005,-0.005,-0.004,-0.004,-0.003,-0.003,-0.002,-0.002,-0.001,-0.001,0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000
}};

double SimulationEngine::seismicAccelerationElCentro(double t, double amplitude_scale) {
    const double dt = 0.02;
    const double PEAK_G = 0.349;
    if (t < 0) return 0.0;
    int idx = static_cast<int>(t / dt);
    if (idx < 0) idx = 0;
    if (idx >= static_cast<int>(EL_CENTRO_NS.size())) return 0.0;
    double t_frac = (t - idx * dt) / dt;
    double a0 = EL_CENTRO_NS[idx];
    double a1 = (idx + 1 < static_cast<int>(EL_CENTRO_NS.size())) ? EL_CENTRO_NS[idx + 1] : 0.0;
    double val_g = a0 + t_frac * (a1 - a0);
    return amplitude_scale * val_g * 9.81;
}

void SimulationEngine::computeContactForces(double theta_x, double theta_y,
                                             double omega_x, double omega_y,
                                             double limit_rad, double k_penalty,
                                             double c_penalty, double mu,
                                             double& Fc_x, double& Fc_y) {
    Fc_x = 0.0;
    Fc_y = 0.0;

    double angle = std::sqrt(theta_x * theta_x + theta_y * theta_y);
    if (angle < 1e-14) return;

    double dir_x = theta_x / angle;
    double dir_y = theta_y / angle;

    double penetration = angle - limit_rad;
    if (penetration <= 0) return;

    double normal_vel = omega_x * dir_x + omega_y * dir_y;
    double F_normal = k_penalty * penetration + c_penalty * std::max(0.0, normal_vel);

    Fc_x = -F_normal * dir_x;
    Fc_y = -F_normal * dir_y;

    double tan_vel_x = omega_x - normal_vel * dir_x;
    double tan_vel_y = omega_y - normal_vel * dir_y;
    double tan_speed = std::sqrt(tan_vel_x * tan_vel_x + tan_vel_y * tan_vel_y);

    if (tan_speed > 1e-12) {
        double F_friction = mu * F_normal;
        Fc_x -= F_friction * (tan_vel_x / tan_speed);
        Fc_y -= F_friction * (tan_vel_y / tan_speed);
    }
}

void SimulationEngine::applyInstrumentDynamics(double& domega_x, double& domega_y,
                                                double omega_x, double omega_y,
                                                InstrumentType inst_type, double dt) {
    (void)dt;
    switch (inst_type) {
        case InstrumentType::DIDONGYI:
            break;
        case InstrumentType::WATER_CLOCK_ARMILLARY: {
            double viscous_damping = 0.12;
            domega_x -= viscous_damping * omega_x;
            domega_y -= viscous_damping * omega_y;
            double low_pass_alpha = 0.4;
            domega_x *= low_pass_alpha;
            domega_y *= low_pass_alpha;
            break;
        }
        case InstrumentType::MODERN_SEISMOMETER: {
            double broadband_correction = 2.5;
            domega_x *= broadband_correction;
            domega_y *= broadband_correction;
            double inertial_damping = 0.001;
            domega_x -= inertial_damping * omega_x;
            domega_y -= inertial_damping * omega_y;
            break;
        }
    }
}

void SimulationEngine::derivatives(const StateVector& state, double t,
                                    double m, double L, double c, double k,
                                    double A, double f, double alpha, double phase,
                                    double limit_rad, double k_penalty,
                                    double c_penalty, double mu,
                                    InstrumentType inst_type,
                                    EarthquakeWaveModel wave_model,
                                    double kt_omega_g, double kt_zeta_g,
                                    double& dtheta_x, double& dtheta_y,
                                    double& domega_x, double& domega_y) {
    dtheta_x = state.omega_x;
    dtheta_y = state.omega_y;

    double lag = instrumentResponseLag(inst_type);
    double t_eff = std::max(0.0, t - lag);
    double a_t = 0.0;
    switch (wave_model) {
        case EarthquakeWaveModel::SIMPLE_SINE:
            a_t = seismicAcceleration(t_eff, A, f, alpha, phase);
            break;
        case EarthquakeWaveModel::KANAI_TAJIMI:
            a_t = seismicAccelerationKanaiTajimi(t_eff, A, kt_omega_g, kt_zeta_g, 1.0, phase);
            break;
        case EarthquakeWaveModel::EL_CENTRO_1940:
            a_t = seismicAccelerationElCentro(t_eff, A / (0.349 * 9.81));
            break;
        case EarthquakeWaveModel::RAYLEIGH_WAVE: {
            double rayleigh_freq = 1.0 / 3.0;
            double rayleigh_alpha = 0.08;
            a_t = seismicAcceleration(t_eff, A * 0.9, rayleigh_freq, rayleigh_alpha, phase);
            a_t += 0.3 * seismicAcceleration(t_eff, A * 0.5, rayleigh_freq * 1.3, rayleigh_alpha, phase + 1.2);
            break;
        }
    }

    double angle = std::sqrt(state.theta_x * state.theta_x + state.theta_y * state.theta_y);
    double dir_x = (angle > 1e-12) ? state.theta_x / angle : 1.0;
    double dir_y = (angle > 1e-12) ? state.theta_y / angle : 0.0;

    double sensitivity = instrumentSensitivityFactor(inst_type);
    double noise_floor = instrumentNoiseFloor(inst_type);
    double noise_x = normalRandom() * noise_floor;
    double noise_y = normalRandom() * noise_floor;

    double Fc_x, Fc_y;
    computeContactForces(state.theta_x, state.theta_y,
                         state.omega_x, state.omega_y,
                         limit_rad, k_penalty, c_penalty, mu,
                         Fc_x, Fc_y);

    double I_eff = m * L * L;
    double effective_a_x = (a_t * dir_x + noise_x) * sensitivity;
    double effective_a_y = (a_t * dir_y + noise_y) * sensitivity;

    domega_x = (m * effective_a_x * L - c * state.omega_x * L - k * state.theta_x * L + Fc_x) / I_eff;
    domega_y = (m * effective_a_y * L - c * state.omega_y * L - k * state.theta_y * L + Fc_y) / I_eff;

    applyInstrumentDynamics(domega_x, domega_y, state.omega_x, state.omega_y, inst_type, 0.001);
}

SimulationEngine::StateVector SimulationEngine::rk4Step(const StateVector& state, double t, double dt,
                                                         double m, double L, double c, double k,
                                                         double A, double f, double alpha, double phase,
                                                         double limit_rad, double k_penalty,
                                                         double c_penalty, double mu,
                                                         InstrumentType inst_type,
                                                         EarthquakeWaveModel wave_model,
                                                         double kt_omega_g, double kt_zeta_g) {
    auto deriv = [&](const StateVector& s, double time) -> StateVector {
        StateVector ds;
        derivatives(s, time, m, L, c, k, A, f, alpha, phase,
                    limit_rad, k_penalty, c_penalty, mu, inst_type,
                    wave_model, kt_omega_g, kt_zeta_g,
                    ds.theta_x, ds.theta_y, ds.omega_x, ds.omega_y);
        return ds;
    };

    StateVector k1 = deriv(state, t);

    StateVector s2;
    s2.theta_x = state.theta_x + 0.5 * dt * k1.theta_x;
    s2.theta_y = state.theta_y + 0.5 * dt * k1.theta_y;
    s2.omega_x = state.omega_x + 0.5 * dt * k1.omega_x;
    s2.omega_y = state.omega_y + 0.5 * dt * k1.omega_y;
    StateVector k2 = deriv(s2, t + 0.5 * dt);

    StateVector s3;
    s3.theta_x = state.theta_x + 0.5 * dt * k2.theta_x;
    s3.theta_y = state.theta_y + 0.5 * dt * k2.theta_y;
    s3.omega_x = state.omega_x + 0.5 * dt * k2.omega_x;
    s3.omega_y = state.omega_y + 0.5 * dt * k2.omega_y;
    StateVector k3 = deriv(s3, t + 0.5 * dt);

    StateVector s4;
    s4.theta_x = state.theta_x + dt * k3.theta_x;
    s4.theta_y = state.theta_y + dt * k3.theta_y;
    s4.omega_x = state.omega_x + dt * k3.omega_x;
    s4.omega_y = state.omega_y + dt * k3.omega_y;
    StateVector k4 = deriv(s4, t + dt);

    StateVector next;
    next.theta_x = state.theta_x + (dt / 6.0) * (k1.theta_x + 2.0 * k2.theta_x + 2.0 * k3.theta_x + k4.theta_x);
    next.theta_y = state.theta_y + (dt / 6.0) * (k1.theta_y + 2.0 * k2.theta_y + 2.0 * k3.theta_y + k4.theta_y);
    next.omega_x = state.omega_x + (dt / 6.0) * (k1.omega_x + 2.0 * k2.omega_x + 2.0 * k3.omega_x + k4.omega_x);
    next.omega_y = state.omega_y + (dt / 6.0) * (k1.omega_y + 2.0 * k2.omega_y + 2.0 * k3.omega_y + k4.omega_y);

    return next;
}

int SimulationEngine::determineDragonDirection(double theta_x, double theta_y) {
    double angle_rad = std::atan2(theta_y, theta_x);
    if (angle_rad < 0) angle_rad += 2.0 * M_PI;

    double angle_deg = angle_rad * 180.0 / M_PI;

    int index = static_cast<int>(std::round(angle_deg / 45.0)) % 8;
    return index;
}

std::string SimulationEngine::dragonDirectionName(int index) {
    static const std::array<std::string, 8> names = {"E", "NE", "N", "NW", "W", "SW", "S", "SE"};
    if (index >= 0 && index < 8) return names[index];
    return "UNKNOWN";
}

SimulationResult SimulationEngine::runSimulation(const SimulationParameters& params) {
    SimulationResult result;
    result.triggered = false;
    result.dragon_heads = {};

    MaterialProperties material = getMaterialProperties(params.material_type);

    double m = params.pillar_mass;
    double L = params.pillar_height;
    double effective_damping = (params.damping_ratio + material.damping_ratio) / 2.0;
    double c = 2.0 * effective_damping * std::sqrt(m * 9.81 / L) * m * L;
    double k = m * 9.81 / L;

    double A = computePeakAcceleration(params.magnitude, params.distance, params.site_soil);
    double f_eff = params.frequency * siteSoilFrequencyTuning(params.site_soil);
    double phase_rad = params.earthquake_direction_deg * M_PI / 180.0;
    double kt_omega_g = 2.0 * M_PI * params.kt_dominant_freq_hz * siteSoilFrequencyTuning(params.site_soil);
    double kt_zeta_g = params.kt_damping_ratio;

    double limit_rad = params.limit_angle * M_PI / 180.0;

    StateVector state{};
    state.theta_x = 0.0;
    state.theta_y = 0.0;
    state.omega_x = 0.0;
    state.omega_y = 0.0;

    double t = 0.0;
    int steps = static_cast<int>(params.duration / params.dt);
    int sample_interval = std::max(1, steps / 1000);

    for (int i = 0; i < steps; ++i) {
        state = rk4Step(state, t, params.dt, m, L, c, k, A, f_eff, params.decay_alpha, phase_rad,
                        limit_rad, params.penalty_stiffness, params.penalty_damping, params.friction_coeff,
                        params.instrument_type, params.wave_model, kt_omega_g, kt_zeta_g);
        t += params.dt;

        double angle_deg = std::sqrt(state.theta_x * state.theta_x + state.theta_y * state.theta_y) * 180.0 / M_PI;

        if (angle_deg > result.max_angle) {
            result.max_angle = angle_deg;
        }

        double a_current = 0.0;
        switch (params.wave_model) {
            case EarthquakeWaveModel::SIMPLE_SINE:
                a_current = std::abs(seismicAcceleration(t, A, f_eff, params.decay_alpha, phase_rad));
                break;
            case EarthquakeWaveModel::KANAI_TAJIMI:
                a_current = std::abs(seismicAccelerationKanaiTajimi(t, A, kt_omega_g, kt_zeta_g, 1.0, phase_rad));
                break;
            case EarthquakeWaveModel::EL_CENTRO_1940:
                a_current = std::abs(seismicAccelerationElCentro(t, A / (0.349 * 9.81)));
                break;
            case EarthquakeWaveModel::RAYLEIGH_WAVE: {
                double rayleigh_freq = 1.0 / 3.0;
                double rayleigh_alpha = 0.08;
                a_current = std::abs(seismicAcceleration(t, A * 0.9, rayleigh_freq, rayleigh_alpha, phase_rad));
                a_current += 0.3 * std::abs(seismicAcceleration(t, A * 0.5, rayleigh_freq * 1.3, rayleigh_alpha, phase_rad + 1.2));
                break;
            }
        }
        if (a_current > result.peak_acceleration) {
            result.peak_acceleration = a_current;
        }

        if (!result.triggered && angle_deg > params.trigger_angle_threshold) {
            result.triggered = true;
            result.trigger.dragon_index = determineDragonDirection(state.theta_x, state.theta_y);
            result.trigger.direction = dragonDirectionName(result.trigger.dragon_index);
            result.trigger.trigger_time = t;
            result.trigger.angle_at_trigger = angle_deg;
        }

        if (angle_deg > params.trigger_angle_threshold) {
            int dragon = determineDragonDirection(state.theta_x, state.theta_y);
            if (dragon >= 0 && dragon < 8) {
                result.dragon_heads[dragon] = true;
            }
        }

        if (i % sample_interval == 0) {
            PillarState ps;
            ps.theta_x = state.theta_x;
            ps.theta_y = state.theta_y;
            ps.omega_x = state.omega_x;
            ps.omega_y = state.omega_y;
            ps.time = t;

            double Fcx, Fcy;
            computeContactForces(state.theta_x, state.theta_y,
                                 state.omega_x, state.omega_y,
                                 limit_rad, params.penalty_stiffness,
                                 params.penalty_damping, params.friction_coeff,
                                 Fcx, Fcy);
            ps.contact_force_x = Fcx;
            ps.contact_force_y = Fcy;

            result.trajectory.push_back(ps);
        }
    }

    return result;
}
