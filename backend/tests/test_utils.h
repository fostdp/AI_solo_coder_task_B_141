#pragma once

#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <vector>
#include <cmath>
#include <string>
#include "simulation_engine.h"
#include "sensitivity_analyzer.h"
#include "network_localizer.h"
#include "instrument_comparison.h"

#define EXPECT_VECTOR_NEAR(vec1, vec2, tol) \
    do { \
        EXPECT_EQ((vec1).size(), (vec2).size()) << "Vector sizes differ"; \
        for (size_t _i = 0; _i < (vec1).size(); ++_i) { \
            EXPECT_NEAR((vec1)[_i], (vec2)[_i], (tol)) \
                << "At index " << _i << ": " << (vec1)[_i] << " vs " << (vec2)[_i]; \
        } \
    } while(0)

#define EXPECT_JSON_EQ(json1, json2) \
    do { \
        EXPECT_EQ((json1).dump(), (json2).dump()) << "JSON values differ"; \
    } while(0)

class DidongyiTestBase : public ::testing::Test {
protected:
    void SetUp() override {
        defaultParams.magnitude = 5.0;
        defaultParams.distance = 100.0;
        defaultParams.duration = 30.0;
        defaultParams.dt = 0.001;
        defaultParams.pillar_mass = 500.0;
        defaultParams.pillar_height = 2.0;
        defaultParams.damping_ratio = 0.05;
        defaultParams.trigger_angle_threshold = 5.0;
        defaultParams.site_soil = SiteSoilType::II;
        defaultParams.instrument_type = InstrumentType::DIDONGYI;
        defaultParams.material_type = MaterialType::COPPER;
        defaultParams.earthquake_direction_deg = 0.0;
        defaultParams.noise_level = 0.001;
        defaultParams.instrument_sensitivity = 1.0;

        sensitivityParams.magnitude_min = 2.0;
        sensitivityParams.magnitude_max = 8.0;
        sensitivityParams.magnitude_steps = 10;
        sensitivityParams.distance_min = 10.0;
        sensitivityParams.distance_max = 500.0;
        sensitivityParams.distance_steps = 10;
        sensitivityParams.monte_carlo_trials = 5;
        sensitivityParams.site_soil = SiteSoilType::II;

        comparisonRequest.instruments = {
            InstrumentType::DIDONGYI,
            InstrumentType::WATER_CLOCK_ARMILLARY,
            InstrumentType::MODERN_SEISMOMETER
        };
        comparisonRequest.materials = {
            MaterialType::COPPER,
            MaterialType::IRON,
            MaterialType::STEEL
        };
        comparisonRequest.magnitude_min = 2.0;
        comparisonRequest.magnitude_max = 8.0;
        comparisonRequest.magnitude_steps = 8;
        comparisonRequest.distance_min = 10.0;
        comparisonRequest.distance_max = 500.0;
        comparisonRequest.distance_steps = 8;
        comparisonRequest.monte_carlo_trials = 5;
        comparisonRequest.site_soil = SiteSoilType::II;

        materialAnalysisRequest.reference_material = MaterialType::COPPER;
        materialAnalysisRequest.test_materials = {
            MaterialType::IRON,
            MaterialType::WOOD,
            MaterialType::STEEL
        };
        materialAnalysisRequest.magnitude = 5.0;
        materialAnalysisRequest.distance = 100.0;
        materialAnalysisRequest.duration = 30.0;
        materialAnalysisRequest.site_soil = SiteSoilType::II;
        materialAnalysisRequest.trials = 5;
        materialAnalysisRequest.instrument = InstrumentType::DIDONGYI;
    }

    void TearDown() override {
    }

    SimulationParameters defaultParams;
    SensitivityParameters sensitivityParams;
    ComparisonRequest comparisonRequest;
    MaterialAnalysisRequest materialAnalysisRequest;

    static constexpr double EPSILON = 1e-6;
    static constexpr double TOLERANCE = 1e-3;
    static constexpr double LOOSE_TOLERANCE = 1e-2;
};

namespace test_utils {

inline std::vector<StationConfig> generateTestStations(int count = 5) {
    std::vector<StationConfig> stations;
    stations.reserve(count);

    std::vector<std::array<double, 3>> coords = {
        {39.9042, 116.4074, 43.5},
        {31.2304, 121.4737, 4.0},
        {23.1291, 113.2644, 11.0},
        {30.5728, 104.0668, 500.0},
        {34.3416, 108.9398, 415.0}
    };

    for (int i = 0; i < std::min(count, (int)coords.size()); ++i) {
        StationConfig station;
        station.device_id = "STATION_" + std::to_string(i + 1);
        station.latitude_deg = coords[i][0];
        station.longitude_deg = coords[i][1];
        station.elevation_m = coords[i][2];
        station.time_uncertainty_sec = 0.1;
        station.azimuth_uncertainty_deg = 10.0;
        stations.push_back(station);
    }

    return stations;
}

inline SimulationParameters generateTestParameters() {
    SimulationParameters params;
    params.magnitude = 5.0;
    params.distance = 100.0;
    params.duration = 30.0;
    params.dt = 0.001;
    params.pillar_mass = 500.0;
    params.pillar_height = 2.0;
    params.damping_ratio = 0.05;
    params.trigger_angle_threshold = 5.0;
    params.limit_angle = 8.0;
    params.penalty_stiffness = 5.0e6;
    params.penalty_damping = 1.2e3;
    params.friction_coeff = 0.15;
    params.site_soil = SiteSoilType::II;
    params.instrument_type = InstrumentType::DIDONGYI;
    params.material_type = MaterialType::COPPER;
    params.earthquake_direction_deg = 0.0;
    params.noise_level = 0.001;
    params.instrument_sensitivity = 1.0;
    params.frequency = 1.0;
    params.decay_alpha = 0.5;
    return params;
}

inline std::vector<StationReading> generateTestReadings(
    const std::vector<StationConfig>& stations,
    double epicenter_lat,
    double epicenter_lon,
    double trigger_time_base = 10.0) {

    std::vector<StationReading> readings;
    readings.reserve(stations.size());

    for (size_t i = 0; i < stations.size(); ++i) {
        double dist_km = NetworkLocalizer::haversineDistanceKm(
            stations[i].latitude_deg, stations[i].longitude_deg,
            epicenter_lat, epicenter_lon);

        double bearing = NetworkLocalizer::bearingDegrees(
            stations[i].latitude_deg, stations[i].longitude_deg,
            epicenter_lat, epicenter_lon);

        StationReading reading;
        reading.device_id = stations[i].device_id;
        reading.trigger_time_sec = trigger_time_base + dist_km / 6.0;
        reading.azimuth_deg = bearing;
        reading.peak_acceleration = 0.1 + 0.5 / (1.0 + dist_km / 100.0);
        reading.signal_to_noise = 10.0 - dist_km / 50.0;
        readings.push_back(reading);
    }

    return readings;
}

inline std::vector<double> linspace(double start, double end, int n) {
    std::vector<double> result;
    result.reserve(n);
    if (n == 1) {
        result.push_back(start);
        return result;
    }
    double step = (end - start) / (n - 1);
    for (int i = 0; i < n; ++i) {
        result.push_back(start + i * step);
    }
    return result;
}

inline constexpr double deg2rad(double deg) {
    return deg * M_PI / 180.0;
}

inline constexpr double rad2deg(double rad) {
    return rad * 180.0 / M_PI;
}

}
