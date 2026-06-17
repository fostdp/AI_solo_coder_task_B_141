#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "test_utils.h"
#include "network_localizer.h"
#include <cmath>
#include <vector>
#include <algorithm>

using namespace test_utils;

class NetworkLocalizerTest : public DidongyiTestBase {
protected:
    void SetUp() override {
        DidongyiTestBase::SetUp();
    }

    void TearDown() override {
    }

    static constexpr double WAVE_VELOCITY = 6.0;

    static StationConfig makeStation(const std::string& id, double lat, double lon, double elev,
                                     double time_unc = 0.001, double az_unc = 10.0,
                                     TimeSyncProtocol proto = TimeSyncProtocol::NTP_LAN,
                                     double drift_ppm = 20.0) {
        StationConfig s;
        s.device_id = id;
        s.latitude_deg = lat;
        s.longitude_deg = lon;
        s.elevation_m = elev;
        s.time_uncertainty_sec = time_unc;
        s.azimuth_uncertainty_deg = az_unc;
        s.clock.sync_protocol = proto;
        s.clock.drift_rate_ppm = drift_ppm;
        s.clock.initial_offset_sec = 0.001;
        s.clock.last_sync_time_sec = 0.0;
        return s;
    }

    static std::vector<StationConfig> getChinaStations() {
        return {
            makeStation("DDY-BJ", 39.9042, 116.4074, 43.5),
            makeStation("DDY-SH", 31.2304, 121.4737, 4.0),
            makeStation("DDY-GZ", 23.1291, 113.2644, 11.0),
            makeStation("DDY-CD", 30.5728, 104.0668, 500.0),
            makeStation("DDY-XA", 34.3416, 108.9398, 415.0)
        };
    }

    static std::vector<StationConfig> getCollinearStations() {
        return {
            makeStation("DDY-BJ", 39.9042, 116.4074, 43.5),
            makeStation("DDY-TJ", 39.0842, 117.2009, 10.0),
            makeStation("DDY-JN", 36.6512, 117.1201, 50.0)
        };
    }

    static std::vector<StationReading> generatePerfectReadings(
        const std::vector<StationConfig>& stations,
        double epicenter_lat,
        double epicenter_lon,
        double magnitude = 5.0,
        double time_base = 10.0) {

        std::vector<StationReading> readings;
        readings.reserve(stations.size());

        for (const auto& station : stations) {
            double dist_km = NetworkLocalizer::haversineDistanceKm(
                station.latitude_deg, station.longitude_deg,
                epicenter_lat, epicenter_lon);

            double bearing = NetworkLocalizer::bearingDegrees(
                station.latitude_deg, station.longitude_deg,
                epicenter_lat, epicenter_lon);

            double peak_accel = std::min(9.8,
                std::pow(10, (magnitude - 4) / 2) * std::exp(-dist_km / 200.0));

            readings.push_back({
                station.device_id,
                time_base + dist_km / WAVE_VELOCITY,
                bearing,
                peak_accel,
                20.0,
                -1
            });
        }

        return readings;
    }

    static std::vector<StationReading> generateNoisyReadings(
        const std::vector<StationConfig>& stations,
        double epicenter_lat,
        double epicenter_lon,
        double magnitude = 5.0,
        double time_noise = 0.1,
        double azimuth_noise = 3.0) {

        auto readings = generatePerfectReadings(stations, epicenter_lat, epicenter_lon, magnitude);

        std::mt19937 rng(42);
        std::normal_distribution<> time_dist(0, time_noise);
        std::normal_distribution<> az_dist(0, azimuth_noise);

        for (auto& reading : readings) {
            reading.trigger_time_sec += time_dist(rng);
            reading.azimuth_deg = std::fmod(reading.azimuth_deg + az_dist(rng) + 360.0, 360.0);
        }

        return readings;
    }

    static double computeLocationErrorKm(
        double lat1, double lon1,
        double lat2, double lon2) {
        return NetworkLocalizer::haversineDistanceKm(lat1, lon1, lat2, lon2);
    }

    static void clampCoordinate(double& lat, double& lon) {
        lat = std::max(-90.0, std::min(90.0, lat));
        lon = std::max(-180.0, std::min(180.0, lon));
    }
};

