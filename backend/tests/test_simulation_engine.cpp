#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "test_utils.h"
#include "simulation_engine.h"
#include <cmath>
#include <algorithm>
#include <numeric>

using namespace test_utils;

class TestSimulationEngine : public DidongyiTestBase {
protected:
    SimulationEngine engine;
};

TEST_F(TestSimulationEngine, Normal_DefaultParamsSimulation) {
    SimulationParameters params = defaultParams;
    params.magnitude = 5.0;
    params.distance = 100.0;

    SimulationResult result = engine.runSimulation(params);

    EXPECT_FALSE(result.triggered) << "M5 D100km 不应触发";
    EXPECT_GT(result.max_angle, 0.0) << "max_angle 应大于0";
}

TEST_F(TestSimulationEngine, Normal_StrongEarthquakeTrigger) {
    SimulationParameters params = defaultParams;
    params.magnitude = 7.5;
    params.distance = 50.0;

    SimulationResult result = engine.runSimulation(params);

    EXPECT_TRUE(result.triggered) << "M7.5 D50km 应触发";
    EXPECT_GE(result.trigger.dragon_index, 0) << "dragon_index 应 >= 0";
    EXPECT_LE(result.trigger.dragon_index, 7) << "dragon_index 应 <= 7";
}

TEST_F(TestSimulationEngine, Normal_PeakAccelerationRange) {
    double accel = SimulationEngine::computePeakAcceleration(5.0, 100.0, SiteSoilType::II);

    EXPECT_GT(accel, 0.01) << "峰值加速度应 > 0.01";
    EXPECT_LT(accel, 10.0) << "峰值加速度应 < 10.0";
}

TEST_F(TestSimulationEngine, Normal_PeakAccelerationMonotonicWithMagnitude) {
    double a5 = SimulationEngine::computePeakAcceleration(5.0, 100.0, SiteSoilType::II);
    double a6 = SimulationEngine::computePeakAcceleration(6.0, 100.0, SiteSoilType::II);
    double a7 = SimulationEngine::computePeakAcceleration(7.0, 100.0, SiteSoilType::II);
    double a8 = SimulationEngine::computePeakAcceleration(8.0, 100.0, SiteSoilType::II);

    EXPECT_LT(a5, a6) << "M5 加速度应 < M6";
    EXPECT_LT(a6, a7) << "M6 加速度应 < M7";
    EXPECT_LT(a7, a8) << "M7 加速度应 < M8";
}

TEST_F(TestSimulationEngine, Normal_MaterialPropertiesDensity) {
    MaterialProperties copper = SimulationEngine::getMaterialProperties(MaterialType::COPPER);
    MaterialProperties iron = SimulationEngine::getMaterialProperties(MaterialType::IRON);
    MaterialProperties wood = SimulationEngine::getMaterialProperties(MaterialType::WOOD);
    MaterialProperties steel = SimulationEngine::getMaterialProperties(MaterialType::STEEL);

    EXPECT_NEAR(copper.density_kgm3, 8960.0, LOOSE_TOLERANCE * 8960.0) << "COPPER 密度";
    EXPECT_NEAR(iron.density_kgm3, 7870.0, LOOSE_TOLERANCE * 7870.0) << "IRON 密度";
    EXPECT_NEAR(wood.density_kgm3, 600.0, LOOSE_TOLERANCE * 600.0) << "WOOD 密度";
    EXPECT_NEAR(steel.density_kgm3, 7850.0, LOOSE_TOLERANCE * 7850.0) << "STEEL 密度";
}

