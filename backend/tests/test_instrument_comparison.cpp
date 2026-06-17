#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "test_utils.h"
#include "instrument_comparison.h"
#include "simulation_engine.h"
#include <cmath>
#include <algorithm>
#include <numeric>
#include <map>

using namespace test_utils;

class TestInstrumentComparison : public DidongyiTestBase {
protected:
    void SetUp() override {
        DidongyiTestBase::SetUp();
        engine = std::make_unique<InstrumentComparisonEngine>();
    }

    void TearDown() override {
        engine.reset();
    }

    std::unique_ptr<InstrumentComparisonEngine> engine;
};

TEST_F(TestInstrumentComparison, Normal_ThreeInstrumentComparison) {
    ComparisonResult result = engine->runInstrumentComparison(comparisonRequest);

    EXPECT_GE(result.comparisons.size(), 1u) << "三仪器对比结果应至少有1条";
}

TEST_F(TestInstrumentComparison, Normal_SensitivityOrdering) {
    ComparisonResult result = engine->runInstrumentComparison(comparisonRequest);

    std::map<InstrumentType, double> sensitivityMap;
    for (const auto& comp : result.comparisons) {
        sensitivityMap[comp.instrument] = comp.sensitivity_factor;
    }

    EXPECT_GT(sensitivityMap[InstrumentType::MODERN_SEISMOMETER],
              sensitivityMap[InstrumentType::DIDONGYI])
        << "MODERN_SEISMOMETER 灵敏度(25.0) > DIDONGYI(1.0)";
    EXPECT_GT(sensitivityMap[InstrumentType::DIDONGYI],
              sensitivityMap[InstrumentType::WATER_CLOCK_ARMILLARY])
        << "DIDONGYI 灵敏度(1.0) > WATER_CLOCK_ARMILLARY(0.35)";
}

TEST_F(TestInstrumentComparison, Normal_NoiseFloorOrdering) {
    ComparisonResult result = engine->runInstrumentComparison(comparisonRequest);

    std::map<InstrumentType, double> noiseMap;
    for (const auto& comp : result.comparisons) {
        noiseMap[comp.instrument] = comp.noise_floor;
    }

    EXPECT_LT(noiseMap[InstrumentType::MODERN_SEISMOMETER],
              noiseMap[InstrumentType::DIDONGYI])
        << "MODERN_SEISMOMETER 噪声底 < DIDONGYI";
    EXPECT_LT(noiseMap[InstrumentType::DIDONGYI],
              noiseMap[InstrumentType::WATER_CLOCK_ARMILLARY])
        << "DIDONGYI 噪声底 < WATER_CLOCK_ARMILLARY";
}

TEST_F(TestInstrumentComparison, Normal_DetectionAreaModernLargest) {
    ComparisonResult result = engine->runInstrumentComparison(comparisonRequest);

    std::map<InstrumentType, double> areaMap;
    for (const auto& comp : result.comparisons) {
        areaMap[comp.instrument] = comp.detection_area_km2;
    }

    EXPECT_GT(areaMap[InstrumentType::MODERN_SEISMOMETER],
              areaMap[InstrumentType::DIDONGYI])
        << "MODERN_SEISMOMETER 检测面积应最大";
    EXPECT_GT(areaMap[InstrumentType::MODERN_SEISMOMETER],
              areaMap[InstrumentType::WATER_CLOCK_ARMILLARY])
        << "MODERN_SEISMOMETER 检测面积应 > WATER_CLOCK_ARMILLARY";
}

TEST_F(TestInstrumentComparison, Normal_ROCCurveNotEmpty) {
    ComparisonResult result = engine->runInstrumentComparison(comparisonRequest);

    for (const auto& comp : result.comparisons) {
        EXPECT_GT(comp.roc_curve.size(), 0u)
            << "每个 comparison 的 roc_curve 应非空";
    }
}

TEST_F(TestInstrumentComparison, Normal_YoudenJInRange) {
    ComparisonResult result = engine->runInstrumentComparison(comparisonRequest);

    for (const auto& comp : result.comparisons) {
        EXPECT_GE(comp.youden_j, 0.0)
            << "youden_j 应 >= 0，实际: " << comp.youden_j;
        EXPECT_LE(comp.youden_j, 1.0)
            << "youden_j 应 <= 1，实际: " << comp.youden_j;
    }
}

TEST_F(TestInstrumentComparison, Normal_OptimalThresholdInRange) {
    ComparisonResult result = engine->runInstrumentComparison(comparisonRequest);

    for (const auto& comp : result.comparisons) {
        EXPECT_GT(comp.optimal_threshold, 0.0)
            << "optimal_threshold 应 > 0，实际: " << comp.optimal_threshold;
        EXPECT_LT(comp.optimal_threshold, 1.0)
            << "optimal_threshold 应 < 1，实际: " << comp.optimal_threshold;
    }
}

TEST_F(TestInstrumentComparison, Normal_FourMaterialAnalysis) {
    MaterialAnalysisRequest req = materialAnalysisRequest;
    req.test_materials = {
        MaterialType::IRON,
        MaterialType::WOOD,
        MaterialType::STEEL
    };

    MaterialAnalysisResult result = engine->runMaterialAnalysis(req);

    EXPECT_EQ(result.material_metrics.size(), 3u)
        << "3种材料分析结果应有3条";
}

