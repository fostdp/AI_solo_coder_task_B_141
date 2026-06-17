import { useState, useCallback, useMemo } from "react";
import type {
  StationConfig,
  StationReading,
  LocalizationMethod,
  LocalizationResult,
} from "@/types";
import { runLocalization, triggerEarthquake } from "@/lib/api";
import { DEFAULT_STATIONS, CHINA_BOUNDS, type QuakeParams } from "../types";

export function useNetworkLocalization() {
  const [stations, setStations] = useState<StationConfig[]>(DEFAULT_STATIONS);
  const [method, setMethod] = useState<LocalizationMethod>("auto");
  const [readings, setReadings] = useState<StationReading[]>([]);
  const [localizationResult, setLocalizationResult] = useState<LocalizationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quakeParams, setQuakeParams] = useState<QuakeParams>({
    magnitude: 5.5,
    epicenterLat: 34.3,
    epicenterLon: 109.0,
    depthKm: 10,
  });

  const coordToSvg = useCallback(
    (lat: number, lon: number, width: number, height: number) => {
      const x =
        ((lon - CHINA_BOUNDS.minLon) / (CHINA_BOUNDS.maxLon - CHINA_BOUNDS.minLon)) * width;
      const y =
        ((CHINA_BOUNDS.maxLat - lat) / (CHINA_BOUNDS.maxLat - CHINA_BOUNDS.minLat)) * height;
      return { x, y };
    },
    []
  );

  const svgToCoord = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const lon = (x / width) * (CHINA_BOUNDS.maxLon - CHINA_BOUNDS.minLon) + CHINA_BOUNDS.minLon;
      const lat = CHINA_BOUNDS.maxLat - (y / height) * (CHINA_BOUNDS.maxLat - CHINA_BOUNDS.minLat);
      return { lat, lon };
    },
    []
  );

  const addStation = () => {
    const newId = `DDY-${String(stations.length + 1).padStart(3, "0")}`;
    setStations([
      ...stations,
      {
        device_id: newId,
        latitude_deg: 35 + (Math.random() - 0.5) * 10,
        longitude_deg: 110 + (Math.random() - 0.5) * 15,
        elevation_m: Math.round(Math.random() * 500),
      },
    ]);
  };

  const removeStation = (deviceId: string) => {
    setStations(stations.filter((s) => s.device_id !== deviceId));
    setReadings(readings.filter((r) => r.device_id !== deviceId));
    if (localizationResult) {
      setLocalizationResult({
        ...localizationResult,
        stations: localizationResult.stations.filter((s) => s.device_id !== deviceId),
        readings: localizationResult.readings.filter((r) => r.device_id !== deviceId),
      });
    }
  };

  const updateStation = (deviceId: string, field: keyof StationConfig, value: string | number) => {
    setStations(
      stations.map((s) =>
        s.device_id === deviceId ? { ...s, [field]: value } : s
      )
    );
  };

  const generateRandomReadings = useCallback(async () => {
    if (stations.length < 2) return;

    const { epicenterLat, epicenterLon, magnitude, depthKm } = quakeParams;
    const newReadings: StationReading[] = [];
    let baseTime = Math.random() * 2;

    for (const station of stations) {
      const dx = (station.longitude_deg - epicenterLon) * 111 * Math.cos((station.latitude_deg * Math.PI) / 180);
      const dy = (station.latitude_deg - epicenterLat) * 111;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const travelTime = distance / 6;
      const azimuth = (Math.atan2(dx, dy) * 180) / Math.PI;
      const peakAccel = Math.min(9.8, Math.pow(10, (magnitude - 4) / 2) * Math.exp(-distance / 200));

      try {
        const result = await triggerEarthquake({
          magnitude,
          distance,
          duration: 30,
          earthquake_direction_deg: azimuth,
          instrument_type: "didongyi",
          material_type: "copper",
        });

        if (result.triggered) {
          newReadings.push({
            device_id: station.device_id,
            trigger_time_sec: baseTime + travelTime + (Math.random() - 0.5) * 0.3,
            azimuth_deg: azimuth + (Math.random() - 0.5) * 5,
            peak_acceleration: result.peak_acceleration,
            signal_to_noise: 10 + Math.random() * 20,
            dragon_index: result.trigger.dragon_index,
          });
        }
      } catch {
        if (peakAccel > 0.05) {
          newReadings.push({
            device_id: station.device_id,
            trigger_time_sec: baseTime + travelTime + (Math.random() - 0.5) * 0.3,
            azimuth_deg: azimuth + (Math.random() - 0.5) * 5,
            peak_acceleration: peakAccel,
            signal_to_noise: 10 + Math.random() * 20,
          });
        }
      }
    }

    setReadings(newReadings);
    return newReadings;
  }, [stations, quakeParams]);

  const runLocalizationProcess = async () => {
    if (readings.length < 2) {
      alert("至少需要2个台站的有效读数才能进行定位");
      return;
    }

    setIsProcessing(true);
    try {
      const request = {
        stations,
        readings,
        method,
        wave_velocity_km_sec: 6.0,
      };
      const result = await runLocalization(request);
      setLocalizationResult(result);
    } catch (error) {
      console.error("定位失败:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerRandomQuake = async () => {
    setIsProcessing(true);
    try {
      const newReadings = await generateRandomReadings();
      if (newReadings && newReadings.length >= 2) {
        const request = {
          stations,
          readings: newReadings,
          method,
          wave_velocity_km_sec: 6.0,
        };
        const result = await runLocalization(request);
        setLocalizationResult(result);
      }
    } catch (error) {
      console.error("模拟地震失败:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setStations(DEFAULT_STATIONS);
    setReadings([]);
    setLocalizationResult(null);
    setMethod("auto");
  };

  const mapSize = useMemo(() => ({ width: 700, height: 500 }), []);

  return {
    stations,
    setStations,
    method,
    setMethod,
    readings,
    setReadings,
    localizationResult,
    setLocalizationResult,
    isProcessing,
    setIsProcessing,
    quakeParams,
    setQuakeParams,
    coordToSvg,
    svgToCoord,
    addStation,
    removeStation,
    updateStation,
    generateRandomReadings,
    runLocalizationProcess,
    triggerRandomQuake,
    resetAll,
    mapSize,
  };
}
