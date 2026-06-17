#pragma once

#include <vector>
#include <string>
#include <array>

enum class TimeSyncProtocol {
    NONE = 0,
    NTP_LAN = 1,
    NTP_WAN = 2,
    PTP_IEEE1588 = 3,
    GPS_TIMING = 4,
    RUBIDIUM_CLOCK = 5
};

struct StationClock {
    double drift_rate_ppm = 20.0;
    double initial_offset_sec = 0.001;
    double last_sync_time_sec = 0.0;
    TimeSyncProtocol sync_protocol = TimeSyncProtocol::NTP_LAN;
};

struct StationConfig {
    std::string device_id;
    double latitude_deg;
    double longitude_deg;
    double elevation_m;
    double time_uncertainty_sec = 0.001;
    double azimuth_uncertainty_deg = 10.0;
    StationClock clock;
};

struct StationReading {
    std::string device_id;
    double trigger_time_sec;
    double azimuth_deg;
    double peak_acceleration;
    double signal_to_noise;
    int dragon_index = -1;
};

struct EpicenterEstimate {
    double latitude_deg;
    double longitude_deg;
    double uncertainty_km;
    double confidence;
    double estimated_magnitude;
    double estimated_depth_km;
    std::string method;
    std::array<double, 3> error_ellipse;
};

struct LocalizationResult {
    EpicenterEstimate best_estimate;
    std::vector<EpicenterEstimate> candidate_estimates;
    std::vector<StationReading> readings;
    std::vector<StationConfig> stations;
    double residual_mean;
    double residual_std;
    int valid_stations;
    bool converged;
};

class NetworkLocalizer {
public:
    NetworkLocalizer() = default;

    LocalizationResult localize(const std::vector<StationConfig>& stations,
                                const std::vector<StationReading>& readings);

    static LocalizationResult runBearingIntersection(const std::vector<StationConfig>& stations,
                                                     const std::vector<StationReading>& readings);

    static LocalizationResult runTDOA(const std::vector<StationConfig>& stations,
                                      const std::vector<StationReading>& readings,
                                      double wave_velocity_km_sec = 6.0);

    static LocalizationResult runFusedLocalization(const std::vector<StationConfig>& stations,
                                                   const std::vector<StationReading>& readings);

    static double haversineDistanceKm(double lat1_deg, double lon1_deg,
                                      double lat2_deg, double lon2_deg);

    static double bearingDegrees(double lat1_deg, double lon1_deg,
                                 double lat2_deg, double lon2_deg);

    static double azimuthToDegrees(int dragon_index);

    static double clockTimeToTrue(double clock_time_sec, const StationClock& clock);
    static double protocolTimeUncertaintySec(TimeSyncProtocol proto);
    static double computeClockDriftErrorSec(const StationClock& clock, double elapsed_sec);
    static std::string protocolName(TimeSyncProtocol proto);

private:
    static constexpr double EARTH_RADIUS_KM = 6371.0;

    static std::array<double, 2> projectToLocal(double lat_deg, double lon_deg,
                                                 double lat0_deg, double lon0_deg);

    static std::array<double, 2> projectFromLocal(double x_km, double y_km,
                                                   double lat0_deg, double lon0_deg);

    static double lineLineIntersection(double x1, double y1, double theta1,
                                       double x2, double y2, double theta2,
                                       double& x_out, double& y_out);

    static double computeResidual(const std::vector<StationConfig>& stations,
                                  const std::vector<StationReading>& readings,
                                  double lat_deg, double lon_deg);

    static void estimateUncertainty(EpicenterEstimate& estimate,
                                    const std::vector<StationConfig>& stations,
                                    const std::vector<StationReading>& readings);
};
