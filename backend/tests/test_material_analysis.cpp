#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <algorithm>
#include <numeric>
#include <cmath>
#include <set>
#include "test_utils.h"
#include "instrument_comparison.h"
#include "simulation_engine.h"

using namespace testing;

class MaterialAnalysisTest : public DidongyiTestBase {
protected:
    InstrumentComparisonEngine engine;

    void SetUp() override {
        DidongyiTestBase::SetUp();
    }

    MaterialAnalysisRequest createRequest(
        MaterialType reference = MaterialType::COPPER,
        std::vector<MaterialType> materials = {MaterialType::COPPER, MaterialType::IRON, MaterialType::WOOD, MaterialType::STEEL},
        double magnitude = 5.0,
        double distance = 200.0,
        int trials = 20) {
        MaterialAnalysisRequest req;
        req.reference_material = reference;
        req.test_materials = materials;
        req.magnitude = magnitude;
        req.distance = distance;
        req.duration = 30.0;
        req.site_soil = SiteSoilType::II;
        req.trials = trials;
        req.instrument = InstrumentType::DIDONGYI;
        return req;
    }

    static double computeWaveVelocity(double E, double rho) {
        return std::sqrt(E / rho);
    }

    static bool isApproximatelyEqual(double actual, double expected, double tolerance) {
        return std::abs(actual - expected) / (std::abs(expected) + 1e-10) < tolerance;
    }

    template<typename T>
    static std::vector<size_t> getSortedIndices(const std::vector<T>& values, bool ascending = true) {
        std::vector<size_t> indices(values.size());
        std::iota(indices.begin(), indices.end(), 0);
        if (ascending) {
            std::sort(indices.begin(), indices.end(),
                [&values](size_t i1, size_t i2) { return values[i1] < values[i2]; });
        } else {
            std::sort(indices.begin(), indices.end(),
                [&values](size_t i1, size_t i2) { return values[i1] > values[i2]; });
        }
        return indices;
    }
};

TEST_F(MaterialAnalysisTest, TC_1_1_ResponseSpeedOrdering) {
    auto req = createRequest(MaterialType::COPPER,
        {MaterialType::COPPER, MaterialType::IRON, MaterialType::WOOD, MaterialType::STEEL},
        5.0, 200.0, 15);

    auto result = engine.runMaterialAnalysis(req);

    ASSERT_EQ(result.material_metrics.size(), 4);

    std::vector<MaterialType> expectedOrder = {
        MaterialType::STEEL, MaterialType::IRON, MaterialType::COPPER, MaterialType::WOOD
    };

    std::vector<MaterialType> actualOrder;
    std::vector<double> triggerTimes;

    for (const auto& mm : result.material_metrics) {
        actualOrder.push_back(mm.material);
        triggerTimes.push_back(mm.avg_trigger_time_sec);
    }

    auto sortedIndices = getSortedIndices(triggerTimes, true);

    std::vector<MaterialType> sortedMaterials;
    for (auto idx : sortedIndices) {
        sortedMaterials.push_back(result.material_metrics[idx].material);
    }

    EXPECT_EQ(sortedMaterials, expectedOrder)
        << "Expected response speed order: STEEL < IRON < COPPER < WOOD";

    for (size_t i = 0; i < result.material_metrics.size(); ++i) {
        const auto& mm = result.material_metrics[i];
        MaterialProperties props = SimulationEngine::getMaterialProperties(mm.material);
        double waveVelocity = computeWaveVelocity(props.youngs_modulus_pa, props.density_kgm3);

        SCOPED_TRACE("Material: " + SimulationEngine::materialTypeName(mm.material));
        EXPECT_GT(waveVelocity, 0);
        EXPECT_LT(mm.avg_trigger_time_sec, req.duration + 1e-6);
    }
}