TEST_F(TestInstrumentComparison, Normal_DetectionProbabilityInRange) {
    MaterialAnalysisResult result = engine->runMaterialAnalysis(materialAnalysisRequest);

    for (const auto& metrics : result.material_metrics) {
        EXPECT_GE(metrics.detection_probability, 0.0)
            << "detection_probability 应 >= 0，实际: " << metrics.detection_probability;
        EXPECT_LE(metrics.detection_probability, 1.0)
            << "detection_probability 应 <= 1，实际: " << metrics.detection_probability;
    }
}

TEST_F(TestInstrumentComparison, Normal_FalseAlarmRateInRange) {
    MaterialAnalysisResult result = engine->runMaterialAnalysis(materialAnalysisRequest);

    for (const auto& metrics : result.material_metrics) {
        EXPECT_GE(metrics.false_alarm_rate, 0.0)
            << "false_alarm_rate 应 >= 0，实际: " << metrics.false_alarm_rate;
        EXPECT_LE(metrics.false_alarm_rate, 1.0)
            << "false_alarm_rate 应 <= 1，实际: " << metrics.false_alarm_rate;
    }
}

TEST_F(TestInstrumentComparison, Normal_MaterialNameNotEmpty) {
    MaterialAnalysisResult result = engine->runMaterialAnalysis(materialAnalysisRequest);

    for (const auto& metrics : result.material_metrics) {
        EXPECT_FALSE(metrics.material_name.empty())
            << "material_name 不应为空";
    }
}

TEST_F(TestInstrumentComparison, Normal_ResponseRatioMeaningful) {
    MaterialAnalysisResult result = engine->runMaterialAnalysis(materialAnalysisRequest);

    bool any_positive = false;
    for (const auto& metrics : result.material_metrics) {
        if (metrics.response_ratio > 0.0) {
            any_positive = true;
            break;
        }
    }
    EXPECT_TRUE(any_positive) << "至少1个材料的 response_ratio 应 > 0";
}

TEST_F(TestInstrumentComparison, Boundary_SingleInstrumentSingleMaterial) {
    ComparisonRequest req;
    req.instruments = {InstrumentType::DIDONGYI};
    req.materials = {MaterialType::COPPER};
    req.magnitude_min = 3.0;
    req.magnitude_max = 6.0;
    req.magnitude_steps = 4;
    req.distance_min = 50.0;
    req.distance_max = 300.0;
    req.distance_steps = 4;
    req.monte_carlo_trials = 5;
    req.site_soil = SiteSoilType::II;

    EXPECT_NO_THROW({
        ComparisonResult result = engine->runInstrumentComparison(req);
        EXPECT_GE(result.comparisons.size(), 1u) << "单仪器单材料应有结果";
    }) << "单仪器单材料不应崩溃";
}

TEST_F(TestInstrumentComparison, Boundary_MinMagnitudeRange) {
    ComparisonRequest req = comparisonRequest;
    req.magnitude_min = 3.0;
    req.magnitude_max = 3.0;
    req.magnitude_steps = 1;
    req.distance_min = 50.0;
    req.distance_max = 200.0;
    req.distance_steps = 3;
    req.monte_carlo_trials = 5;

    EXPECT_NO_THROW({
        ComparisonResult result = engine->runInstrumentComparison(req);
    }) << "极小震级范围不应崩溃";
}

TEST_F(TestInstrumentComparison, Boundary_LargeDistanceRange) {
    ComparisonRequest req = comparisonRequest;
    req.distance_min = 10.0;
    req.distance_max = 2000.0;
    req.distance_steps = 5;
    req.magnitude_min = 3.0;
    req.magnitude_max = 7.0;
    req.magnitude_steps = 5;
    req.monte_carlo_trials = 3;

    EXPECT_NO_THROW({
        ComparisonResult result = engine->runInstrumentComparison(req);
    }) << "极大距离范围不应崩溃";
}

TEST_F(TestInstrumentComparison, Boundary_MinimalMonteCarlo) {
    ComparisonRequest req = comparisonRequest;
    req.monte_carlo_trials = 1;

    EXPECT_NO_THROW({
        ComparisonResult result = engine->runInstrumentComparison(req);
    }) << "monte_carlo_trials=1 不应崩溃";
}

TEST_F(TestInstrumentComparison, Abnormal_EmptyInstrumentList) {
    ComparisonRequest req = comparisonRequest;
    req.instruments = {};

    EXPECT_NO_THROW({
        ComparisonResult result = engine->runInstrumentComparison(req);
    }) << "空仪器列表不应崩溃";
}

TEST_F(TestInstrumentComparison, Abnormal_EmptyMaterialList) {
    ComparisonRequest req = comparisonRequest;
    req.materials = {};

    EXPECT_NO_THROW({
        ComparisonResult result = engine->runInstrumentComparison(req);
    }) << "空材料列表不应崩溃";
}

TEST_F(TestInstrumentComparison, Abnormal_ZeroTrials) {
    MaterialAnalysisRequest req = materialAnalysisRequest;
    req.trials = 0;

    EXPECT_NO_THROW({
        MaterialAnalysisResult result = engine->runMaterialAnalysis(req);
    }) << "trials=0 不应崩溃";
}

TEST_F(TestInstrumentComparison, Abnormal_MagnitudeMinGreaterThanMax) {
    ComparisonRequest req = comparisonRequest;
    req.magnitude_min = 8.0;
    req.magnitude_max = 2.0;

    EXPECT_NO_THROW({
        ComparisonResult result = engine->runInstrumentComparison(req);
    }) << "magnitude_min > magnitude_max 不应崩溃";
}