TEST_F(NetworkLocalizerTest, TC_1_1_FusedLocalization_FiveStations) {
    auto stations = getChinaStations();
    double true_lat = 31.0;
    double true_lon = 103.4;
    double magnitude = 8.0;

    auto readings = generateNoisyReadings(stations, true_lat, true_lon, magnitude, 0.05, 2.0);

    auto result = NetworkLocalizer::runFusedLocalization(stations, readings);

    EXPECT_TRUE(result.converged);
    EXPECT_EQ(result.valid_stations, 5);
    EXPECT_EQ(result.best_estimate.method, "fused");

    double error_km = computeLocationErrorKm(
        result.best_estimate.latitude_deg, result.best_estimate.longitude_deg,
        true_lat, true_lon);

    EXPECT_LT(error_km, 15.0)
        << "融合定位误差过大: " << error_km << " km, 期望值 < 15 km";
    EXPECT_GT(result.best_estimate.confidence, 0.9)
        << "置信度过低: " << result.best_estimate.confidence << ", 期望值 > 0.9";
    EXPECT_GT(result.best_estimate.estimated_magnitude, 7.0);
    EXPECT_LT(result.best_estimate.estimated_magnitude, 9.0);
}

TEST_F(NetworkLocalizerTest, TC_1_2_TDOALocalization_ThreeStations) {
    auto stations = getChinaStations();
    std::vector<StationConfig> three_stations = {
        stations[0], stations[1], stations[2]
    };

    double true_lat = 39.6;
    double true_lon = 118.2;

    auto readings = generateNoisyReadings(three_stations, true_lat, true_lon, 7.8, 0.05, 2.0);

    auto tdoa_result = NetworkLocalizer::runTDOA(three_stations, readings);
    auto bearing_result = NetworkLocalizer::runBearingIntersection(three_stations, readings);

    EXPECT_TRUE(tdoa_result.converged);
    EXPECT_EQ(tdoa_result.best_estimate.method, "tdoa");

    double tdoa_error = computeLocationErrorKm(
        tdoa_result.best_estimate.latitude_deg, tdoa_result.best_estimate.longitude_deg,
        true_lat, true_lon);

    double bearing_error = computeLocationErrorKm(
        bearing_result.best_estimate.latitude_deg, bearing_result.best_estimate.longitude_deg,
        true_lat, true_lon);

    EXPECT_LT(tdoa_error, 30.0)
        << "TDOA定位误差过大: " << tdoa_error << " km, 期望值 < 30 km";
    EXPECT_LT(tdoa_error, bearing_error)
        << "TDOA应优于方位交汇: TDOA=" << tdoa_error
        << " km, 方位交汇=" << bearing_error << " km";
}

TEST_F(NetworkLocalizerTest, TC_1_3_BearingIntersection_TwoStations) {
    auto stations = getChinaStations();
    std::vector<StationConfig> two_stations = {
        stations[0], stations[1]
    };

    double true_lat = 39.1;
    double true_lon = 117.2;

    auto readings = generateNoisyReadings(two_stations, true_lat, true_lon, 6.5, 0.1, 3.0);

    auto result = NetworkLocalizer::runBearingIntersection(two_stations, readings);

    EXPECT_TRUE(result.converged);
    EXPECT_EQ(result.best_estimate.method, "bearing_intersection");

    double error_km = computeLocationErrorKm(
        result.best_estimate.latitude_deg, result.best_estimate.longitude_deg,
        true_lat, true_lon);

    EXPECT_LT(error_km, 60.0)
        << "方位交汇误差过大: " << error_km << " km, 期望值 < 60 km";
}

TEST_F(NetworkLocalizerTest, TC_1_4_MinimumStations_TwoStations) {
    auto stations = getChinaStations();
    std::vector<StationConfig> two_stations = {
        stations[0], stations[1]
    };

    double true_lat = 35.0;
    double true_lon = 110.0;

    auto readings = generateNoisyReadings(two_stations, true_lat, true_lon, 5.0);

    auto result = NetworkLocalizer::runBearingIntersection(two_stations, readings);

    EXPECT_TRUE(result.converged);
    EXPECT_EQ(result.valid_stations, 2);
    EXPECT_GT(result.best_estimate.uncertainty_km, 50.0)
        << "2台站定位不确定度应大于50km: " << result.best_estimate.uncertainty_km;

    double a = result.best_estimate.error_ellipse[0];
    double b = result.best_estimate.error_ellipse[1];
    EXPECT_GT(a, 50.0) << "误差椭圆长半轴应大于50km";
    EXPECT_GT(b, 0.0);
}