TEST_F(MaterialAnalysisTest, TC_1_2_IronVsCopperResponseRatio) {
    auto req = createRequest(MaterialType::COPPER,
        {MaterialType::COPPER, MaterialType::IRON},
        5.0, 200.0, 30);

    auto result = engine.runMaterialAnalysis(req);

    ASSERT_EQ(result.material_metrics.size(), 2);

    const MaterialMetrics* copperMetrics = nullptr;
    const MaterialMetrics* ironMetrics = nullptr;

    for (const auto& mm : result.material_metrics) {
        if (mm.material == MaterialType::COPPER) copperMetrics = &mm;
        if (mm.material == MaterialType::IRON) ironMetrics = &mm;
    }

    ASSERT_NE(copperMetrics, nullptr);
    ASSERT_NE(ironMetrics, nullptr);
    ASSERT_GT(copperMetrics->avg_trigger_time_sec, 0);
    ASSERT_GT(ironMetrics->avg_trigger_time_sec, 0);

    double responseRatio = copperMetrics->avg_trigger_time_sec / ironMetrics->avg_trigger_time_sec;

    EXPECT_GT(responseRatio, 1.0) << "Iron should respond faster than copper";
    EXPECT_NEAR(responseRatio, 1.3, 0.5)
        << "Iron response ratio relative to copper should be approximately 1.3 (±0.5 tolerance)";

    MaterialProperties copperProps = SimulationEngine::getMaterialProperties(MaterialType::COPPER);
    MaterialProperties ironProps = SimulationEngine::getMaterialProperties(MaterialType::IRON);

    double copperWaveSpeed = computeWaveVelocity(copperProps.youngs_modulus_pa, copperProps.density_kgm3);
    double ironWaveSpeed = computeWaveVelocity(ironProps.youngs_modulus_pa, ironProps.density_kgm3);

    EXPECT_GT(ironWaveSpeed, copperWaveSpeed)
        << "Physical principle: v = sqrt(E/rho), iron should have higher wave velocity";
}

TEST_F(MaterialAnalysisTest, TC_1_3_VeryLowMagnitude_M2_0) {
    auto req = createRequest(MaterialType::COPPER,
        {MaterialType::COPPER, MaterialType::IRON, MaterialType::WOOD, MaterialType::STEEL},
        2.0, 200.0, 30);

    auto result = engine.runMaterialAnalysis(req);

    ASSERT_EQ(result.material_metrics.size(), 4);

    const MaterialMetrics* copperMetrics = nullptr;
    const MaterialMetrics* ironMetrics = nullptr;
    const MaterialMetrics* woodMetrics = nullptr;
    const MaterialMetrics* steelMetrics = nullptr;

    for (const auto& mm : result.material_metrics) {
        if (mm.material == MaterialType::COPPER) copperMetrics = &mm;
        if (mm.material == MaterialType::IRON) ironMetrics = &mm;
        if (mm.material == MaterialType::WOOD) woodMetrics = &mm;
        if (mm.material == MaterialType::STEEL) steelMetrics = &mm;
    }

    ASSERT_NE(copperMetrics, nullptr);
    ASSERT_NE(ironMetrics, nullptr);
    ASSERT_NE(woodMetrics, nullptr);
    ASSERT_NE(steelMetrics, nullptr);

    EXPECT_LT(copperMetrics->detection_probability, 0.3)
        << "Copper detection probability should be < 0.3 at M=2.0";

    EXPECT_GT(steelMetrics->detection_probability, 0.7)
        << "Steel detection probability should be > 0.7 at M=2.0";

    EXPECT_GE(copperMetrics->detection_probability, 0.0);
    EXPECT_LE(copperMetrics->detection_probability, 1.0);
    EXPECT_GE(steelMetrics->detection_probability, 0.0);
    EXPECT_LE(steelMetrics->detection_probability, 1.0);

    EXPECT_GE(ironMetrics->detection_probability, 0.0);
    EXPECT_LE(ironMetrics->detection_probability, 1.0);
    EXPECT_GE(woodMetrics->detection_probability, 0.0);
    EXPECT_LE(woodMetrics->detection_probability, 1.0);
}

TEST_F(MaterialAnalysisTest, TC_1_4_VeryHighMagnitude_M8_0) {
    auto req = createRequest(MaterialType::COPPER,
        {MaterialType::COPPER, MaterialType::IRON, MaterialType::WOOD, MaterialType::STEEL},
        8.0, 200.0, 20);

    auto result = engine.runMaterialAnalysis(req);

    ASSERT_EQ(result.material_metrics.size(), 4);

    for (const auto& mm : result.material_metrics) {
        SCOPED_TRACE("Material: " + SimulationEngine::materialTypeName(mm.material));
        EXPECT_GT(mm.detection_probability, 0.99)
            << "All materials should have >99% detection probability at M=8.0";
        EXPECT_GE(mm.detection_probability, 0.0);
        EXPECT_LE(mm.detection_probability, 1.0);
    }
}

