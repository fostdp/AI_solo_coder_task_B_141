import { useState, useMemo, useCallback } from "react";
import type {
  ComparisonRequest,
  ComparisonResult,
  InstrumentComparisonMetrics,
  InstrumentType,
  MaterialType,
  SiteSoilType,
  HeatmapCell,
} from "@/types";
import { INSTRUMENT_OPTIONS, MATERIAL_OPTIONS, SITE_SOIL_OPTIONS } from "@/types";
import { runInstrumentComparison } from "@/lib/api";
import {
  INSTRUMENT_COLORS,
  INSTRUMENT_LABELS,
  MATERIAL_LABELS,
  type RocChartItem,
} from "../types";

export function useInstrumentComparison() {
  const [magnitudeMin, setMagnitudeMin] = useState(2);
  const [magnitudeMax, setMagnitudeMax] = useState(8);
  const [distanceMin, setDistanceMin] = useState(10);
  const [distanceMax, setDistanceMax] = useState(800);
  const [siteSoil, setSiteSoil] = useState<SiteSoilType>("II");
  const [gridSteps, setGridSteps] = useState(12);
  const [monteCarloTrials, setMonteCarloTrials] = useState(100);

  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentType[]>([
    "didongyi",
    "water_clock_armillary",
    "modern_seismometer",
  ]);
  const [selectedMaterials, setSelectedMaterials] = useState<MaterialType[]>(["copper"]);

  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredMetric, setHoveredMetric] = useState<InstrumentComparisonMetrics | null>(null);

  const soilAmp = SITE_SOIL_OPTIONS.find((s) => s.value === siteSoil)?.amplification ?? 1.0;

  const toggleInstrument = (inst: InstrumentType) => {
    setSelectedInstruments((prev) =>
      prev.includes(inst) ? prev.filter((i) => i !== inst) : [...prev, inst]
    );
  };

  const toggleMaterial = (mat: MaterialType) => {
    setSelectedMaterials((prev) =>
      prev.includes(mat) ? prev.filter((m) => m !== mat) : [...prev, mat]
    );
  };

  const handleRunAnalysis = useCallback(async () => {
    if (selectedInstruments.length === 0 || selectedMaterials.length === 0) return;
    setLoading(true);
    try {
      const request: ComparisonRequest = {
        instruments: selectedInstruments,
        materials: selectedMaterials,
        magnitude_min: magnitudeMin,
        magnitude_max: magnitudeMax,
        magnitude_steps: gridSteps,
        distance_min: distanceMin,
        distance_max: distanceMax,
        distance_steps: gridSteps,
        monte_carlo_trials: monteCarloTrials,
        site_soil: siteSoil,
      };
      const data = await runInstrumentComparison(request);
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [
    selectedInstruments,
    selectedMaterials,
    magnitudeMin,
    magnitudeMax,
    distanceMin,
    distanceMax,
    gridSteps,
    monteCarloTrials,
    siteSoil,
  ]);

  const heatmapGrids = useMemo(() => {
    if (!result) return new Map<string, HeatmapCell[][]>();
    const grids = new Map<string, HeatmapCell[][]>();
    const { magnitude_steps, distance_steps } = result;

    for (const comp of result.comparisons) {
      const key = `${comp.instrument}-${comp.material}`;
      const grid: HeatmapCell[][] = [];
      for (let r = 0; r < distance_steps; r++) {
        const row: HeatmapCell[] = [];
        for (let c = 0; c < magnitude_steps; c++) {
          const idx = r * magnitude_steps + c;
          const cell = comp.heatmap[idx];
          if (cell) {
            row.push({
              row: r,
              col: c,
              label: cell.magnitude.toFixed(1),
              value: cell.detection_probability,
              magnitude: cell.magnitude,
              distance: cell.distance,
              detection_prob: cell.detection_probability,
              false_alarm_rate: cell.false_alarm_rate,
              avg_trigger_time: comp.avg_trigger_time_sec,
            });
          }
        }
        if (row.length > 0) grid.push(row);
      }
      grids.set(key, grid);
    }
    return grids;
  }, [result]);

  const rocData = useMemo<RocChartItem[]>(() => {
    if (!result) return [];
    return result.comparisons.map((comp) => ({
      key: `${comp.instrument}-${comp.material}`,
      instrument: comp.instrument,
      material: comp.material,
      label: `${INSTRUMENT_LABELS[comp.instrument]} · ${MATERIAL_LABELS[comp.material]}`,
      color: INSTRUMENT_COLORS[comp.instrument],
      roc: comp.roc_curve,
      optimalThreshold: comp.optimal_threshold,
      youdenJ: comp.youden_j,
    }));
  }, [result]);

  const distLabels = useMemo(() => {
    if (!result || !result.comparisons[0]) return [];
    const steps = result.distance_steps;
    const labels: number[] = [];
    for (let i = 0; i < steps; i += Math.max(1, Math.floor(steps / 5))) {
      const cell = result.comparisons[0].heatmap[i * result.magnitude_steps];
      if (cell) labels.push(cell.distance);
    }
    return labels;
  }, [result]);

  return {
    magnitudeMin,
    setMagnitudeMin,
    magnitudeMax,
    setMagnitudeMax,
    distanceMin,
    setDistanceMin,
    distanceMax,
    setDistanceMax,
    siteSoil,
    setSiteSoil,
    gridSteps,
    setGridSteps,
    monteCarloTrials,
    setMonteCarloTrials,
    selectedInstruments,
    setSelectedInstruments,
    selectedMaterials,
    setSelectedMaterials,
    result,
    setResult,
    loading,
    setLoading,
    hoveredMetric,
    setHoveredMetric,
    soilAmp,
    toggleInstrument,
    toggleMaterial,
    handleRunAnalysis,
    heatmapGrids,
    rocData,
    distLabels,
  };
}