TEST_F(NetworkLocalizerTest, TC_1_5_CollinearStations_DegradedAccuracy) {
    auto stations = getCollinearStations();

    double true_lat = 38.0;
    double true_lon = 115.0;

    auto readings = generateNoisyReadings(stations, true_lat, true_lon, 6.0, 0.05, 2.0);

    auto result = NetworkLocalizer::runBearingIntersection(stations, readings);

    EXPECT_TRUE(result.converged);

    double a = result.best_estimate.error_ellipse[0];
    double b = result.best_estimate.error_ellipse[1];
    double ratio = a / b;

    EXPECT_GT(ratio, 10.0)
        << "共线台站误差椭圆应显著拉长，长短轴比=" << ratio
        << ", 期望值 > 10";
    EXPECT_GT(a, b) << "长半轴应大于短半轴";
}

TEST_F(NetworkLocalizerTest, TC_1_6_SingleStation_InsufficientData) {
    auto stations = getChinaStations();
    std::vector<StationConfig> one_station = { stations[0] };

    double true_lat = 35.0;
    double true_lon = 110.0;

    auto readings = generatePerfectReadings(one_station, true_lat, true_lon, 5.0);

    auto result = NetworkLocalizer::runBearingIntersection(one_station, readings);

    EXPECT_FALSE(result.converged);
    EXPECT_EQ(result.valid_stations, 1);
    EXPECT_EQ(result.best_estimate.method, "insufficient_data");
    EXPECT_LT(result.best_estimate.confidence, 0.1);
    EXPECT_GT(result.best_estimate.uncertainty_km, 100.0);
}

TEST_F(NetworkLocalizerTest, TC_1_7_InvalidCoordinates_Clamping) {
    StationConfig invalid_station;
    invalid_station.device_id = "INVALID-001";
    invalid_station.latitude_deg = 95.0;
    invalid_station.longitude_deg = 200.0;
    invalid_station.elevation_m = 100.0;

    double lat = invalid_station.latitude_deg;
    double lon = invalid_station.longitude_deg;
    clampCoordinate(lat, lon);

    EXPECT_LE(lat, 90.0) << "纬度应钳位到90°: " << lat;
    EXPECT_GE(lat, -90.0);
    EXPECT_LE(lon, 180.0) << "经度应钳位到180°: " << lon;
    EXPECT_GE(lon, -180.0);

    std::vector<StationConfig> stations = {
        invalid_station,
        {"DDY-002", 31.2, 121.5, 4.0, 0.1, 10.0}
    };

    double clamped_lat = lat;
    double clamped_lon = lon;
    for (auto& s : stations) {
        double slat = s.latitude_deg;
        double slon = s.longitude_deg;
        clampCoordinate(slat, slon);
        s.latitude_deg = slat;
        s.longitude_deg = slon;
    }

    EXPECT_EQ(stations[0].latitude_deg, 90.0);
    EXPECT_EQ(stations[0].longitude_deg, 180.0);

    double true_lat = 35.0;
    double true_lon = 110.0;
    auto readings = generatePerfectReadings(stations, true_lat, true_lon, 5.0);

    auto result = NetworkLocalizer::runBearingIntersection(stations, readings);

    EXPECT_TRUE(result.converged);
    EXPECT_EQ(result.valid_stations, 2);
}

TEST_F(NetworkLocalizerTest, TC_2_1_HaversineDistance_Accuracy) {
    double beijing_lat = 39.9042, beijing_lon = 116.4074;
    double shanghai_lat = 31.2304, shanghai_lon = 121.4737;

    double distance = NetworkLocalizer::haversineDistanceKm(
        beijing_lat, beijing_lon,
        shanghai_lat, shanghai_lon);

    double expected_distance = 1068.0;
    double tolerance = 20.0;

    EXPECT_GT(distance, expected_distance - tolerance)
        << "北京到上海距离过近: " << distance << " km";
    EXPECT_LT(distance, expected_distance + tolerance)
        << "北京到上海距离过远: " << distance << " km";
    EXPECT_NEAR(distance, expected_distance, tolerance)
        << "Haversine距离计算误差应在±20km以内";
}

