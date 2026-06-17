import type { MaterialType, MaterialMetrics } from "@/types";

export const MATERIAL_COLORS: Record<MaterialType, string> = {
  copper: "#D4AF37",
  iron: "#708090",
  wood: "#8B4513",
  steel: "#B0C4DE",
};

export const MATERIAL_LABELS: Record<MaterialType, string> = {
  copper: "青铜",
  iron: "熟铁",
  wood: "硬木",
  steel: "钢材",
};

export type PageStatus = "idle" | "loading" | "result" | "error";

export interface ChartColorsProps {
  colors: Record<MaterialType, string>;
}

export interface BoxplotChartProps extends ChartColorsProps {
  data: MaterialMetrics[];
  field: "trigger_times" | "max_angles";
  yLabel: string;
}

export interface BarChartWithErrorBarsProps extends ChartColorsProps {
  data: MaterialMetrics[];
  valueField: "avg_max_angle_deg" | "avg_trigger_time_sec";
  errorField: "max_angle_std" | "trigger_time_std";
  yLabel: string;
}

export interface ScatterPlotProps extends ChartColorsProps {
  data: MaterialMetrics[];
  xField: "false_alarm_rate";
  yField: "detection_probability";
  xLabel: string;
  yLabel: string;
}

export interface RadarChartProps extends ChartColorsProps {
  data: MaterialMetrics[];
  referenceMaterial: MaterialType;
}

export interface MaterialSummaryCardProps {
  metrics: MaterialMetrics;
  isReference: boolean;
}

export interface MetricsTableProps {
  data: MaterialMetrics[];
}

export interface DetailedDataTableProps {
  data: MaterialMetrics[];
}
