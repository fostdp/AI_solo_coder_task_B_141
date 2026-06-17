import { useState, useEffect, useCallback } from "react";
import { runMaterialAnalysis } from "@/lib/api";
import type {
  MaterialType,
  SiteSoilType,
  InstrumentType,
  MaterialAnalysisResult,
} from "@/types";
import type { PageStatus } from "../types";

export function useMaterialAnalysis() {
  const [referenceMaterial, setReferenceMaterial] = useState<MaterialType>("copper");
  const [testMaterials, setTestMaterials] = useState<MaterialType[]>(["copper", "iron", "wood", "steel"]);
  const [magnitude, setMagnitude] = useState(5.5);
  const [distance, setDistance] = useState(100);
  const [trials, setTrials] = useState(20);
  const [siteSoil, setSiteSoil] = useState<SiteSoilType>("II");
  const [instrument, setInstrument] = useState<InstrumentType>("didongyi");
  const [status, setStatus] = useState<PageStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MaterialAnalysisResult | null>(null);

  const toggleMaterial = (mat: MaterialType) => {
    setTestMaterials((prev) =>
      prev.includes(mat) ? prev.filter((m) => m !== mat) : [...prev, mat]
    );
  };

  const handleRunAnalysis = useCallback(async () => {
    if (testMaterials.length === 0) {
      setError("请至少选择一种测试材料");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const data = await runMaterialAnalysis({
        reference_material: referenceMaterial,
        test_materials: testMaterials,
        magnitude,
        distance,
        trials,
        site_soil: siteSoil,
        instrument,
      });
      setResult(data);
      setStatus("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析失败，请重试");
      setStatus("error");
    }
  }, [referenceMaterial, testMaterials, magnitude, distance, trials, siteSoil, instrument]);

  useEffect(() => {
    handleRunAnalysis();
  }, []);

  return {
    referenceMaterial,
    setReferenceMaterial,
    testMaterials,
    setTestMaterials,
    magnitude,
    setMagnitude,
    distance,
    setDistance,
    trials,
    setTrials,
    siteSoil,
    setSiteSoil,
    instrument,
    setInstrument,
    status,
    setStatus,
    error,
    setError,
    result,
    setResult,
    toggleMaterial,
    handleRunAnalysis,
  };
}