TEST_F(NetworkLocalizerTest, TC_2_2_BearingCalculation_Accuracy) {
    double beijing_lat = 39.9042, beijing_lon = 116.4074;
    double shanghai_lat = 31.2304, shanghai_lon = 121.4737;

    double bearing = NetworkLocalizer::bearingDegrees(
        beijing_lat, beijing_lon,
        shanghai_lat, shanghai_lon);

    double expected_bearing = 135.0;
    double tolerance = 5.0;

    EXPECT_GT(bearing, expected_bearing - tolerance)
        << "方位角过小: " << bearing << "°";
    EXPECT_LT(bearing, expected_bearing + tolerance)
        << "方位角过大: " << bearing << "°";
    EXPECT_NEAR(bearing, expected_bearing, tolerance)
        << "北京看上海方位角应约为135°(东南方向)";
    EXPECT_GE(bearing, 0.0);
    EXPECT_LT(bearing, 360.0);
}

TEST_F(NetworkLocalizerTest, TC_2_3_TDOAGradientDescent_Convergence) {
    auto stations = getChinaStations();

    double true_lat = 35.0;
    double true_lon = 110.0;

    auto readings = generatePerfectReadings(stations, true_lat, true_lon, 6.0);

    std::sort(readings.begin(), readings.end(),
        [](const StationReading& a, const StationReading& b) {
            return a.trigger_time_sec < b.trigger_time_sec;
        });

    double initial_lat = true_lat + 1.8;
    double initial_lon = true_lon + 1.8;

    double initial_error = computeLocationErrorKm(
        initial_lat, initial_lon, true_lat, true_lon);
    EXPECT_GT(initial_error, 200.0)
        << "初始点应偏离真值200km以上: " << initial_error << " km";

    double best_lat = initial_lat;
    double best_lon = initial_lon;
    double prev_error = 1e12;
    bool converged = false;
    int iterations = 0;

    for (int iter = 0; iter < 100; iter++) {
        iterations = iter + 1;
        double total_error = 0.0;
        double grad_lat = 0.0, grad_lon = 0.0;

        for (size_t i = 1; i < readings.size(); i++) {
            auto it_i = std::find_if(stations.begin(), stations.end(),
                [&](const StationConfig& s) { return s.device_id == readings[i].device_id; });
            auto it_0 = std::find_if(stations.begin(), stations.end(),
                [&](const StationConfig& s) { return s.device_id == readings[0].device_id; });
            if (it_i == stations.end() || it_0 == stations.end()) continue;

            double d_i = NetworkLocalizer::haversineDistanceKm(
                it_i->latitude_deg, it_i->longitude_deg, best_lat, best_lon);
            double d_0 = NetworkLocalizer::haversineDistanceKm(
                it_0->latitude_deg, it_0->longitude_deg, best_lat, best_lon);

            double delta_t_pred = (d_i - d_0) / WAVE_VELOCITY;
            double delta_t_meas = readings[i].trigger_time_sec - readings[0].trigger_time_sec;
            double error = delta_t_pred - delta_t_meas;

            total_error += error * error;

            double dlat = 0.001;
            double d_i_lat = (NetworkLocalizer::haversineDistanceKm(
                it_i->latitude_deg, it_i->longitude_deg, best_lat + dlat, best_lon) - d_i) / dlat;
            double d_i_lon = (NetworkLocalizer::haversineDistanceKm(
                it_i->latitude_deg, it_i->longitude_deg, best_lat, best_lon + 0.001) - d_i) / 0.001;
            double d_0_lat = (NetworkLocalizer::haversineDistanceKm(
                it_0->latitude_deg, it_0->longitude_deg, best_lat + dlat, best_lon) - d_0) / dlat;
            double d_0_lon = (NetworkLocalizer::haversineDistanceKm(
                it_0->latitude_deg, it_0->longitude_deg, best_lat, best_lon + 0.001) - d_0) / 0.001;

            grad_lat += 2 * error * (d_i_lat - d_0_lat) / WAVE_VELOCITY;
            grad_lon += 2 * error * (d_i_lon - d_0_lon) / WAVE_VELOCITY;
        }

        double current_error = computeLocationErrorKm(
            best_lat, best_lon, true_lat, true_lon);

        EXPECT_LE(total_error, prev_error + 1e-6)
            << "残差应单调递减，迭代" << iter << "次时残差增大";
        prev_error = total_error;

        if (current_error < 10.0) {
            converged = true;
            break;
        }

        double step = 0.01;
        best_lat -= step * grad_lat;
        best_lon -= step * grad_lon;

        if (std::sqrt(grad_lat * grad_lat + grad_lon * grad_lon) < 1e-6) break;
    }

    EXPECT_TRUE(converged)
        << "TDOA梯度下降应在100次迭代内收敛到误差<10km";
    EXPECT_LE(iterations, 100)
        << "迭代次数应不超过100次";

    double final_error = computeLocationErrorKm(
        best_lat, best_lon, true_lat, true_lon);
    EXPECT_LT(final_error, 10.0)
        << "最终定位误差应小于10km: " << final_error << " km";
}

