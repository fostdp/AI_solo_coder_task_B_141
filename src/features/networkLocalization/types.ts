import type {
  LocalizationMethod,
  StationConfig,
} from "@/types";
import { Target, Navigation, Radio, Layers } from "lucide-react";

export const METHOD_OPTIONS: Array<{
  value: LocalizationMethod;
  label: string;
  icon: typeof Target;
  description: string;
}> = [
  {
    value: "auto",
    label: "自动融合",
    icon: Layers,
    description: "自动选择最优方法组合",
  },
  {
    value: "bearing",
    label: "方位交汇",
    icon: Navigation,
    description: "基于多台站方位角交会定位",
  },
  {
    value: "tdoa",
    label: "TDOA",
    icon: Radio,
    description: "基于到达时间差定位",
  },
  {
    value: "fused",
    label: "融合定位",
    icon: Target,
    description: "方位角+时间差联合反演",
  },
];

export const CHINA_BOUNDS = {
  minLat: 18,
  maxLat: 54,
  minLon: 73,
  maxLon: 135,
};

export const MAJOR_CITIES = [
  { name: "北京", lat: 39.9, lon: 116.4 },
  { name: "上海", lat: 31.2, lon: 121.5 },
  { name: "广州", lat: 23.1, lon: 113.3 },
  { name: "成都", lat: 30.7, lon: 104.1 },
  { name: "西安", lat: 34.3, lon: 109.0 },
  { name: "武汉", lat: 30.6, lon: 114.3 },
  { name: "兰州", lat: 36.1, lon: 103.8 },
  { name: "昆明", lat: 25.0, lon: 102.7 },
  { name: "哈尔滨", lat: 45.8, lon: 126.5 },
  { name: "乌鲁木齐", lat: 43.8, lon: 87.6 },
];

export const DEFAULT_STATIONS: StationConfig[] = [
  { device_id: "DDY-001", latitude_deg: 39.9, longitude_deg: 116.4, elevation_m: 43 },
  { device_id: "DDY-002", latitude_deg: 31.2, longitude_deg: 121.5, elevation_m: 4 },
  { device_id: "DDY-003", latitude_deg: 23.1, longitude_deg: 113.3, elevation_m: 11 },
  { device_id: "DDY-004", latitude_deg: 30.7, longitude_deg: 104.1, elevation_m: 500 },
];

export interface QuakeParams {
  magnitude: number;
  epicenterLat: number;
  epicenterLon: number;
  depthKm: number;
}
