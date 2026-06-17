#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "test_utils.h"
#include "vr_seismoscope.h"
#include <cmath>
#include <algorithm>

using namespace test_utils;

class TestVRSeismoscope : public DidongyiTestBase {
protected:
    VRSeismoscopeEngine engine;
};

TEST_F(TestVRSeismoscope, Normal_DefaultTriggerEarthquake) {
    VREarthquakeTriggerRequest request;
    request.session_id = "test_session_001";
    request.magnitude = 5.0;
    request.distance_km = 100.0;
    request.duration_sec = 5.0;

    VREarthquakeTriggerResponse response = engine.triggerEarthquake(request);

    EXPECT_TRUE(response.success) << "默认参数触发应成功";
    EXPECT_EQ(response.session_id, "test_session_001");
    EXPECT_FALSE(response.request_id.empty());
    EXPECT_GE(response.estimated_intensity, 0.0);
    EXPECT_LE(response.estimated_intensity, 12.0);
}

TEST_F(TestVRSeismoscope, Normal_StrongQuakeTriggered) {
    VREarthquakeTriggerRequest request;
    request.session_id = "test_session_002";
    request.magnitude = 7.5;
    request.distance_km = 50.0;
    request.duration_sec = 5.0;

    VREarthquakeTriggerResponse response = engine.triggerEarthquake(request);

    EXPECT_TRUE(response.success) << "强震触发应成功";
    EXPECT_GT(response.max_pillar_angle_deg, 0.0) << "最大柱倾角应 > 0";
    EXPECT_GT(response.peak_ground_acceleration_m_s2, 0.0) << "峰值地面加速度应 > 0";
}

TEST_F(TestVRSeismoscope, Normal_ComputeIntensityM5D100) {
    double intensity = VRSeismoscopeEngine::computeIntensity(5.0, 100.0, SiteSoilType::II);

    EXPECT_GT(intensity, 0.0) << "烈度应 > 0";
    EXPECT_LT(intensity, 12.0) << "烈度应 < 12";
}

TEST_F(TestVRSeismoscope, Normal_IntensityDescriptionValidRange) {
    std::string desc_mid = VRSeismoscopeEngine::intensityDescription(5.5);

    bool has_valid_prefix = desc_mid.find("VI.") != std::string::npos ||
                            desc_mid.find("V.") != std::string::npos;
    EXPECT_TRUE(has_valid_prefix) << "烈度描述应包含正确等级前缀，实际: " << desc_mid;
}

TEST_F(TestVRSeismoscope, Normal_GenerateVRFramesHasData) {
    SimulationParameters params = generateTestParameters();
    params.duration = 2.0;
    params.magnitude = 7.0;
    params.distance = 30.0;

    SimulationEngine sim_engine;
    SimulationResult result = sim_engine.runSimulation(params);

    VRExperienceConfig config;
    std::vector<VRFrameData> frames = VRSeismoscopeEngine::generateVRFrames(result, params, config);

    EXPECT_FALSE(frames.empty()) << "生成VR帧不应为空";
    EXPECT_GT(frames.size(), 0u) << "帧数量应 > 0";
}

TEST_F(TestVRSeismoscope, Normal_GenerateVRFramesFrameCount) {
    SimulationParameters params = generateTestParameters();
    params.duration = 1.0;
    params.magnitude = 6.0;
    params.distance = 50.0;

    SimulationEngine sim_engine;
    SimulationResult result = sim_engine.runSimulation(params);

    VRExperienceConfig config;
    config.frame_sampling_interval = 0.05;
    std::vector<VRFrameData> frames = VRSeismoscopeEngine::generateVRFrames(result, params, config);

    EXPECT_GE(frames.size(), 10u) << "1秒 20fps 至少应有约10帧";
    EXPECT_LE(frames.size(), 100u) << "帧数不应过多";
}

TEST_F(TestVRSeismoscope, Normal_TriggerResponseHasRequestId) {
    VREarthquakeTriggerRequest request;
    request.session_id = "session_req_id_test";
    request.magnitude = 6.0;
    request.distance_km = 80.0;
    request.duration_sec = 3.0;

    VREarthquakeTriggerResponse response = engine.triggerEarthquake(request);

    EXPECT_TRUE(response.success);
    EXPECT_TRUE(response.request_id.find("VR-") == 0) << "request_id 应以 VR- 开头，实际: " << response.request_id;
}

TEST_F(TestVRSeismoscope, Normal_VRFramesHaveTimestamps) {
    SimulationParameters params = generateTestParameters();
    params.duration = 1.0;
    params.magnitude = 6.0;
    params.distance = 50.0;

    SimulationEngine sim_engine;
    SimulationResult result = sim_engine.runSimulation(params);

    VRExperienceConfig config;
    std::vector<VRFrameData> frames = VRSeismoscopeEngine::generateVRFrames(result, params, config);

    ASSERT_FALSE(frames.empty());
    EXPECT_NEAR(frames.front().timestamp_sec, 0.0, 0.1) << "第一帧时间应接近0";
    for (size_t i = 1; i < frames.size(); ++i) {
        EXPECT_GT(frames[i].timestamp_sec, frames[i-1].timestamp_sec)
            << "时间戳应严格递增，i=" << i;
    }
}