TEST_F(TestSimulationEngine, Normal_InstrumentSensitivityFactor) {
    double didongyi = SimulationEngine::instrumentSensitivityFactor(InstrumentType::DIDONGYI);
    double water = SimulationEngine::instrumentSensitivityFactor(InstrumentType::WATER_CLOCK_ARMILLARY);
    double modern = SimulationEngine::instrumentSensitivityFactor(InstrumentType::MODERN_SEISMOMETER);

    EXPECT_NEAR(didongyi, 1.0, TOLERANCE) << "DIDONGYI 灵敏度因子";
    EXPECT_NEAR(water, 0.15, TOLERANCE) << "WATER_CLOCK_ARMILLARY 灵敏度因子";
    EXPECT_NEAR(modern, 25.0, TOLERANCE) << "MODERN_SEISMOMETER 灵敏度因子";
}

TEST_F(TestSimulationEngine, Normal_InstrumentResponseLag) {
    double didongyi = SimulationEngine::instrumentResponseLag(InstrumentType::DIDONGYI);
    double water = SimulationEngine::instrumentResponseLag(InstrumentType::WATER_CLOCK_ARMILLARY);
    double modern = SimulationEngine::instrumentResponseLag(InstrumentType::MODERN_SEISMOMETER);

    EXPECT_GT(didongyi, 0.0) << "DIDONGYI 响应滞后应 > 0";
    EXPECT_GT(water, didongyi) << "WATER_CLOCK_ARMILLARY 响应滞后应 > DIDONGYI";
    EXPECT_LT(modern, didongyi) << "MODERN_SEISMOMETER 响应滞后应最小";
}

TEST_F(TestSimulationEngine, Normal_MaterialTypeName) {
    std::string copper_name = SimulationEngine::materialTypeName(MaterialType::COPPER);
    std::string iron_name = SimulationEngine::materialTypeName(MaterialType::IRON);

    bool copper_has_char = copper_name.find("铜") != std::string::npos || copper_name.find("青铜") != std::string::npos;
    bool iron_has_char = iron_name.find("铁") != std::string::npos;

    EXPECT_TRUE(copper_has_char) << "COPPER 名称应含'铜'或'青铜'，实际: " << copper_name;
    EXPECT_TRUE(iron_has_char) << "IRON 名称应含'铁'，实际: " << iron_name;
}

TEST_F(TestSimulationEngine, Boundary_MinMagnitudeM1) {
    SimulationParameters params = defaultParams;
    params.magnitude = 1.0;
    params.distance = 100.0;

    EXPECT_NO_THROW({
        SimulationResult result = engine.runSimulation(params);
        EXPECT_NEAR(result.max_angle, 0.0, LOOSE_TOLERANCE) << "M1 max_angle 应接近0";
    }) << "M1 仿真不应崩溃";
}

TEST_F(TestSimulationEngine, Boundary_MaxMagnitudeM10) {
    SimulationParameters params = defaultParams;
    params.magnitude = 10.0;
    params.distance = 100.0;

    EXPECT_NO_THROW({
        SimulationResult result = engine.runSimulation(params);
        EXPECT_TRUE(result.triggered) << "M10 应触发";
        EXPECT_GT(result.max_angle, 5.0) << "M10 max_angle 应很大";
    }) << "M10 仿真不应崩溃";
}

TEST_F(TestSimulationEngine, Boundary_VeryCloseDistanceD1) {
    SimulationParameters params = defaultParams;
    params.magnitude = 5.0;
    params.distance = 1.0;

    EXPECT_NO_THROW({
        SimulationResult result = engine.runSimulation(params);
        double accel = SimulationEngine::computePeakAcceleration(5.0, 1.0, SiteSoilType::II);
        EXPECT_GT(accel, 0.0) << "近距离加速度应 > 0";
        EXPECT_FALSE(std::isinf(accel)) << "加速度不应为 inf";
    }) << "D1km 仿真不应崩溃";
}

TEST_F(TestSimulationEngine, Boundary_VeryFarDistanceD2000) {
    SimulationParameters params = defaultParams;
    params.magnitude = 5.0;
    params.distance = 2000.0;

    EXPECT_NO_THROW({
        SimulationResult result = engine.runSimulation(params);
        EXPECT_LT(result.max_angle, 5.0) << "D2000km 低加速度，可能不触发";
    }) << "D2000km 仿真不应崩溃";
}