TEST_F(NetworkLocalizerTest, TC_2_4_FusedLocalization_WeightingCorrectness) {
    auto stations = getChinaStations();

    double true_lat = 35.0;
    double true_lon = 110.0;

    auto bearing_stations = std::vector<StationConfig>{stations[0], stations[1]};
    auto tdoa_stations = std::vector<StationConfig>{stations[0], stations[1], stations[2], stations[3], stations[4]};

    auto bearing_readings = generateNoisyReadings(bearing_stations, true_lat, true_lon, 6.0, 0.1, 8.0);
    auto tdoa_readings = generateNoisyReadings(tdoa_stations, true_lat, true_lon, 6.0, 0.02, 2.0);

    auto bearing_result = NetworkLocalizer::runBearingIntersection(bearing_stations, bearing_readings);
    auto tdoa_result = NetworkLocalizer::runTDOA(tdoa_stations, tdoa_readings);

    EXPECT_GT(bearing_result.best_estimate.uncertainty_km, 40.0)
        << "方位交汇不确定度应较大: " << bearing_result.best_estimate.uncertainty_km;
    EXPECT_LT(tdoa_result.best_estimate.uncertainty_km, 30.0)
        << "TDOA不确定度应较小: " << tdoa_result.best_estimate.uncertainty_km;

    std::vector<StationReading> all_readings = tdoa_readings;
    auto fused_result = NetworkLocalizer::runFusedLocalization(tdoa_stations, all_readings);

    EXPECT_TRUE(fused_result.converged);
    EXPECT_EQ(fused_result.best_estimate.method, "fused");

    double fused_error = computeLocationErrorKm(
        fused_result.best_estimate.latitude_deg, fused_result.best_estimate.longitude_deg,
        true_lat, true_lon);
    double tdoa_error = computeLocationErrorKm(
        tdoa_result.best_estimate.latitude_deg, tdoa_result.best_estimate.longitude_deg,
        true_lat, true_lon);
    double bearing_error = computeLocationErrorKm(
        bearing_result.best_estimate.latitude_deg, bearing_result.best_estimate.longitude_deg,
        true_lat, true_lon);

    EXPECT_LE(fused_error, bearing_error)
        << "融合结果应不劣于方位交汇: 融合=" << fused_error
        << " km, 方位交汇=" << bearing_error << " km";

    double w_bearing = 1.0 / std::max(1.0, bearing_result.best_estimate.uncertainty_km);
    double w_tdoa = 1.0 / std::max(1.0, tdoa_result.best_estimate.uncertainty_km);
    EXPECT_GT(w_tdoa, w_bearing)
        << "TDOA权重应大于方位交汇权重";

    double expected_lat = (w_bearing * bearing_result.best_estimate.latitude_deg +
                           w_tdoa * tdoa_result.best_estimate.latitude_deg) / (w_bearing + w_tdoa);
    double expected_lon = (w_bearing * bearing_result.best_estimate.longitude_deg +
                           w_tdoa * tdoa_result.best_estimate.longitude_deg) / (w_bearing + w_tdoa);

    EXPECT_NEAR(fused_result.best_estimate.latitude_deg, expected_lat, 0.5)
        << "融合纬度应接近加权平均";
    EXPECT_NEAR(fused_result.best_estimate.longitude_deg, expected_lon, 0.5)
        << "融合经度应接近加权平均";
}