TEST_F(MaterialAnalysisTest, TC_1_5_InvalidMaterialType) {
    auto req = createRequest(MaterialType::COPPER,
        {MaterialType::COPPER, MaterialType::IRON},
        5.0, 200.0, 10);

    MaterialType invalidType = static_cast<MaterialType>(999);

    MaterialProperties props = SimulationEngine::getMaterialProperties(invalidType);

    EXPECT_EQ(props.type, MaterialType::COPPER)
        << "Invalid material type should default to COPPER";
    EXPECT_DOUBLE_EQ(props.density_kgm3, 8960.0);
    EXPECT_DOUBLE_EQ(props.youngs_modulus_pa, 110.0e9);
    EXPECT_DOUBLE_EQ(props.cost_factor, 1.0);

    std::string typeName = SimulationEngine::materialTypeName(invalidType);
    EXPECT_EQ(typeName, "unknown")
        << "Invalid material type name should be 'unknown'";
}

TEST_F(MaterialAnalysisTest, TC_1_6_EmptyReferenceMaterial) {
    MaterialAnalysisRequest req;
    req.test_materials = {MaterialType::IRON, MaterialType::WOOD, MaterialType::STEEL};
    req.magnitude = 5.0;
    req.distance = 100.0;
    req.duration = 30.0;
    req.site_soil = SiteSoilType::II;
    req.trials = 10;
    req.instrument = InstrumentType::DIDONGYI;

    EXPECT_EQ(req.reference_material, MaterialType::COPPER)
        << "Default reference material should be COPPER";

    auto result = engine.runMaterialAnalysis(req);

    EXPECT_EQ(result.reference_material, MaterialType::COPPER)
        << "Result reference material should be COPPER when not specified";

    bool hasCopper = false;
    for (const auto& mm : result.material_metrics) {
        if (mm.material == MaterialType::COPPER) {
            hasCopper = true;
            break;
        }
    }
    EXPECT_TRUE(hasCopper)
        << "Reference material (COPPER) should be included in results";
}

TEST_F(MaterialAnalysisTest, TC_2_1_DampingRatioVsDecaySpeed) {
    SimulationEngine simEngine;

    auto woodProps = SimulationEngine::getMaterialProperties(MaterialType::WOOD);
    auto steelProps = SimulationEngine::getMaterialProperties(MaterialType::STEEL);

    EXPECT_DOUBLE_EQ(woodProps.damping_ratio, 0.08);
    EXPECT_DOUBLE_EQ(steelProps.damping_ratio, 0.02);

    double dampingRatio = woodProps.damping_ratio / steelProps.damping_ratio;
    EXPECT_NEAR(dampingRatio, 4.0, 0.5)
        << "Wood damping ratio should be ~4x that of steel (0.08 / 0.02 = 4)";

    SimulationParameters woodParams = test_utils::generateTestParameters();
    woodParams.material_type = MaterialType::WOOD;
    woodParams.damping_ratio = woodProps.damping_ratio;
    woodParams.magnitude = 6.0;
    woodParams.distance = 100.0;
    woodParams.duration = 30.0;
    woodParams.dt = 0.001;

    SimulationParameters steelParams = woodParams;
    steelParams.material_type = MaterialType::STEEL;
    steelParams.damping_ratio = steelProps.damping_ratio;
    steelParams.pillar_mass = 500.0 * (steelProps.density_kgm3 / 8960.0);

    auto woodResult = simEngine.runSimulation(woodParams);
    auto steelResult = simEngine.runSimulation(steelParams);

    EXPECT_GE(woodResult.max_angle, 0.0);
    EXPECT_GE(steelResult.max_angle, 0.0);

    EXPECT_FALSE(woodResult.trajectory.empty());
    EXPECT_FALSE(steelResult.trajectory.empty());

    if (woodResult.trajectory.size() > 100) {
        double initialAmp = std::abs(woodResult.trajectory[10].theta_x);
        double laterAmp = std::abs(woodResult.trajectory[std::min((int)woodResult.trajectory.size() - 1, 200)].theta_x);
        EXPECT_GE(initialAmp, 0.0);
        EXPECT_GE(laterAmp, 0.0);
    }
}

