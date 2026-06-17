#pragma once

#include <vector>
#include <string>
#include <array>

enum class SiteSoilType {
    I0 = 0,
    I1 = 1,
    II = 2,
    III = 3,
    IV = 4
};

enum class InstrumentType {
    DIDONGYI = 0,
    WATER_CLOCK_ARMILLARY = 1,
    MODERN_SEISMOMETER = 2
};

enum class MaterialType {
    COPPER = 0,
    IRON = 1,
    WOOD = 2,
    STEEL = 3
};

struct MaterialProperties {
    MaterialType type = MaterialType::COPPER;
    double density_kgm3 = 8960.0;
    double youngs_modulus_pa = 110.0e9;
    double yield_strength_pa = 70.0e6;
    double damping_ratio = 0.05;
    double poissons_ratio = 0.34;
    double thermal_expansion = 16.5e-6;
    double cost_factor = 1.0;
};

struct PillarState {
    double theta_x;
    double theta_y;
    double omega_x;
    double omega_y;
    double time;
    double contact_force_x;
    double contact_force_y;
};

struct SimulationParameters {
    double pillar_mass = 500.0;
    double pillar_height = 2.0;
    double damping_ratio = 0.05;
    double magnitude = 5.0;
    double distance = 100.0;
    double frequency = 1.0;
    double decay_alpha = 0.5;
    double duration = 30.0;
    double dt = 0.001;
    double trigger_angle_threshold = 5.0;

    double limit_angle = 8.0;
    double penalty_stiffness = 5.0e6;
    double penalty_damping = 1.2e3;
    double friction_coeff = 0.15;

    SiteSoilType site_soil = SiteSoilType::II;

    InstrumentType instrument_type = InstrumentType::DIDONGYI;
    MaterialType material_type = MaterialType::COPPER;
    double earthquake_direction_deg = 0.0;
    double noise_level = 0.001;
    double instrument_sensitivity = 1.0;
};

struct DragonTrigger {
    int dragon_index = -1;
    std::string direction;
    double trigger_time = 0.0;
    double angle_at_trigger = 0.0;
};

struct SimulationResult {
    bool triggered = false;
    DragonTrigger trigger;
    std::vector<PillarState> trajectory;
    double max_angle = 0.0;
    double peak_acceleration = 0.0;
    std::array<bool, 8> dragon_heads = {};
};

class SimulationEngine {
public:
    SimulationEngine() = default;

    SimulationResult runSimulation(const SimulationParameters& params);

    static double computePeakAcceleration(double magnitude, double distance, SiteSoilType soil = SiteSoilType::II);
    static double seismicAcceleration(double t, double amplitude, double frequency, double alpha, double phase = 0.0);

    static MaterialProperties getMaterialProperties(MaterialType type);
    static std::string instrumentTypeName(InstrumentType type);
    static std::string materialTypeName(MaterialType type);

    static double instrumentSensitivityFactor(InstrumentType type);
    static double instrumentResponseLag(InstrumentType type);
    static double instrumentNoiseFloor(InstrumentType type);

private:
    struct StateVector {
        double theta_x;
        double theta_y;
        double omega_x;
        double omega_y;
    };

    StateVector rk4Step(const StateVector& state, double t, double dt,
                        double m, double L, double c, double k,
                        double A, double f, double alpha, double phase,
                        double limit_rad, double k_penalty,
                        double c_penalty, double mu,
                        InstrumentType inst_type);

    void derivatives(const StateVector& state, double t,
                     double m, double L, double c, double k,
                     double A, double f, double alpha, double phase,
                     double limit_rad, double k_penalty,
                     double c_penalty, double mu,
                     InstrumentType inst_type,
                     double& dtheta_x, double& dtheta_y,
                     double& domega_x, double& domega_y);

    static void computeContactForces(double theta_x, double theta_y,
                                     double omega_x, double omega_y,
                                     double limit_rad, double k_penalty,
                                     double c_penalty, double mu,
                                     double& Fc_x, double& Fc_y);

    static void applyInstrumentDynamics(double& domega_x, double& domega_y,
                                        double omega_x, double omega_y,
                                        InstrumentType inst_type, double dt);

    int determineDragonDirection(double theta_x, double theta_y);
    std::string dragonDirectionName(int index);

    static double normalRandom();
    static double uniformRandom(double min, double max);
};