TEST_F(NetworkLocalizerTest, TC_2_5_PerfectNoiselessData) {
    auto stations = getChinaStations();

    double true_lat = 35.0;
    double true_lon = 110.0;

    auto readings = generatePerfectReadings(stations, true_lat, true_lon, 6.0);

    auto result = NetworkLocalizer::runFusedLocalization(stations, readings);

    EXPECT_TRUE(result.converged);

    double error_km = computeLocationErrorKm(
        result.best_estimate.latitude_deg, result.best_estimate.longitude_deg,
        true_lat, true_lon);

    EXPECT_LT(error_km, 1.0)
        << "无噪声数据定位误差应小于1km: " << error_km << " km";
    EXPECT_GT(result.best_estimate.confidence, 0.9);
}

TEST_F(NetworkLocalizerTest, TC_3_1_ErrorEllipse_GeometricValidity) {
    auto stations = getChinaStations();

    double true_lat = 35.0;
    double true_lon = 110.0;

    auto readings = generateNoisyReadings(stations, true_lat, true_lon, 6.0);

    auto result = NetworkLocalizer::runFusedLocalization(stations, readings);

    double a = result.best_estimate.error_ellipse[0];
    double b = result.best_estimate.error_ellipse[1];
    double theta = result.best_estimate.error_ellipse[2];

    EXPECT_GE(a, b) << "长半轴应大于等于短半轴: a=" << a << ", b=" << b;
    EXPECT_GT(b, 0.0) << "短半轴应大于0";
    EXPECT_GT(a, 0.0) << "长半轴应大于0";
    EXPECT_GE(theta, -90.0) << "方向角应在[-90°, 90°]范围内: " << theta;
    EXPECT_LE(theta, 90.0) << "方向角应在[-90°, 90°]范围内: " << theta;
}

TEST_F(NetworkLocalizerTest, TC_3_2_Confidence_CorrelatesWithStationCount) {
    auto stations = getChinaStations();
    double true_lat = 35.0;
    double true_lon = 110.0;

    std::vector<StationConfig> stations_2 = {stations[0], stations[1]};
    std::vector<StationConfig> stations_3 = {stations[0], stations[1], stations[2]};
    std::vector<StationConfig> stations_5 = stations;

    auto readings_2 = generateNoisyReadings(stations_2, true_lat, true_lon, 6.0);
    auto readings_3 = generateNoisyReadings(stations_3, true_lat, true_lon, 6.0);
    auto readings_5 = generateNoisyReadings(stations_5, true_lat, true_lon, 6.0);

    auto result_2 = NetworkLocalizer::runBearingIntersection(stations_2, readings_2);
    auto result_3 = NetworkLocalizer::runTDOA(stations_3, readings_3);
    auto result_5 = NetworkLocalizer::runFusedLocalization(stations_5, readings_5);

    double conf_2 = result_2.best_estimate.confidence;
    double conf_3 = result_3.best_estimate.confidence;
    double conf_5 = result_5.best_estimate.confidence;

    EXPECT_GT(conf_3, conf_2)
        << "3台站置信度应高于2台站: " << conf_3 << " vs " << conf_2;
    EXPECT_GT(conf_5, conf_3)
        << "5台站置信度应高于3台站: " << conf_5 << " vs " << conf_3;

    EXPECT_GE(conf_2, 0.2) << "2台站置信度应≈0.6，实际: " << conf_2;
    EXPECT_GE(conf_3, 0.5) << "3台站置信度应≈0.8，实际: " << conf_3;
    EXPECT_GE(conf_5, 0.8) << "5台站置信度应≈0.95，实际: " << conf_5;
}