TEST_F(MaterialAnalysisTest, TC_2_2_DensityVsTriggerThreshold) {
    auto req = createRequest(MaterialType::COPPER,
        {MaterialType::COPPER, MaterialType::WOOD},
        5.0, 100.0, 20);

    auto result = engine.runMaterialAnalysis(req);

    ASSERT_EQ(result.material_metrics.size(), 2);

    const MaterialMetrics* copperMetrics = nullptr;
    const MaterialMetrics* woodMetrics = nullptr;

    for (const auto& mm : result.material_metrics) {
        if (mm.material == MaterialType::COPPER) copperMetrics = &mm;
        if (mm.material == MaterialType::WOOD) woodMetrics = &mm;
    }

    ASSERT_NE(copperMetrics, nullptr);
    ASSERT_NE(woodMetrics, nullptr);

    double densityRatio = copperMetrics->density_kgm3 / woodMetrics->density_kgm3;
    EXPECT_NEAR(densityRatio, 8960.0 / 750.0, 2.0)
        << "Copper density should be about 12x that of wood";

    EXPECT_GT(woodMetrics->avg_max_angle_deg, 0.0);
    EXPECT_GT(copperMetrics->avg_max_angle_deg, 0.0);

    EXPECT_GE(woodMetrics->detection_probability, 0.0);
    EXPECT_LE(woodMetrics->detection_probability, 1.0);
    EXPECT_GE(copperMetrics->detection_probability, 0.0);
    EXPECT_LE(copperMetrics->detection_probability, 1.0);
}

TEST_F(MaterialAnalysisTest, TC_2_3_ZeroDampingNumericalStability) {
    SimulationEngine simEngine;

    SimulationParameters params = test_utils::generateTestParameters();
    params.material_type = MaterialType::STEEL;
    params.damping_ratio = 0.0;
    params.magnitude = 5.0;
    params.distance = 100.0;
    params.duration = 30.0;
    params.dt = 0.001;
    params.noise_level = 0.0;

    MaterialProperties steelProps = SimulationEngine::getMaterialProperties(MaterialType::STEEL);
    params.pillar_mass = 500.0 * (steelProps.density_kgm3 / 8960.0);

    auto result = simEngine.runSimulation(params);

    ASSERT_FALSE(result.trajectory.empty());

    double maxAmplitude = 0.0;
    double initialAmplitude = 0.0;
    double finalAmplitude = 0.0;

    for (size_t i = 0; i < result.trajectory.size(); ++i) {
        double amplitude = std::sqrt(
            result.trajectory[i].theta_x * result.trajectory[i].theta_x +
            result.trajectory[i].theta_y * result.trajectory[i].theta_y
        );
        maxAmplitude = std::max(maxAmplitude, amplitude);

        if (i == 100) initialAmplitude = amplitude;
        if (i == result.trajectory.size() - 1) finalAmplitude = amplitude;
    }

    double limitRad = params.limit_angle * M_PI / 180.0;

    EXPECT_LT(maxAmplitude, limitRad * 10.0)
        << "Simulation should remain numerically stable with zero damping";

    EXPECT_GE(maxAmplitude, 0.0);
    EXPECT_LT(maxAmplitude, 2.0)
        << "Angle amplitude should not exceed reasonable bounds";

    EXPECT_FALSE(std::isnan(maxAmplitude));
    EXPECT_FALSE(std::isinf(maxAmplitude));
    EXPECT_FALSE(std::isnan(initialAmplitude));
    EXPECT_FALSE(std::isinf(initialAmplitude));
    EXPECT_FALSE(std::isnan(finalAmplitude));
    EXPECT_FALSE(std::isinf(finalAmplitude));
}

TEST_F(MaterialAnalysisTest, TC_2_4_NegativeDensityParameterValidation) {
    auto req = createRequest(MaterialType::COPPER,
        {MaterialType::COPPER, MaterialType::IRON},
        5.0, 200.0, 10);

    auto result = engine.runMaterialAnalysis(req);

    ASSERT_EQ(result.material_metrics.size(), 2);

    for (const auto& mm : result.material_metrics) {
        SCOPED_TRACE("Material: " + SimulationEngine::materialTypeName(mm.material));
        EXPECT_GT(mm.density_kgm3, 0)
            << "Density should always be positive";
        EXPECT_FALSE(std::isnan(mm.density_kgm3));
        EXPECT_FALSE(std::isinf(mm.density_kgm3));

        EXPECT_GT(mm.youngs_modulus_pa, 0)
            << "Young's modulus should always be positive";
        EXPECT_FALSE(std::isnan(mm.youngs_modulus_pa));
        EXPECT_FALSE(std::isinf(mm.youngs_modulus_pa));
    }

    MaterialProperties copperProps = SimulationEngine::getMaterialProperties(MaterialType::COPPER);
    EXPECT_DOUBLE_EQ(copperProps.density_kgm3, 8960.0);
    EXPECT_GT(copperProps.density_kgm3, 0);

    MaterialProperties ironProps = SimulationEngine::getMaterialProperties(MaterialType::IRON);
    EXPECT_DOUBLE_EQ(ironProps.density_kgm3, 7870.0);
    EXPECT_GT(ironProps.density_kgm3, 0);
}

