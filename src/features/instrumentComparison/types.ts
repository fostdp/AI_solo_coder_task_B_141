import type {
  InstrumentType,
  MaterialType,
  ROCPoint,
  HeatmapCell,
} from "@/types";

export const INSTRUMENT_COLORS: Record<InstrumentType, string> = {
  didongyi: "#D4AF37",
  water_clock_armillary: "#B87333",
  modern_seismometer: "#C23B22",
};

export const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  didongyi: "候风地动仪",
  water_clock_armillary: "水运仪象台",
  modern_seismometer: "现代地震仪",
};

export const MATERIAL_LABELS: Record<MaterialType, string> = {
  copper: "青铜",
  iron: "熟铁",
  wood: "硬木",
  steel: "钢材",
};

export interface RocChartItem {
  key: string;
  instrument: InstrumentType;
  material: MaterialType;
  label: string;
  color: string;
  roc: ROCPoint[];
  optimalThreshold: number;
  youdenJ: number;
}

export interface MiniHeatmapProps {
  grid: HeatmapCell[][];
  title: string;
}

export interface RocChartProps {
  rocData: RocChartItem[];
}
