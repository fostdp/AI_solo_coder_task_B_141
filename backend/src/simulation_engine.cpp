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
            props.damping_ratio = 0.05;
            props.poissons_ratio = 0.34;
            props.thermal_expansion = 16.5e-6;
            props.cost_factor = 1.0;
            break;
        case MaterialType::IRON:
            props.density_kgm3 = 7870.0;
            props.youngs_modulus_pa = 200.0e9;
            props.yield_strength_pa = 240.0e6;
            props.damping_ratio = 0.03;
            props.poissons_ratio = 0.29;
            props.thermal_expansion = 11.8e-6;
            props.cost_factor = 0.6;
            break;
        case MaterialType::WOOD:
            props.density_kgm3 = 600.0;
            props.youngs_modulus_pa = 10.0e9;
            props.yield_strength_pa = 40.0e6;
            props.damping_ratio = 0.08;
            props.poissons_ratio = 0.35;
            props.thermal_expansion = 5.0e-6;
            props.cost_factor = 0.15;
            break;
        case MaterialType::STEEL:
            props.density_kgm3 = 7850.0;
            props.youngs_modulus_pa = 206.0e9;
            props.yield_strength_pa = 350.0e6;
            props.damping_ratio = 0.02;
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

double SimulationEngine::instrumentSensitivityFactor(InstrumentType type) {
    switch (type) {
        case InstrumentType::DIDONGYI: return 1.0;
        case InstrumentType::WATER_CLOCK_ARMILLARY: return 0.35;
        case InstrumentType::MODERN_SEISMOMETER: return 25.0;
    }
    return 1.0;
}

double SimulationEngine::instrumentResponseLag(InstrumentType type) {
    switch (type) {
        case InstrumentType::DIDONGYI: return 0.0;
        case InstrumentType::WATER_CLOCK_ARMILLARY: return 0.8;
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
    switch (inst_type) {
        case InstrumentType::DIDONGYI:
            break;
        case InstrumentType::WATER_CLOCK_ARMILLARY: {
            double viscous_damping = 0.15;
            domega_x -= viscous_damping * omega_x;
            domega_y -= viscous_damping * omega_y;
            double low_pass_alpha = 0.3;
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
                                    double& dtheta_x, double& dtheta_y,
                                    double& domega_x, double& domega_y) {
    dtheta_x = state.omega_x;
    dtheta_y = state.omega_y;

    double lag = instrumentResponseLag(inst_type);
    double a_t = seismicAcceleration(std::max(0.0, t - lag), A, f, alpha, phase);

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
                                                         InstrumentType inst_type) {
    auto deriv = [&](const StateVector& s, double time) -> StateVector {
        StateVector ds;
        derivatives(s, time, m, L, c, k, A, f, alpha, phase,
                    limit_rad, k_penalty, c_penalty, mu, inst_type,
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
                        params.instrument_type);
        t += params.dt;

        double angle_deg = std::sqrt(state.theta_x * state.theta_x + state.theta_y * state.theta_y) * 180.0 / M_PI;

        if (angle_deg > result.max_angle) {
            result.max_angle = angle_deg;
        }

        double a_current = std::abs(seismicAcceleration(t, A, f_eff, params.decay_alpha, phase_rad));
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