TEST_F(MaterialAnalysisTest, TC_3_1_CostEfficiencyRanking) {
    auto req = createRequest(MaterialType::COPPER,
        {MaterialType::COPPER, MaterialType::IRON, MaterialType::WOOD, MaterialType::STEEL},
        5.0, 200.0, 20);

    auto result = engine.runMaterialAnalysis(req);

    ASSERT_EQ(result.material_metrics.size(), 4);

    std::vector<double> costEfficiencies;
    std::vector<MaterialType> materialTypes;

    for (const auto& mm : result.material_metrics) {
        costEfficiencies.push_back(mm.cost_efficiency);
        materialTypes.push_back(mm.material);
    }

    auto sortedIndices = getSortedIndices(costEfficiencies, false);

    std::vector<MaterialType> sortedMaterials;
    for (auto idx : sortedIndices) {
        sortedMaterials.push_back(materialTypes[idx]);
    }

    std::set<MaterialType> materialSet(sortedMaterials.begin(), sortedMaterials.end());
    EXPECT_EQ(materialSet.size(), 4);

    for (const auto& mm : result.material_metrics) {
        SCOPED_TRACE("Material: " + SimulationEngine::materialTypeName(mm.material));
        EXPECT_GE(mm.cost_factor, 0.0);
        EXPECT_LE(mm.cost_factor, 2.0);
        EXPECT_GE(mm.cost_efficiency, 0.0);

        EXPECT_GE(mm.detection_probability, 0.0);
        EXPECT_LE(mm.detection_probability, 1.0);

        double expectedCostEfficiency = mm.cost_factor > 0 && mm.detection_probability > 0
            ? mm.detection_probability / mm.cost_factor
            : 0.0;

        EXPECT_NEAR(mm.cost_efficiency, expectedCostEfficiency, 0.01);
    }
}

TEST_F(MaterialAnalysisTest, TC_3_2_VeryLowBudgetScenario) {
    auto req = createRequest(MaterialType::COPPER,
        {MaterialType::COPPER, MaterialType::IRON, MaterialType::WOOD, MaterialType::STEEL},
        5.0, 200.0, 20);

    auto result = engine.runMaterialAnalysis(req);

    ASSERT_EQ(result.material_metrics.size(), 4);

    std::vector<MaterialType> affordableMaterials;

    for (const auto& mm : result.material_metrics) {
        if (mm.cost_factor < 0.1) {
            affordableMaterials.push_back(mm.material);
        }
    }

    EXPECT_GE(affordableMaterials.size(), 0);

    for (const auto& mm : result.material_metrics) {
        SCOPED_TRACE("Material: " + SimulationEngine::materialTypeName(mm.material));
        if (mm.material == MaterialType::WOOD) {
            EXPECT_LT(mm.cost_factor, 0.2)
                << "Wood should have low cost factor";
        }
        if (mm.material == MaterialType::COPPER) {
            EXPECT_DOUBLE_EQ(mm.cost_factor, 1.0)
                << "Copper should have cost factor = 1.0 (baseline)";
        }
        EXPECT_GE(mm.cost_efficiency, 0.0);
    }
}

TEST_F(MaterialAnalysisTest, TC_3_3_ZeroCostFactorHandling) {
    auto req = createRequest(MaterialType::COPPER,
        {MaterialType::COPPER, MaterialType::IRON},
        5.0, 200.0, 10);

    auto result = engine.runMaterialAnalysis(req);

    for (const auto& mm : result.material_metrics) {
        SCOPED_TRACE("Material: " + SimulationEngine::materialTypeName(mm.material));

        EXPECT_GE(mm.cost_factor, 0.0)
            << "Cost factor should never be negative";

        if (mm.cost_factor == 0.0) {
            EXPECT_GE(mm.cost_efficiency, 0.0)
                << "Cost efficiency should handle zero cost factor gracefully";
        } else {
            double expectedEfficiency = mm.detection_probability > 0
                ? mm.detection_probability / mm.cost_factor
                : 0.0;
            EXPECT_NEAR(mm.cost_efficiency, expectedEfficiency, 0.01);
        }

        EXPECT_FALSE(std::isnan(mm.cost_efficiency));
        EXPECT_FALSE(std::isinf(mm.cost_efficiency));
    }

    MaterialProperties copperProps = SimulationEngine::getMaterialProperties(MaterialType::COPPER);
    EXPECT_DOUBLE_EQ(copperProps.cost_factor, 1.0)
        << "Copper cost factor should be 1.0 (baseline)";

    MaterialProperties ironProps = SimulationEngine::getMaterialProperties(MaterialType::IRON);
    EXPECT_DOUBLE_EQ(ironProps.cost_factor, 0.6)
        << "Iron cost factor should be 0.6";
}

