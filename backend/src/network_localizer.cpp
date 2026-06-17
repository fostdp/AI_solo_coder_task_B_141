#include "network_localizer.h"
#include <algorithm>
#include <numeric>
#include <cmath>
#include <stdexcept>

double deg2rad(double deg) { return deg * M_PI / 180.0; }
double rad2deg(double rad) { return rad * 180.0 / M_PI; }

double NetworkLocalizer::haversineDistanceKm(double lat1_deg, double lon1_deg,
                                             double lat2_deg, double lon2_deg) {
    double dlat = deg2rad(lat2_deg - lat1_deg);
    double dlon = deg2rad(lon2_deg - lon1_deg);
    double a = std::sin(dlat / 2) * std::sin(dlat / 2) +
               std::cos(deg2rad(lat1_deg)) * std::cos(deg2rad(lat2_deg)) *
               std::sin(dlon / 2) * std::sin(dlon / 2);
    double c = 2 * std::atan2(std::sqrt(a), std::sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
}

double NetworkLocalizer::bearingDegrees(double lat1_deg, double lon1_deg,
                                        double lat2_deg, double lon2_deg) {
    double phi1 = deg2rad(lat1_deg);
    double phi2 = deg2rad(lat2_deg);
    double dlambda = deg2rad(lon2_deg - lon1_deg);
    double y = std::sin(dlambda) * std::cos(phi2);
    double x = std::cos(phi1) * std::sin(phi2) - std::sin(phi1) * std::cos(phi2) * std::cos(dlambda);
    double theta = std::atan2(y, x);
    return std::fmod(rad2deg(theta) + 360.0, 360.0);
}

double NetworkLocalizer::azimuthToDegrees(int dragon_index) {
    static const std::array<double, 8> azimuths = {90.0, 45.0, 0.0, 315.0, 270.0, 225.0, 180.0, 135.0};
    if (dragon_index >= 0 && dragon_index < 8) return azimuths[dragon_index];
    return 0.0;
}

std::array<double, 2> NetworkLocalizer::projectToLocal(double lat_deg, double lon_deg,
                                                       double lat0_deg, double lon0_deg) {
    double x = deg2rad(lon_deg - lon0_deg) * EARTH_RADIUS_KM * std::cos(deg2rad(lat0_deg));
    double y = deg2rad(lat_deg - lat0_deg) * EARTH_RADIUS_KM;
    return {x, y};
}

std::array<double, 2> NetworkLocalizer::projectFromLocal(double x_km, double y_km,
                                                         double lat0_deg, double lon0_deg) {
    double lat = lat0_deg + rad2deg(y_km / EARTH_RADIUS_KM);
    double lon = lon0_deg + rad2deg(x_km / (EARTH_RADIUS_KM * std::cos(deg2rad(lat0_deg))));
    return {lat, lon};
}

double NetworkLocalizer::lineLineIntersection(double x1, double y1, double theta1,
                                              double x2, double y2, double theta2,
                                              double& x_out, double& y_out) {
    double dx1 = std::cos(deg2rad(theta1));
    double dy1 = std::sin(deg2rad(theta1));
    double dx2 = std::cos(deg2rad(theta2));
    double dy2 = std::sin(deg2rad(theta2));

    double denom = dx1 * dy2 - dy1 * dx2;
    if (std::abs(denom) < 1e-12) {
        x_out = (x1 + x2) / 2;
        y_out = (y1 + y2) / 2;
        return -1;
    }

    double t = ((x2 - x1) * dy2 - (y2 - y1) * dx2) / denom;
    x_out = x1 + t * dx1;
    y_out = y1 + t * dy1;
    return t;
}

double NetworkLocalizer::computeResidual(const std::vector<StationConfig>& stations,
                                         const std::vector<StationReading>& readings,
                                         double lat_deg, double lon_deg) {
    double total_residual = 0.0;
    int count = 0;

    for (const auto& reading : readings) {
        auto it = std::find_if(stations.begin(), stations.end(),
            [&](const StationConfig& s) { return s.device_id == reading.device_id; });
        if (it == stations.end()) continue;

        double expected_azimuth = bearingDegrees(it->latitude_deg, it->longitude_deg, lat_deg, lon_deg);
        double diff = std::abs(expected_azimuth - reading.azimuth_deg);
        diff = std::min(diff, 360.0 - diff);
        total_residual += diff * diff;
        count++;
    }

    return count > 0 ? std::sqrt(total_residual / count) : 0.0;
}

void NetworkLocalizer::estimateUncertainty(EpicenterEstimate& estimate,
                                           const std::vector<StationConfig>& stations,
                                           const std::vector<StationReading>& readings) {
    if (stations.size() < 3) {
        estimate.uncertainty_km = 50.0;
        estimate.confidence = 0.3;
        estimate.error_ellipse = {50.0, 50.0, 0.0};
        return;
    }

    double base_uncertainty = 10.0;
    double station_penalty = std::max(0.0, 5.0 - static_cast<double>(readings.size())) * 5.0;
    double residual_penalty = estimate.uncertainty_km * 0.5;

    estimate.uncertainty_km = base_uncertainty + station_penalty + residual_penalty;
    estimate.confidence = std::min(0.95, std::max(0.1,
        1.0 - estimate.uncertainty_km / 100.0));

    double ratio = 1.0 + 0.3 * std::sin(deg2rad(45.0));
    estimate.error_ellipse = {
        estimate.uncertainty_km * ratio,
        estimate.uncertainty_km / ratio,
        45.0
    };
}

LocalizationResult NetworkLocalizer::runBearingIntersection(
    const std::vector<StationConfig>& stations,
    const std::vector<StationReading>& readings) {

    LocalizationResult result;
    result.stations = stations;
    result.readings = readings;
    result.converged = false;
    result.valid_stations = 0;

    std::vector<std::array<double, 3>> bearing_lines;
    double lat0 = 0.0, lon0 = 0.0;

    for (const auto& reading : readings) {
        auto it = std::find_if(stations.begin(), stations.end(),
            [&](const StationConfig& s) { return s.device_id == reading.device_id; });
        if (it == stations.end()) continue;

        lat0 += it->latitude_deg;
        lon0 += it->longitude_deg;
        result.valid_stations++;
    }

    if (result.valid_stations < 2) {
        result.best_estimate.method = "insufficient_data";
        result.best_estimate.uncertainty_km = 200.0;
        result.best_estimate.confidence = 0.05;
        return result;
    }

    lat0 /= result.valid_stations;
    lon0 /= result.valid_stations;

    std::vector<std::array<double, 2>> intersections;

    for (size_t i = 0; i < readings.size(); i++) {
        auto it_i = std::find_if(stations.begin(), stations.end(),
            [&](const StationConfig& s) { return s.device_id == readings[i].device_id; });
        if (it_i == stations.end()) continue;

        auto pos_i = projectToLocal(it_i->latitude_deg, it_i->longitude_deg, lat0, lon0);

        for (size_t j = i + 1; j < readings.size(); j++) {
            auto it_j = std::find_if(stations.begin(), stations.end(),
                [&](const StationConfig& s) { return s.device_id == readings[j].device_id; });
            if (it_j == stations.end()) continue;

            auto pos_j = projectToLocal(it_j->latitude_deg, it_j->longitude_deg, lat0, lon0);

            double x, y;
            double t = lineLineIntersection(
                pos_i[0], pos_i[1], readings[i].azimuth_deg,
                pos_j[0], pos_j[1], readings[j].azimuth_deg,
                x, y
            );

            if (t >= 0) {
                intersections.push_back({x, y});
            }
        }
    }

    if (intersections.empty()) {
        result.best_estimate.method = "no_intersection";
        result.best_estimate.latitude_deg = lat0;
        result.best_estimate.longitude_deg = lon0;
        result.best_estimate.uncertainty_km = 150.0;
        result.best_estimate.confidence = 0.1;
        return result;
    }

    double avg_x = 0, avg_y = 0;
    for (const auto& p : intersections) {
        avg_x += p[0];
        avg_y += p[1];
    }
    avg_x /= intersections.size();
    avg_y /= intersections.size();

    auto latlon = projectFromLocal(avg_x, avg_y, lat0, lon0);
    result.best_estimate.latitude_deg = latlon[0];
    result.best_estimate.longitude_deg = latlon[1];

    double var_x = 0, var_y = 0;
    for (const auto& p : intersections) {
        var_x += (p[0] - avg_x) * (p[0] - avg_x);
        var_y += (p[1] - avg_y) * (p[1] - avg_y);
    }
    var_x = std::sqrt(var_x / intersections.size());
    var_y = std::sqrt(var_y / intersections.size());

    result.best_estimate.uncertainty_km = (var_x + var_y) / 2;
    result.best_estimate.method = "bearing_intersection";
    result.converged = true;

    estimateUncertainty(result.best_estimate, stations, readings);

    double total_amp = 0;
    for (const auto& r : readings) {
        total_amp += std::sqrt(std::max(1e-9, r.peak_acceleration * 9.81));
    }
    if (result.valid_stations > 0) {
        result.best_estimate.estimated_magnitude = std::log10(total_amp / result.valid_stations) * 3.0 + 2.0;
    }
    result.best_estimate.estimated_depth_km = 10.0 + 20.0 * (1.0 - result.best_estimate.confidence);

    result.residual_mean = computeResidual(stations, readings,
        result.best_estimate.latitude_deg, result.best_estimate.longitude_deg);
    result.residual_std = result.residual_mean * 0.5;

    return result;
}

LocalizationResult NetworkLocalizer::runTDOA(
    const std::vector<StationConfig>& stations,
    const std::vector<StationReading>& readings,
    double wave_velocity_km_sec) {

    LocalizationResult result;
    result.stations = stations;
    result.readings = readings;
    result.valid_stations = 0;

    if (readings.size() < 3) {
        result.best_estimate.method = "insufficient_data_tdoa";
        result.best_estimate.uncertainty_km = 100.0;
        result.best_estimate.confidence = 0.1;
        return result;
    }

    std::vector<double> sorted_times;
    for (const auto& r : readings) sorted_times.push_back(r.trigger_time_sec);
    std::sort(sorted_times.begin(), sorted_times.end());
    double t0 = sorted_times[0];

    double lat0 = 0, lon0 = 0;
    for (const auto& reading : readings) {
        auto it = std::find_if(stations.begin(), stations.end(),
            [&](const StationConfig& s) { return s.device_id == reading.device_id; });
        if (it != stations.end()) {
            lat0 += it->latitude_deg;
            lon0 += it->longitude_deg;
            result.valid_stations++;
        }
    }
    lat0 /= result.valid_stations;
    lon0 /= result.valid_stations;

    double best_lat = lat0, best_lon = lon0;
    double best_error = 1e12;

    for (int iter = 0; iter < 100; iter++) {
        double total_error = 0;
        double grad_lat = 0, grad_lon = 0;

        for (size_t i = 1; i < readings.size(); i++) {
            auto it_i = std::find_if(stations.begin(), stations.end(),
                [&](const StationConfig& s) { return s.device_id == readings[i].device_id; });
            auto it_0 = std::find_if(stations.begin(), stations.end(),
                [&](const StationConfig& s) { return s.device_id == readings[0].device_id; });
            if (it_i == stations.end() || it_0 == stations.end()) continue;

            double d_i = haversineDistanceKm(it_i->latitude_deg, it_i->longitude_deg, best_lat, best_lon);
            double d_0 = haversineDistanceKm(it_0->latitude_deg, it_0->longitude_deg, best_lat, best_lon);
            double delta_t_pred = (d_i - d_0) / wave_velocity_km_sec;
            double delta_t_meas = readings[i].trigger_time_sec - readings[0].trigger_time_sec;
            double error = delta_t_pred - delta_t_meas;

            total_error += error * error;

            double dlat = deg2rad(0.001);
            double dlon = deg2rad(0.001) / std::cos(deg2rad(best_lat));

            double d_i_lat = (haversineDistanceKm(it_i->latitude_deg, it_i->longitude_deg,
                                                     best_lat + 0.001, best_lon) - d_i) / 0.001;
            double d_i_lon = (haversineDistanceKm(it_i->latitude_deg, it_i->longitude_deg,
                                                     best_lat, best_lon + dlon * 180 / M_PI) - d_i) / (dlon * 180 / M_PI);
            double d_0_lat = (haversineDistanceKm(it_0->latitude_deg, it_0->longitude_deg,
                                                     best_lat + 0.001, best_lon) - d_0) / 0.001;
            double d_0_lon = (haversineDistanceKm(it_0->latitude_deg, it_0->longitude_deg,
                                                     best_lat, best_lon + dlon * 180 / M_PI) - d_0) / (dlon * 180 / M_PI);

            grad_lat += 2 * error * (d_i_lat - d_0_lat) / wave_velocity_km_sec;
            grad_lon += 2 * error * (d_i_lon - d_0_lon) / wave_velocity_km_sec;
        }

        if (total_error < best_error) {
            best_error = total_error;
        }

        double step = 0.01;
        best_lat -= step * grad_lat;
        best_lon -= step * grad_lon;

        if (std::sqrt(grad_lat * grad_lat + grad_lon * grad_lon) < 1e-6) break;
    }

    result.best_estimate.latitude_deg = best_lat;
    result.best_estimate.longitude_deg = best_lon;
    result.best_estimate.uncertainty_km = std::sqrt(best_error / std::max(1, result.valid_stations - 2))
                                          * wave_velocity_km_sec * 10;
    result.best_estimate.confidence = std::min(0.9, std::max(0.2, 1.0 - result.best_estimate.uncertainty_km / 80.0));
    result.best_estimate.method = "tdoa";
    result.converged = true;
    result.residual_mean = std::sqrt(best_error / std::max(1, result.valid_stations));
    result.residual_std = result.residual_mean * 0.5;

    double total_amp = 0;
    for (const auto& r : readings) total_amp += r.peak_acceleration;
    if (result.valid_stations > 0) {
        result.best_estimate.estimated_magnitude = std::log10(total_amp / result.valid_stations * 1e6) * 0.7 + 3.0;
    }
    result.best_estimate.estimated_depth_km = 15.0;

    return result;
}

LocalizationResult NetworkLocalizer::runFusedLocalization(
    const std::vector<StationConfig>& stations,
    const std::vector<StationReading>& readings) {

    LocalizationResult bearing_result = runBearingIntersection(stations, readings);
    LocalizationResult tdoa_result = runTDOA(stations, readings);

    LocalizationResult result;
    result.stations = stations;
    result.readings = readings;
    result.valid_stations = std::max(bearing_result.valid_stations, tdoa_result.valid_stations);

    if (!bearing_result.converged && !tdoa_result.converged) {
        result.best_estimate = bearing_result.best_estimate;
        result.best_estimate.method = "failed";
        result.converged = false;
        return result;
    }

    double w_bearing = bearing_result.converged ? 1.0 / std::max(1.0, bearing_result.best_estimate.uncertainty_km) : 0;
    double w_tdoa = tdoa_result.converged ? 1.0 / std::max(1.0, tdoa_result.best_estimate.uncertainty_km) : 0;
    double w_total = w_bearing + w_tdoa;

    if (w_total > 0) {
        result.best_estimate.latitude_deg =
            (w_bearing * bearing_result.best_estimate.latitude_deg +
             w_tdoa * tdoa_result.best_estimate.latitude_deg) / w_total;
        result.best_estimate.longitude_deg =
            (w_bearing * bearing_result.best_estimate.longitude_deg +
             w_tdoa * tdoa_result.best_estimate.longitude_deg) / w_total;

        result.best_estimate.confidence = std::min(0.95,
            (w_bearing * bearing_result.best_estimate.confidence +
             w_tdoa * tdoa_result.best_estimate.confidence) / w_total + 0.05);

        result.best_estimate.uncertainty_km = std::min(
            bearing_result.best_estimate.uncertainty_km,
            tdoa_result.best_estimate.uncertainty_km);
    } else {
        result.best_estimate = bearing_result.converged ?
            bearing_result.best_estimate : tdoa_result.best_estimate;
    }

    result.best_estimate.method = "fused";
    result.best_estimate.estimated_magnitude =
        (bearing_result.best_estimate.estimated_magnitude +
         tdoa_result.best_estimate.estimated_magnitude) / 2;
    result.best_estimate.estimated_depth_km =
        (bearing_result.best_estimate.estimated_depth_km +
         tdoa_result.best_estimate.estimated_depth_km) / 2;

    estimateUncertainty(result.best_estimate, stations, readings);

    result.candidate_estimates.push_back(bearing_result.best_estimate);
    result.candidate_estimates.push_back(tdoa_result.best_estimate);

    result.residual_mean = (bearing_result.residual_mean + tdoa_result.residual_mean) / 2;
    result.residual_std = std::sqrt(
        bearing_result.residual_std * bearing_result.residual_std +
        tdoa_result.residual_std * tdoa_result.residual_std) / 2;

    result.converged = true;

    return result;
}

LocalizationResult NetworkLocalizer::localize(
    const std::vector<StationConfig>& stations,
    const std::vector<StationReading>& readings) {

    int valid_readings = 0;
    for (const auto& r : readings) {
        auto it = std::find_if(stations.begin(), stations.end(),
            [&](const StationConfig& s) { return s.device_id == r.device_id; });
        if (it != stations.end()) valid_readings++;
    }

    if (valid_readings >= 4) {
        return runFusedLocalization(stations, readings);
    } else if (valid_readings >= 3) {
        return runTDOA(stations, readings);
    } else {
        return runBearingIntersection(stations, readings);
    }
}
