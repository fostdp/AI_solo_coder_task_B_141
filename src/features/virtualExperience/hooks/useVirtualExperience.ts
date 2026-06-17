import { useState, useEffect, useRef, useCallback } from "react";
import { triggerEarthquake } from "@/lib/api";
import { useRealtimeStore } from "@/store/realtimeStore";
import { DIRECTION_NAMES, type EarthquakeTriggerRequest, type EarthquakeTriggerResult } from "@/types";

export function useVirtualExperience() {
  const {
    pillar,
    dragons,
    setDisplacementX,
    setDisplacementY,
    setTiltAngle,
    setAcceleration,
    triggerDragon,
    resetDragons,
    addWaveSample,
  } = useRealtimeStore();

  const [params, setParams] = useState<EarthquakeTriggerRequest>({
    magnitude: 5.5,
    distance: 100,
    duration: 30,
    instrument_type: "didongyi",
    material_type: "copper",
    earthquake_direction_deg: 90,
    site_soil: "II",
    pillar_mass: 500,
    pillar_height: 3.0,
    damping_ratio: 0.05,
    trigger_angle_threshold: 5.0,
  });

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const [triggeredDragon, setTriggeredDragon] = useState<number | null>(null);
  const [triggerTime, setTriggerTime] = useState<number | null>(null);
  const [waveData, setWaveData] = useState<number[]>(new Array(300).fill(0));
  const [currentAngle, setCurrentAngle] = useState(0);
  const [currentAngularVel, setCurrentAngularVel] = useState(0);
  const [ballDropAnimation, setBallDropAnimation] = useState(false);

  const animationRef = useRef<number | null>(null);
  const trajectoryRef = useRef<EarthquakeTriggerResult["trajectory"]>([]);
  const resultRef = useRef<EarthquakeTriggerResult | null>(null);
  const startTimeRef = useRef<number>(0);
  const waveHistoryRef = useRef<number[]>([]);

  const handleTrigger = useCallback(async () => {
    if (isTriggering || isPlaying) return;

    setIsTriggering(true);
    setProgress(0);
    setCurrentTime(0);
    setTriggered(false);
    setTriggeredDragon(null);
    setTriggerTime(null);
    setBallDropAnimation(false);
    resetDragons();
    waveHistoryRef.current = [];
    setWaveData(new Array(300).fill(0));

    try {
      const result = await triggerEarthquake(params);
      resultRef.current = result;
      trajectoryRef.current = result.trajectory;

      setIsTriggering(false);
      setIsPlaying(true);
      startTimeRef.current = performance.now();

      if (result.triggered) {
        setTimeout(() => {
          setBallDropAnimation(true);
        }, result.trigger.trigger_time * 1000 + 500);
      }

      const animate = () => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        const totalDuration = params.duration || 30;
        const progressPct = Math.min(100, (elapsed / totalDuration) * 100);

        setProgress(progressPct);
        setCurrentTime(Math.min(elapsed, totalDuration));

        if (trajectoryRef.current.length > 0) {
          const frameIndex = Math.min(
            Math.floor((elapsed / totalDuration) * trajectoryRef.current.length),
            trajectoryRef.current.length - 1
          );

          if (frameIndex >= 0 && frameIndex < trajectoryRef.current.length) {
            const frame = trajectoryRef.current[frameIndex];
            const angleX = frame.theta_x * (180 / Math.PI);
            const angleY = frame.theta_y * (180 / Math.PI);
            const totalAngle = Math.sqrt(angleX * angleX + angleY * angleY);
            const omegaX = frame.omega_x * (180 / Math.PI);
            const omegaY = frame.omega_y * (180 / Math.PI);
            const totalOmega = Math.sqrt(omegaX * omegaX + omegaY * omegaY);

            setCurrentAngle(totalAngle);
            setCurrentAngularVel(totalOmega);
            setDisplacementX(frame.theta_x * 10);
            setDisplacementY(frame.theta_y * 10);
            setTiltAngle(totalAngle);
            setAcceleration(frame.contact_force_x + frame.contact_force_y);

            const waveAcc = frame.omega_x * 10 + frame.omega_y * 10;
            waveHistoryRef.current.push(waveAcc);
            if (waveHistoryRef.current.length > 300) {
              waveHistoryRef.current.shift();
            }
            setWaveData([...waveHistoryRef.current]);
            addWaveSample(waveAcc);

            if (resultRef.current?.triggered && triggeredDragon === null) {
              const triggerT = resultRef.current.trigger.trigger_time;
              if (elapsed >= triggerT) {
                const dragonIdx = resultRef.current.trigger.dragon_index;
                setTriggered(true);
                setTriggeredDragon(dragonIdx);
                setTriggerTime(triggerT);
                triggerDragon(dragonIdx);
              }
            }
          }
        }

        if (elapsed < totalDuration) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsPlaying(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    } catch (error) {
      setIsTriggering(false);
      console.error("触发地震失败:", error);
    }
  }, [params, isTriggering, isPlaying, resetDragons, setDisplacementX, setDisplacementY, setTiltAngle, setAcceleration, addWaveSample, triggerDragon, triggeredDragon]);

  const handleReset = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsTriggering(false);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setTriggered(false);
    setTriggeredDragon(null);
    setTriggerTime(null);
    setBallDropAnimation(false);
    setCurrentAngle(0);
    setCurrentAngularVel(0);
    resetDragons();
    setDisplacementX(0);
    setDisplacementY(0);
    setTiltAngle(0);
    setAcceleration(0);
    waveHistoryRef.current = [];
    setWaveData(new Array(300).fill(0));
  }, [resetDragons, setDisplacementX, setDisplacementY, setTiltAngle, setAcceleration]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleDirectionClick = useCallback((index: number) => {
    if (isPlaying || isTriggering) return;
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    setParams({ ...params, earthquake_direction_deg: angles[index] });
  }, [params, isPlaying, isTriggering]);

  const handleAngleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPlaying || isTriggering) return;
    setParams({ ...params, earthquake_direction_deg: parseFloat(e.target.value) });
  }, [params, isPlaying, isTriggering]);

  return {
    pillar,
    dragons,
    params,
    setParams,
    advancedOpen,
    setAdvancedOpen,
    isTriggering,
    isPlaying,
    progress,
    currentTime,
    triggered,
    triggeredDragon,
    triggerTime,
    waveData,
    currentAngle,
    currentAngularVel,
    ballDropAnimation,
    handleTrigger,
    handleReset,
    handleDirectionClick,
    handleAngleChange,
    DIRECTION_NAMES,
  };
}