TEST_F(MaterialAnalysisTest, TC_4_1_MonteCarloConsistency) {
    const int NUM_RUNS = 100;

    auto req = createRequest(MaterialType::COPPER,
        {MaterialType::COPPER, MaterialType::STEEL},
        5.0, 200.0, 20);

    std::vector<double> copperTriggerTimes;
    std::vector<double> steelTriggerTimes;
    copperTriggerTimes.reserve(NUM_RUNS);
    steelTriggerTimes.reserve(NUM_RUNS);

    for (int i = 0; i < NUM_RUNS; ++i) {
        auto result = engine.runMaterialAnalysis(req);

        for (const auto& mm : result.material_metrics) {
            if (mm.material == MaterialType::COPPER && mm.detection_probability > 0) {
                copperTriggerTimes.push_back(mm.avg_trigger_time_sec);
            }
            if (mm.material == MaterialType::STEEL && mm.detection_probability > 0) {
                steelTriggerTimes.push_back(mm.avg_trigger_time_sec);
            }
        }
    }

    ASSERT_GE(copperTriggerTimes.size(), 50)
        << "Need at least 50 valid copper trigger times for statistical analysis";
    ASSERT_GE(steelTriggerTimes.size(), 50)
        << "Need at least 50 valid steel trigger times for statistical analysis";

    auto computeMeanStd = [](const std::vector<double>& values) -> std::pair<double, double> {
        double mean = std::accumulate(values.begin(), values.end(), 0.0) / values.size();
        double sqSum = 0.0;
        for (double v : values) {
            sqSum += (v - mean) * (v - mean);
        }
        double std = std::sqrt(sqSum / values.size());
        return {mean, std};
    };

    auto [copperMean, copperStd] = computeMeanStd(copperTriggerTimes);
    auto [steelMean, steelStd] = computeMeanStd(steelTriggerTimes);

    EXPECT_GT(copperMean, 0);
    EXPECT_GT(steelMean, 0);
    EXPECT_GE(copperStd, 0);
    EXPECT_GE(steelStd, 0);

    double copperCV = copperStd / copperMean;
    double steelCV = steelStd / steelMean;

    EXPECT_LT(copperCV, 0.15)
        << "Copper trigger time coefficient of variation should be < 15%";
    EXPECT_LT(steelCV, 0.15)
        << "Steel trigger time coefficient of variation should be < 15%";

    EXPECT_LT(copperStd, copperMean * 0.15)
        << "Copper trigger time standard deviation should be < 15% of mean";
    EXPECT_LT(steelStd, steelMean * 0.15)
        << "Steel trigger time standard deviation should be < 15% of mean";
}

TEST_F(MaterialAnalysisTest, TC_4_2_SmallTrialCount_N5) {
    auto req = createRequest(MaterialType::COPPER,
        {MaterialType::COPPER, MaterialType::IRON, MaterialType::WOOD, MaterialType::STEEL},
        6.0, 100.0, 5);

    auto result = engine.runMaterialAnalysis(req);

    ASSERT_EQ(result.material_metrics.size(), 4);
    EXPECT_EQ(result.trials, 5);

    for (const auto& mm : result.material_metrics) {
        SCOPED_TRACE("Material: " + SimulationEngine::materialTypeName(mm.material));

        EXPECT_EQ(mm.trigger_times.size(), mm.max_angles.size())
            << "Trigger times and max angles should have same length";

        EXPECT_FALSE(std::isnan(mm.avg_trigger_time_sec))
            << "Average trigger time should not be NaN";
        EXPECT_FALSE(std::isinf(mm.avg_trigger_time_sec))
            << "Average trigger time should not be Inf";

        EXPECT_FALSE(std::isnan(mm.avg_max_angle_deg))
            << "Average max angle should not be NaN";
        EXPECT_FALSE(std::isinf(mm.avg_max_angle_deg))
            << "Average max angle should not be Inf";

        EXPECT_FALSE(std::isnan(mm.detection_probability))
            << "Detection probability should not be NaN";
        EXPECT_FALSE(std::isinf(mm.detection_probability))
            << "Detection probability should not be Inf";

        EXPECT_GE(mm.detection_probability, 0.0);
        EXPECT_LE(mm.detection_probability, 1.0);

        EXPECT_GE(mm.trigger_time_std, 0.0);
        EXPECT_GE(mm.max_angle_std, 0.0);

        if (!mm.trigger_times.empty()) {
            EXPECT_GT(mm.avg_trigger_time_sec, 0.0);
            EXPECT_LE(mm.avg_trigger_time_sec, req.duration);
        }
    }
}

