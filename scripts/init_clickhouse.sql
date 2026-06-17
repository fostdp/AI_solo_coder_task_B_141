CREATE DATABASE IF NOT EXISTS didongyi;

-- ============================================================
-- 原始数据表 (MergeTree + 按月分区)
-- ============================================================

CREATE TABLE IF NOT EXISTS didongyi.sensor_data
(
    device_id String,
    timestamp DateTime64(3, 'UTC'),
    acceleration_x Float64,
    acceleration_y Float64,
    acceleration_z Float64,
    magnitude Float64,
    distance Float64,
    triggered_dragon Int32,
    displacement_x Float64 DEFAULT 0,
    displacement_y Float64 DEFAULT 0,
    site_soil LowCardinality(String) DEFAULT 'II'
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (device_id, timestamp)
TTL toDateTime(timestamp) + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS didongyi.simulation_results
(
    timestamp DateTime64(3, 'UTC'),
    triggered UInt8,
    dragon_index Int32,
    direction LowCardinality(String),
    max_angle Float64,
    peak_acceleration Float64,
    magnitude Float64,
    distance Float64,
    contact_force_x Float64 DEFAULT 0,
    contact_force_y Float64 DEFAULT 0,
    device_id String DEFAULT 'DDY-001',
    site_soil LowCardinality(String) DEFAULT 'II'
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (device_id, timestamp)
TTL toDateTime(timestamp) + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS didongyi.alerts
(
    id String,
    timestamp DateTime64(3, 'UTC'),
    type LowCardinality(String),
    level LowCardinality(String),
    message String,
    device_id String,
    mqtt_delivered UInt8
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, type, level)
TTL toDateTime(timestamp) + INTERVAL 365 DAY
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS didongyi.sensitivity_analysis
(
    timestamp DateTime64(3, 'UTC'),
    optimal_threshold Float64,
    youden_j Float64,
    detection_area_km2 Float64 DEFAULT 0,
    avg_false_alarm_rate Float64 DEFAULT 0,
    site_soil LowCardinality(String) DEFAULT 'II',
    heatmap_json String,
    roc_json String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, site_soil)
TTL toDateTime(timestamp) + INTERVAL 365 DAY
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS didongyi.devices
(
    device_id String,
    name String,
    location String,
    site_soil LowCardinality(String) DEFAULT 'II',
    registered_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(registered_at)
ORDER BY device_id
SETTINGS index_granularity = 8192;

INSERT INTO didongyi.devices (device_id, name, location, site_soil)
VALUES ('DDY-001', '张衡地动仪复原模型A', '洛阳观测站', 'II');

-- ============================================================
-- 仪器对比记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS didongyi.instrument_comparisons
(
    id String,
    timestamp DateTime64(3, 'UTC'),
    magnitude_min Float64,
    magnitude_max Float64,
    distance_min Float64,
    distance_max Float64,
    grid_steps UInt32,
    monte_carlo_trials UInt32,
    site_soil LowCardinality(String),
    instruments Array(LowCardinality(String)),
    materials Array(LowCardinality(String)),
    result_json String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, id)
TTL toDateTime(timestamp) + INTERVAL 365 DAY
SETTINGS index_granularity = 8192;

-- ============================================================
-- 材料影响分析记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS didongyi.material_analyses
(
    id String,
    timestamp DateTime64(3, 'UTC'),
    reference_material LowCardinality(String),
    test_materials Array(LowCardinality(String)),
    magnitude Float64,
    distance Float64,
    trials UInt32,
    site_soil LowCardinality(String),
    instrument LowCardinality(String),
    result_json String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, id)
TTL toDateTime(timestamp) + INTERVAL 365 DAY
SETTINGS index_granularity = 8192;

-- ============================================================
-- 组网定位结果记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS didongyi.network_localizations
(
    id String,
    timestamp DateTime64(3, 'UTC'),
    method LowCardinality(String),
    station_count UInt32,
    stations Array(String),
    latitude_est Float64,
    longitude_est Float64,
    uncertainty_km Float64,
    confidence Float64,
    estimated_magnitude Float64,
    estimated_depth_km Float64,
    error_ellipse_major Float64,
    error_ellipse_minor Float64,
    error_ellipse_orientation Float64,
    readings_json String,
    candidates_json String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, method)
TTL toDateTime(timestamp) + INTERVAL 365 DAY
SETTINGS index_granularity = 8192;

-- ============================================================
-- 虚拟体验触发地震记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS didongyi.earthquake_triggers
(
    id String,
    timestamp DateTime64(3, 'UTC'),
    user_session String,
    instrument LowCardinality(String),
    material LowCardinality(String),
    magnitude Float64,
    distance Float64,
    duration Float64,
    earthquake_direction_deg Float64,
    site_soil LowCardinality(String),
    triggered UInt8,
    dragon_index Int32,
    trigger_time_sec Float64,
    max_tilt_angle Float64,
    peak_acceleration Float64
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, instrument, material)
TTL toDateTime(timestamp) + INTERVAL 365 DAY
SETTINGS index_granularity = 8192;

-- ============================================================
-- 降采样聚合视图 (SummingMergeTree, 每分钟/每小时)
-- ============================================================

CREATE TABLE IF NOT EXISTS didongyi.sensor_data_1m
(
    device_id String,
    timestamp DateTime,
    count UInt64,
    accel_x_avg Float64,
    accel_x_max Float64,
    accel_x_min Float64,
    accel_y_avg Float64,
    accel_y_max Float64,
    accel_y_min Float64,
    accel_z_avg Float64,
    accel_z_max Float64,
    accel_z_min Float64,
    magnitude_avg Float64,
    magnitude_max Float64,
    distance_avg Float64,
    triggers_sum UInt32,
    site_soil LowCardinality(String)
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (device_id, timestamp, site_soil)
TTL timestamp + INTERVAL 1 YEAR
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS didongyi.sensor_data_1h
(
    device_id String,
    timestamp DateTime,
    count UInt64,
    accel_x_avg Float64,
    accel_x_max Float64,
    accel_x_min Float64,
    accel_y_avg Float64,
    accel_y_max Float64,
    accel_y_min Float64,
    accel_z_avg Float64,
    accel_z_max Float64,
    accel_z_min Float64,
    magnitude_avg Float64,
    magnitude_max Float64,
    distance_avg Float64,
    triggers_sum UInt32,
    site_soil LowCardinality(String)
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (device_id, timestamp, site_soil)
TTL timestamp + INTERVAL 5 YEAR
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS didongyi.alerts_1d
(
    date Date,
    type LowCardinality(String),
    level LowCardinality(String),
    count UInt64,
    mqtt_delivered_sum UInt32
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(date)
ORDER BY (date, type, level)
TTL date + INTERVAL 5 YEAR
SETTINGS index_granularity = 8192;

-- ============================================================
-- Materialized Views (自动从原始表写入聚合表)
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS didongyi.sensor_data_1m_mv
TO didongyi.sensor_data_1m
AS
SELECT
    device_id,
    toStartOfMinute(timestamp) AS timestamp,
    count() AS count,
    avg(acceleration_x) AS accel_x_avg,
    max(acceleration_x) AS accel_x_max,
    min(acceleration_x) AS accel_x_min,
    avg(acceleration_y) AS accel_y_avg,
    max(acceleration_y) AS accel_y_max,
    min(acceleration_y) AS accel_y_min,
    avg(acceleration_z) AS accel_z_avg,
    max(acceleration_z) AS accel_z_max,
    min(acceleration_z) AS accel_z_min,
    avg(magnitude) AS magnitude_avg,
    max(magnitude) AS magnitude_max,
    avg(distance) AS distance_avg,
    sumIf(1, triggered_dragon >= 0) AS triggers_sum,
    site_soil
FROM didongyi.sensor_data
GROUP BY device_id, timestamp, site_soil;

CREATE MATERIALIZED VIEW IF NOT EXISTS didongyi.sensor_data_1h_mv
TO didongyi.sensor_data_1h
AS
SELECT
    device_id,
    toStartOfHour(timestamp) AS timestamp,
    count() AS count,
    avg(acceleration_x) AS accel_x_avg,
    max(acceleration_x) AS accel_x_max,
    min(acceleration_x) AS accel_x_min,
    avg(acceleration_y) AS accel_y_avg,
    max(acceleration_y) AS accel_y_max,
    min(acceleration_y) AS accel_y_min,
    avg(acceleration_z) AS accel_z_avg,
    max(acceleration_z) AS accel_z_max,
    min(acceleration_z) AS accel_z_min,
    avg(magnitude) AS magnitude_avg,
    max(magnitude) AS magnitude_max,
    avg(distance) AS distance_avg,
    sumIf(1, triggered_dragon >= 0) AS triggers_sum,
    site_soil
FROM didongyi.sensor_data
GROUP BY device_id, timestamp, site_soil;

CREATE MATERIALIZED VIEW IF NOT EXISTS didongyi.alerts_1d_mv
TO didongyi.alerts_1d
AS
SELECT
    toDate(timestamp) AS date,
    type,
    level,
    count() AS count,
    sum(mqtt_delivered) AS mqtt_delivered_sum
FROM didongyi.alerts
GROUP BY date, type, level;

-- ============================================================
-- 保留策略与合并设置
-- ============================================================

ALTER TABLE didongyi.sensor_data
    MODIFY TTL toDateTime(timestamp) + INTERVAL 30 DAY
    SETTINGS min_bytes_for_wide_part = '10M', min_rows_for_wide_part = 100000;

ALTER TABLE didongyi.simulation_results
    MODIFY TTL toDateTime(timestamp) + INTERVAL 30 DAY
    SETTINGS min_bytes_for_wide_part = '10M', min_rows_for_wide_part = 100000;

ALTER TABLE didongyi.alerts
    MODIFY TTL toDateTime(timestamp) + INTERVAL 365 DAY;

ALTER TABLE didongyi.sensitivity_analysis
    MODIFY TTL toDateTime(timestamp) + INTERVAL 365 DAY;

ALTER TABLE didongyi.sensor_data_1m
    MODIFY TTL timestamp + INTERVAL 1 YEAR;

ALTER TABLE didongyi.sensor_data_1h
    MODIFY TTL timestamp + INTERVAL 5 YEAR;

ALTER TABLE didongyi.alerts_1d
    MODIFY TTL date + INTERVAL 5 YEAR;

OPTIMIZE TABLE didongyi.sensor_data FINAL;
OPTIMIZE TABLE didongyi.alerts FINAL;
