import type { EarthquakeTriggerRequest } from "@/types";

export const DIRECTION_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

export interface VirtualExperienceState {
  params: EarthquakeTriggerRequest;
  advancedOpen: boolean;
  isTriggering: boolean;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  triggered: boolean;
  triggeredDragon: number | null;
  triggerTime: number | null;
  waveData: number[];
  currentAngle: number;
  currentAngularVel: number;
  ballDropAnimation: boolean;
}

export interface DirectionCompassProps {
  earthquakeDirection: number;
  onDirectionChange: (deg: number) => void;
  disabled?: boolean;
}

export interface TriggerButtonProps {
  isTriggering: boolean;
  isPlaying: boolean;
  onTrigger: () => void;
  onReset: () => void;
  disabled?: boolean;
}