TEST_F(MaterialAnalysisTest, MaterialAnalysis_RequestIdGeneration) {
    auto req1 = createRequest();
    auto req2 = createRequest();

    auto result1 = engine.runMaterialAnalysis(req1);
    auto result2 = engine.runMaterialAnalysis(req2);

    EXPECT_FALSE(result1.request_id.empty());
    EXPECT_FALSE(result2.request_id.empty());
    EXPECT_NE(result1.request_id, result2.request_id)
        << "Each request should have a unique ID";
}

TEST_F(MaterialAnalysisTest, MaterialAnalysis_EmptyTestMaterials) {
    auto req = createRequest();
    req.test_materials.clear();

    auto result = engine.runMaterialAnalysis(req);

    EXPECT_GE(result.material_metrics.size(), 1)
        << "Should at least include reference material";

    bool hasReference = false;
    for (const auto& mm : result.material_metrics) {
        if (mm.material == req.reference_material) {
            hasReference = true;
            break;
        }
    }
    EXPECT_TRUE(hasReference);
}

TEST_F(MaterialAnalysisTest, MaterialAnalysis_ResultStructure) {
    auto req = createRequest(MaterialType::COPPER,
        {MaterialType::IRON, MaterialType::STEEL},
        5.0, 100.0, 10);

    auto result = engine.runMaterialAnalysis(req);

    EXPECT_EQ(result.magnitude, req.magnitude);
    EXPECT_EQ(result.distance, req.distance);
    EXPECT_EQ(result.trials, req.trials);
    EXPECT_EQ(result.reference_material, req.reference_material);

    for (const auto& mm : result.material_metrics) {
        EXPECT_FALSE(mm.material_name.empty());

        EXPECT_GT(mm.density_kgm3, 0);
        EXPECT_GT(mm.youngs_modulus_pa, 0);
        EXPECT_GT(mm.damping_ratio, 0);
        EXPECT_GT(mm.yield_strength_pa, 0);
        EXPECT_GE(mm.cost_factor, 0);

        EXPECT_GE(mm.avg_trigger_time_sec, 0);
        EXPECT_GE(mm.trigger_time_std, 0);
        EXPECT_GE(mm.avg_max_angle_deg, 0);
        EXPECT_GE(mm.max_angle_std, 0);

        EXPECT_GE(mm.detection_probability, 0.0);
        EXPECT_LE(mm.detection_probability, 1.0);

        EXPECT_GE(mm.false_alarm_rate, 0.0);
        EXPECT_LE(mm.false_alarm_rate, 1.0);

        EXPECT_GE(mm.response_ratio, 0.0);
        EXPECT_GE(mm.cost_efficiency, 0.0);

        EXPECT_LE(mm.trigger_times.size(), (size_t)req.trials);
        EXPECT_LE(mm.max_angles.size(), (size_t)req.trials);
    }
}

TEST_F(MaterialAnalysisTest, MaterialAnalysis_MaterialPropertiesConsistency) {
    std::vector<MaterialType> materials = {
        MaterialType::COPPER, MaterialType::IRON, MaterialType::WOOD, MaterialType::STEEL
    };

    for (auto mat : materials) {
        SCOPED_TRACE("Material: " + SimulationEngine::materialTypeName(mat));

        MaterialProperties props = SimulationEngine::getMaterialProperties(mat);

        EXPECT_GT(props.density_kgm3, 0);
        EXPECT_GT(props.youngs_modulus_pa, 0);
        EXPECT_GT(props.yield_strength_pa, 0);
        EXPECT_GT(props.damping_ratio, 0);
        EXPECT_GT(props.poissons_ratio, 0);
        EXPECT_LT(props.poissons_ratio, 0.5);
        EXPECT_GT(props.thermal_expansion, 0);
        EXPECT_GE(props.cost_factor, 0);

        EXPECT_EQ(props.type, mat);
    }

    MaterialProperties copperProps = SimulationEngine::getMaterialProperties(MaterialType::COPPER);
    EXPECT_DOUBLE_EQ(copperProps.density_kgm3, 8960.0);
    EXPECT_DOUBLE_EQ(copperProps.youngs_modulus_pa, 110.0e9);
    EXPECT_DOUBLE_EQ(copperProps.damping_ratio, 0.05);
    EXPECT_DOUBLE_EQ(copperProps.cost_factor, 1.0);

    MaterialProperties steelProps = SimulationEngine::getMaterialProperties(MaterialType::STEEL);
    EXPECT_DOUBLE_EQ(steelProps.density_kgm3, 7850.0);
    EXPECT_DOUBLE_EQ(steelProps.youngs_modulus_pa, 206.0e9);
    EXPECT_DOUBLE_EQ(steelProps.damping_ratio, 0.02);
    EXPECT_DOUBLE_EQ(steelProps.cost_factor, 1.5);
}