TEST_F(NetworkLocalizerTest, TC_3_3_ErrorEllipse_DegenerateCase) {
    auto stations = getCollinearStations();

    double true_lat = 38.0;
    double true_lon = 115.0;

    auto readings = generateNoisyReadings(stations, true_lat, true_lon, 6.0);

    auto result = NetworkLocalizer::runBearingIntersection(stations, readings);

    double a = result.best_estimate.error_ellipse[0];
    double b = result.best_estimate.error_ellipse[1];
    double ratio = a / b;

    EXPECT_GT(ratio, 10.0)
        << "共线台站误差椭圆应严重退化，长短轴比=" << ratio
        << ", 期望值 > 10";
    EXPECT_GT(a, 50.0) << "退化情况下长半轴应大于50km";
    EXPECT_LT(result.best_estimate.confidence, 0.7)
        << "退化情况下置信度应较低: " << result.best_estimate.confidence;
}

TEST_F(NetworkLocalizerTest, TC_4_1_MagnitudeEstimation_Relation) {
    auto stations = getChinaStations();

    struct TestCase {
        double magnitude;
        double distance_km;
    };

    std::vector<TestCase> test_cases = {
        {4.0, 100.0},
        {5.0, 200.0},
        {6.0, 300.0},
        {7.0, 400.0}
    };

    for (const auto& tc : test_cases) {
        double true_lat = 31.0;
        double true_lon = 103.4 + tc.distance_km / 100.0;

        auto readings = generatePerfectReadings(stations, true_lat, true_lon, tc.magnitude);

        auto result = NetworkLocalizer::runFusedLocalization(stations, readings);

        double estimated_mag = result.best_estimate.estimated_magnitude;
        double error = std::abs(estimated_mag - tc.magnitude);

        EXPECT_LT(error, 0.5)
            << "震级M=" << tc.magnitude
            << " 估算误差过大: |" << estimated_mag << " - " << tc.magnitude << "| = "
            << error << " 级, 期望值 < 0.5 级";
    }
}

TEST_F(NetworkLocalizerTest, TC_4_2_NearFieldEarthquake) {
    auto stations = getChinaStations();
    std::vector<StationConfig> near_stations = {
        {"DDY-001", 39.9, 116.4, 43.5, 0.1, 10.0},
        {"DDY-002", 39.95, 116.45, 50.0, 0.1, 10.0}
    };

    double true_lat = 39.92;
    double true_lon = 116.42;
    double magnitude = 3.0;

    double distance = NetworkLocalizer::haversineDistanceKm(
        near_stations[0].latitude_deg, near_stations[0].longitude_deg,
        true_lat, true_lon);

    EXPECT_LT(distance, 10.0)
        << "测试用例应确保震中距<10km: " << distance << " km";

    auto readings = generatePerfectReadings(near_stations, true_lat, true_lon, magnitude);

    for (const auto& r : readings) {
        auto it = std::find_if(near_stations.begin(), near_stations.end(),
            [&](const StationConfig& s) { return s.device_id == r.device_id; });
        if (it != near_stations.end()) {
            double d = NetworkLocalizer::haversineDistanceKm(
                it->latitude_deg, it->longitude_deg,
                true_lat, true_lon);
            EXPECT_LT(d, 10.0)
                << "台站" << r.device_id << "震中距应<10km: " << d << " km";
        }
    }

    auto result = NetworkLocalizer::runBearingIntersection(near_stations, readings);

    EXPECT_TRUE(result.converged);
    EXPECT_EQ(result.valid_stations, 2);

    double error_km = computeLocationErrorKm(
        result.best_estimate.latitude_deg, result.best_estimate.longitude_deg,
        true_lat, true_lon);

    EXPECT_LT(error_km, 10.0)
        << "近场定位误差应<10km: " << error_km << " km";

    double mag_error = std::abs(result.best_estimate.estimated_magnitude - magnitude);
    EXPECT_LT(mag_error, 1.0)
        << "近场震级估算误差应<1.0级: " << mag_error << " 级";
}