TEST_F(TestVRSeismoscope, Boundary_MinMagnitudeM1) {
    VREarthquakeTriggerRequest request;
    request.session_id = "boundary_m1";
    request.magnitude = 1.0;
    request.distance_km = 100.0;
    request.duration_sec = 2.0;

    EXPECT_NO_THROW({
        VREarthquakeTriggerResponse response = engine.triggerEarthquake(request);
        EXPECT_TRUE(response.success) << "M1 触发不应崩溃";
        EXPECT_NEAR(response.max_pillar_angle_deg, 0.0, LOOSE_TOLERANCE * 10.0)
            << "M1 max_angle 应接近0";
    }) << "M1 地震触发不应抛异常";
}

TEST_F(TestVRSeismoscope, Boundary_MaxMagnitudeM10) {
    VREarthquakeTriggerRequest request;
    request.session_id = "boundary_m10";
    request.magnitude = 10.0;
    request.distance_km = 100.0;
    request.duration_sec = 2.0;

    EXPECT_NO_THROW({
        VREarthquakeTriggerResponse response = engine.triggerEarthquake(request);
        EXPECT_TRUE(response.success) << "M10 触发应成功";
        EXPECT_GT(response.estimated_intensity, 5.0) << "M10 烈度应很大";
    }) << "M10 地震触发不应抛异常";
}

TEST_F(TestVRSeismoscope, Boundary_Intensity0Description) {
    std::string desc = VRSeismoscopeEngine::intensityDescription(0.0);

    EXPECT_EQ(desc, "I. 无感") << "烈度0 描述应为 I. 无感";
}

TEST_F(TestVRSeismoscope, Boundary_Intensity11Description) {
    std::string desc = VRSeismoscopeEngine::intensityDescription(11.5);

    EXPECT_EQ(desc, "XI+. 毁灭性") << "烈度11.5 描述应为 XI+. 毁灭性";
}

TEST_F(TestVRSeismoscope, Boundary_GenerateVRFramesEmptyTrajectory) {
    SimulationResult empty_result;
    SimulationParameters params = generateTestParameters();
    VRExperienceConfig config;

    std::vector<VRFrameData> frames = VRSeismoscopeEngine::generateVRFrames(empty_result, params, config);

    EXPECT_TRUE(frames.empty()) << "空轨迹应返回空帧列表";
}

TEST_F(TestVRSeismoscope, Boundary_IntensityClampedTo0and12) {
    double intensity_negative = VRSeismoscopeEngine::computeIntensity(0.0, 10000.0, SiteSoilType::I0);
    double intensity_huge = VRSeismoscopeEngine::computeIntensity(15.0, 1.0, SiteSoilType::IV);

    EXPECT_GE(intensity_negative, 0.0) << "烈度应 >= 0";
    EXPECT_LE(intensity_huge, 12.0) << "烈度应 <= 12";
}

TEST_F(TestVRSeismoscope, Abnormal_ZeroMagnitude) {
    VREarthquakeTriggerRequest request;
    request.session_id = "abnormal_m0";
    request.magnitude = 0.0;
    request.distance_km = 100.0;
    request.duration_sec = 2.0;

    EXPECT_NO_THROW({
        VREarthquakeTriggerResponse response = engine.triggerEarthquake(request);
        EXPECT_TRUE(response.success) << "M0 触发应返回success=true";
    }) << "M0 地震触发不应抛异常";
}

TEST_F(TestVRSeismoscope, Abnormal_ZeroDistance) {
    double intensity = VRSeismoscopeEngine::computeIntensity(5.0, 0.0, SiteSoilType::II);

    EXPECT_FALSE(std::isnan(intensity)) << "零距离烈度不应为 NaN";
    EXPECT_FALSE(std::isinf(intensity)) << "零距离烈度不应为 inf";
    EXPECT_GE(intensity, 0.0) << "烈度应 >= 0";
}

TEST_F(TestVRSeismoscope, Abnormal_NegativeMagnitude) {
    VREarthquakeTriggerRequest request;
    request.session_id = "abnormal_neg_mag";
    request.magnitude = -2.0;
    request.distance_km = 100.0;
    request.duration_sec = 2.0;

    EXPECT_NO_THROW({
        VREarthquakeTriggerResponse response = engine.triggerEarthquake(request);
        EXPECT_TRUE(response.success);
    }) << "负震级不应崩溃";
}

TEST_F(TestVRSeismoscope, Abnormal_VeryShortDuration) {
    VREarthquakeTriggerRequest request;
    request.session_id = "abnormal_short_dur";
    request.magnitude = 5.0;
    request.distance_km = 100.0;
    request.duration_sec = 0.001;

    EXPECT_NO_THROW({
        VREarthquakeTriggerResponse response = engine.triggerEarthquake(request);
        EXPECT_TRUE(response.success);
    }) << "极短持续时间不应崩溃";
}

TEST_F(TestVRSeismoscope, Abnormal_IntensityNegativeDescription) {
    std::string desc = VRSeismoscopeEngine::intensityDescription(-5.0);

    EXPECT_EQ(desc, "I. 无感") << "负烈度描述应为 I. 无感";
}

TEST_F(TestVRSeismoscope, Abnormal_NegativeDistance) {
    double intensity = VRSeismoscopeEngine::computeIntensity(5.0, -100.0, SiteSoilType::II);

    EXPECT_FALSE(std::isnan(intensity)) << "负距离烈度不应为 NaN";
    EXPECT_GE(intensity, 0.0) << "烈度应 >= 0";
}