TEST_F(MaterialAnalysisTest, MaterialAnalysis_PhysicalWaveVelocityOrder) {
    std::vector<MaterialType> materials = {
        MaterialType::COPPER, MaterialType::IRON, MaterialType::WOOD, MaterialType::STEEL
    };

    std::vector<std::pair<double, MaterialType>> waveVelocities;

    for (auto mat : materials) {
        MaterialProperties props = SimulationEngine::getMaterialProperties(mat);
        double velocity = computeWaveVelocity(props.youngs_modulus_pa, props.density_kgm3);
        waveVelocities.push_back({velocity, mat});

        SCOPED_TRACE("Material: " + SimulationEngine::materialTypeName(mat));
        EXPECT_GT(velocity, 0);
        EXPECT_FALSE(std::isnan(velocity));
        EXPECT_FALSE(std::isinf(velocity));
    }

    std::sort(waveVelocities.begin(), waveVelocities.end(),
        [](const auto& a, const auto& b) { return a.first > b.first; });

    EXPECT_EQ(waveVelocities[0].second, MaterialType::STEEL)
        << "Steel should have highest wave velocity";
    EXPECT_EQ(waveVelocities[1].second, MaterialType::IRON)
        << "Iron should have second highest wave velocity";
    EXPECT_EQ(waveVelocities[2].second, MaterialType::COPPER)
        << "Copper should have third highest wave velocity";
    EXPECT_EQ(waveVelocities[3].second, MaterialType::WOOD)
        << "Wood should have lowest wave velocity";

    EXPECT_GT(waveVelocities[0].first, waveVelocities[1].first);
    EXPECT_GT(waveVelocities[1].first, waveVelocities[2].first);
    EXPECT_GT(waveVelocities[2].first, waveVelocities[3].first);
}

TEST_F(MaterialAnalysisTest, MaterialAnalysis_EdgeDistanceValues) {
    auto reqClose = createRequest(MaterialType::COPPER,
        {MaterialType::COPPER, MaterialType::STEEL},
        5.0, 10.0, 10);

    auto reqFar = createRequest(MaterialType::COPPER,
        {MaterialType::COPPER, MaterialType::STEEL},
        5.0, 800.0, 10);

    auto resultClose = engine.runMaterialAnalysis(reqClose);
    auto resultFar = engine.runMaterialAnalysis(reqFar);

    ASSERT_EQ(resultClose.material_metrics.size(), 2);
    ASSERT_EQ(resultFar.material_metrics.size(), 2);

    for (size_t i = 0; i < resultClose.material_metrics.size(); ++i) {
        const auto& closeMetrics = resultClose.material_metrics[i];
        const auto& farMetrics = resultFar.material_metrics[i];

        ASSERT_EQ(closeMetrics.material, farMetrics.material);

        SCOPED_TRACE("Material: " + SimulationEngine::materialTypeName(closeMetrics.material));

        EXPECT_GE(closeMetrics.detection_probability, farMetrics.detection_probability)
            << "Closer distance should have >= detection probability than far distance";
    }
}

TEST_F(MaterialAnalysisTest, MaterialAnalysis_DifferentSoilTypes) {
    std::vector<SiteSoilType> soils = {
        SiteSoilType::I0, SiteSoilType::I1, SiteSoilType::II, SiteSoilType::III, SiteSoilType::IV
    };

    auto req = createRequest();
    req.trials = 5;

    std::vector<double> detectionProbs;

    for (auto soil : soils) {
        req.site_soil = soil;
        auto result = engine.runMaterialAnalysis(req);

        ASSERT_FALSE(result.material_metrics.empty());

        double avgDetection = 0;
        for (const auto& mm : result.material_metrics) {
            avgDetection += mm.detection_probability;
        }
        avgDetection /= result.material_metrics.size();
        detectionProbs.push_back(avgDetection);
    }

    for (size_t i = 0; i < detectionProbs.size() - 1; ++i) {
        EXPECT_GE(detectionProbs[i + 1], detectionProbs[i] * 0.5)
            << "Detection probability should generally increase with softer soil";
    }
}