TEST_F(TestSimulationEngine, Boundary_ExtremeSiteSoilTypes) {
    double accel_i0 = SimulationEngine::computePeakAcceleration(5.0, 100.0, SiteSoilType::I0);
    double accel_iv = SimulationEngine::computePeakAcceleration(5.0, 100.0, SiteSoilType::IV);

    EXPECT_GT(accel_iv, accel_i0) << "IV类场地加速度应明显大于I0类";
    EXPECT_GT(accel_iv / accel_i0, 1.5) << "加速度差异应明显（>1.5倍）";
}

TEST_F(TestSimulationEngine, Boundary_ModernSeismometerM3FarDistance) {
    SimulationParameters params = defaultParams;
    params.magnitude = 3.0;
    params.distance = 500.0;
    params.instrument_type = InstrumentType::MODERN_SEISMOMETER;

    EXPECT_NO_THROW({
        SimulationResult result = engine.runSimulation(params);
    }) << "MODERN_SEISMOMETER M3 D500km 不应崩溃";
}

TEST_F(TestSimulationEngine, Abnormal_ZeroMagnitudeM0) {
    SimulationParameters params = defaultParams;
    params.magnitude = 0.0;
    params.distance = 100.0;

    EXPECT_NO_THROW({
        SimulationResult result = engine.runSimulation(params);
        EXPECT_NEAR(result.max_angle, 0.0, LOOSE_TOLERANCE) << "M0 max_angle 应接近0";
    }) << "M0 仿真不应崩溃";
}

TEST_F(TestSimulationEngine, Abnormal_ZeroDistanceD0) {
    EXPECT_NO_THROW({
        double accel = SimulationEngine::computePeakAcceleration(5.0, 0.0, SiteSoilType::II);
        EXPECT_FALSE(std::isinf(accel)) << "D0 加速度不应为 inf";
    }) << "D0 computePeakAcceleration 不应崩溃";
}

TEST_F(TestSimulationEngine, Abnormal_VeryShortDuration) {
    SimulationParameters params = defaultParams;
    params.magnitude = 5.0;
    params.distance = 100.0;
    params.duration = 0.01;

    EXPECT_NO_THROW({
        SimulationResult result = engine.runSimulation(params);
    }) << "duration=0.01s 仿真不应崩溃";
}

TEST_F(TestSimulationEngine, Abnormal_LargeTimeStep) {
    SimulationParameters params = defaultParams;
    params.magnitude = 5.0;
    params.distance = 100.0;
    params.dt = 1.0;
    params.duration = 10.0;

    EXPECT_NO_THROW({
        SimulationResult result = engine.runSimulation(params);
    }) << "dt=1.0 仿真不应崩溃";
}

TEST_F(TestSimulationEngine, Abnormal_WoodMaterialSimulation) {
    SimulationParameters params = defaultParams;
    params.magnitude = 5.0;
    params.distance = 100.0;
    params.material_type = MaterialType::WOOD;

    MaterialProperties wood = SimulationEngine::getMaterialProperties(MaterialType::WOOD);
    EXPECT_NEAR(wood.density_kgm3, 750.0, LOOSE_TOLERANCE * 750.0) << "WOOD 密度极低";

    EXPECT_NO_THROW({
        SimulationResult result = engine.runSimulation(params);
    }) << "WOOD 材料仿真不应崩溃";
}

TEST_F(TestSimulationEngine, Abnormal_AllSoilTypesAccelerationIncreasing) {
    double prev_accel = -1.0;
    SiteSoilType soils[] = {SiteSoilType::I0, SiteSoilType::I1, SiteSoilType::II, SiteSoilType::III, SiteSoilType::IV};

    for (auto soil : soils) {
        double accel = SimulationEngine::computePeakAcceleration(5.0, 100.0, soil);
        EXPECT_GT(accel, prev_accel) << "场地土类型越高，加速度应递增";
        prev_accel = accel;
    }
}