TEST_F(NetworkLocalizerTest, AzimuthToDegrees_ValidIndices) {
    EXPECT_NEAR(NetworkLocalizer::azimuthToDegrees(0), 90.0, 1e-6);
    EXPECT_NEAR(NetworkLocalizer::azimuthToDegrees(1), 45.0, 1e-6);
    EXPECT_NEAR(NetworkLocalizer::azimuthToDegrees(2), 0.0, 1e-6);
    EXPECT_NEAR(NetworkLocalizer::azimuthToDegrees(3), 315.0, 1e-6);
    EXPECT_NEAR(NetworkLocalizer::azimuthToDegrees(4), 270.0, 1e-6);
    EXPECT_NEAR(NetworkLocalizer::azimuthToDegrees(5), 225.0, 1e-6);
    EXPECT_NEAR(NetworkLocalizer::azimuthToDegrees(6), 180.0, 1e-6);
    EXPECT_NEAR(NetworkLocalizer::azimuthToDegrees(7), 135.0, 1e-6);
}

TEST_F(NetworkLocalizerTest, AzimuthToDegrees_InvalidIndices) {
    EXPECT_EQ(NetworkLocalizer::azimuthToDegrees(-1), 0.0);
    EXPECT_EQ(NetworkLocalizer::azimuthToDegrees(8), 0.0);
    EXPECT_EQ(NetworkLocalizer::azimuthToDegrees(100), 0.0);
}

TEST_F(NetworkLocalizerTest, HaversineDistance_SamePoint) {
    double lat = 39.9042, lon = 116.4074;
    double distance = NetworkLocalizer::haversineDistanceKm(lat, lon, lat, lon);
    EXPECT_NEAR(distance, 0.0, 1e-6);
}

TEST_F(NetworkLocalizerTest, HaversineDistance_AntipodalPoints) {
    double distance = NetworkLocalizer::haversineDistanceKm(0.0, 0.0, 0.0, 180.0);
    double expected = M_PI * 6371.0;
    EXPECT_NEAR(distance, expected, 10.0);
}

TEST_F(NetworkLocalizerTest, BearingDegrees_OppositeDirections) {
    double bearing_ns = NetworkLocalizer::bearingDegrees(0.0, 0.0, 10.0, 0.0);
    EXPECT_NEAR(bearing_ns, 0.0, 1.0);

    double bearing_ew = NetworkLocalizer::bearingDegrees(0.0, 0.0, 0.0, 10.0);
    EXPECT_NEAR(bearing_ew, 90.0, 1.0);

    double bearing_ss = NetworkLocalizer::bearingDegrees(0.0, 0.0, -10.0, 0.0);
    EXPECT_NEAR(bearing_ss, 180.0, 1.0);

    double bearing_ww = NetworkLocalizer::bearingDegrees(0.0, 0.0, 0.0, -10.0);
    EXPECT_NEAR(bearing_ww, 270.0, 1.0);
}

TEST_F(NetworkLocalizerTest, AutoMethodSelection_FourPlusStations) {
    auto stations = getChinaStations();
    ASSERT_EQ(stations.size(), 5);

    double true_lat = 35.0;
    double true_lon = 110.0;

    auto readings = generateNoisyReadings(stations, true_lat, true_lon, 6.0);

    NetworkLocalizer localizer;
    auto result = localizer.localize(stations, readings);

    EXPECT_EQ(result.best_estimate.method, "fused");
    EXPECT_TRUE(result.converged);
}

TEST_F(NetworkLocalizerTest, AutoMethodSelection_ThreeStations) {
    auto stations = getChinaStations();
    std::vector<StationConfig> three_stations = {
        stations[0], stations[1], stations[2]
    };

    double true_lat = 35.0;
    double true_lon = 110.0;

    auto readings = generateNoisyReadings(three_stations, true_lat, true_lon, 6.0);

    NetworkLocalizer localizer;
    auto result = localizer.localize(three_stations, readings);

    EXPECT_EQ(result.best_estimate.method, "tdoa");
    EXPECT_TRUE(result.converged);
}

TEST_F(NetworkLocalizerTest, AutoMethodSelection_TwoStations) {
    auto stations = getChinaStations();
    std::vector<StationConfig> two_stations = {
        stations[0], stations[1]
    };

    double true_lat = 35.0;
    double true_lon = 110.0;

    auto readings = generateNoisyReadings(two_stations, true_lat, true_lon, 6.0);

    NetworkLocalizer localizer;
    auto result = localizer.localize(two_stations, readings);

    EXPECT_EQ(result.best_estimate.method, "bearing_intersection");
    EXPECT_TRUE(result.converged);
}
