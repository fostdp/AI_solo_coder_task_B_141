import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import React from 'react'

class MockImageData {
  data: Uint8ClampedArray
  width: number
  height: number
  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.data = new Uint8ClampedArray(width * height * 4)
  }
}

const ResizeObserverMock = vi.fn().mockImplementation(function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }
})
vi.stubGlobal('ResizeObserver', ResizeObserverMock)

const IntersectionObserverMock = vi.fn().mockImplementation(function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }
})
vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)

vi.stubGlobal('ImageData', MockImageData as typeof ImageData)

vi.mock('three', () => ({
  Scene: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    children: [],
  })),
  PerspectiveCamera: vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
    lookAt: vi.fn(),
    aspect: 1,
    updateProjectionMatrix: vi.fn(),
  })),
  WebGLRenderer: vi.fn().mockImplementation(() => ({
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    render: vi.fn(),
    domElement: document.createElement('canvas'),
  })),
  Object3D: vi.fn().mockImplementation(() => ({
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    rotation: { set: vi.fn(), x: 0, y: 0, z: 0 },
    scale: { set: vi.fn(), x: 1, y: 1, z: 1 },
    add: vi.fn(),
    children: [],
  })),
  Mesh: vi.fn().mockImplementation(() => ({
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    rotation: { set: vi.fn(), x: 0, y: 0, z: 0 },
    scale: { set: vi.fn(), x: 1, y: 1, z: 1 },
    material: {},
    geometry: {},
  })),
  BoxGeometry: vi.fn(),
  SphereGeometry: vi.fn(),
  CylinderGeometry: vi.fn(),
  MeshStandardMaterial: vi.fn().mockImplementation(() => ({})),
  MeshBasicMaterial: vi.fn().mockImplementation(() => ({})),
  AmbientLight: vi.fn().mockImplementation(() => ({
    intensity: 1,
    position: { set: vi.fn() },
  })),
  DirectionalLight: vi.fn().mockImplementation(() => ({
    intensity: 1,
    position: { set: vi.fn() },
    castShadow: false,
  })),
  PointLight: vi.fn().mockImplementation(() => ({
    intensity: 1,
    position: { set: vi.fn() },
  })),
  Vector3: vi.fn().mockImplementation(() => ({
    x: 0, y: 0, z: 0,
    set: vi.fn().mockReturnThis(),
    normalize: vi.fn().mockReturnThis(),
    add: vi.fn().mockReturnThis(),
    sub: vi.fn().mockReturnThis(),
    multiplyScalar: vi.fn().mockReturnThis(),
    dot: vi.fn().mockReturnValue(0),
    length: vi.fn().mockReturnValue(0),
  })),
  Euler: vi.fn().mockImplementation(() => ({
    x: 0, y: 0, z: 0,
    set: vi.fn().mockReturnThis(),
  })),
  Color: vi.fn().mockImplementation(() => ({
    set: vi.fn().mockReturnThis(),
    setHex: vi.fn().mockReturnThis(),
  })),
  TextureLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockReturnValue({}),
  })),
  Clock: vi.fn().mockImplementation(() => ({
    getElapsedTime: vi.fn().mockReturnValue(0),
    getDelta: vi.fn().mockReturnValue(0.016),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  Group: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    children: [],
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    rotation: { set: vi.fn(), x: 0, y: 0, z: 0 },
  })),
  Line: vi.fn().mockImplementation(() => ({})),
  LineBasicMaterial: vi.fn().mockImplementation(() => ({})),
  BufferGeometry: vi.fn().mockImplementation(() => ({
    setFromPoints: vi.fn(),
    setAttribute: vi.fn(),
  })),
  BufferAttribute: vi.fn().mockImplementation(() => ({})),
  Float32BufferAttribute: vi.fn().mockImplementation(() => ({})),
  Matrix4: vi.fn().mockImplementation(() => ({
    makeRotationY: vi.fn().mockReturnThis(),
    multiply: vi.fn().mockReturnThis(),
  })),
  Quaternion: vi.fn().mockImplementation(() => ({
    setFromEuler: vi.fn().mockReturnThis(),
  })),
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: vi.fn().mockReturnValue({
    scene: {},
    camera: { position: { x: 0, y: 0, z: 0 } },
    gl: {},
  }),
}))

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Environment: () => <div data-testid="environment" />,
  Stars: () => <div data-testid="stars" />,
  Float: ({ children }: { children: React.ReactNode }) => <div data-testid="float">{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <div data-testid="text">{children}</div>,
  Html: ({ children }: { children: React.ReactNode }) => <div data-testid="html">{children}</div>,
  Sparkles: () => <div data-testid="sparkles" />,
  useHelper: vi.fn(),
  PerspectiveCamera: () => <div data-testid="perspective-camera" />,
}))

vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children }: { children: React.ReactNode }) => <div data-testid="effect-composer">{children}</div>,
  Bloom: () => <div data-testid="bloom" />,
  Vignette: () => <div data-testid="vignette" />,
}))

import type {
  SensorRecord,
  AlertItem,
  DragonStatus,
} from '@/types'
import { mockDragons, mockSensorRecord, mockAlerts } from './mockApi'

const DRAGON_DIRECTIONS = [
  { id: 0, direction: '北', angle: 0 },
  { id: 1, direction: '东北', angle: 45 },
  { id: 2, direction: '东', angle: 90 },
  { id: 3, direction: '东南', angle: 135 },
  { id: 4, direction: '南', angle: 180 },
  { id: 5, direction: '西南', angle: 225 },
  { id: 6, direction: '西', angle: 270 },
  { id: 7, direction: '西北', angle: 315 },
]

const mockStore = {
  deviceId: 'DDY-001',
  lastRecord: mockSensorRecord(),
  pillar: { displacement_x: 0, displacement_y: 0, angle: 0, angular_velocity: 0 },
  wave: { acceleration: 0, frequency: 0, amplitude: 0, history: [] },
  dragons: mockDragons(),
  alerts: [],
  toasts: [],
  wsConnected: false,
  waveHistory: Array(512).fill(0),
  angleHistory: [],
  pillarTrail: [],
  samples: [],
  isLive: false,
  isDemoMode: false,
  displacementX: 0,
  displacementY: 0,
  tiltAngle: 0,
  acceleration: 0,
  setIsLive: vi.fn(),
  setIsDemoMode: vi.fn(),
  setDisplacementX: vi.fn(),
  setDisplacementY: vi.fn(),
  setTiltAngle: vi.fn(),
  setAcceleration: vi.fn(),
  setDragons: vi.fn(),
  addPillarTrailPoint: vi.fn(),
  addSample: vi.fn(),
  updateFromRecord: vi.fn(),
  addWaveSample: vi.fn(),
  triggerDragon: vi.fn(),
  resetDragons: vi.fn(),
  pushAlert: vi.fn(),
  pushToast: vi.fn(),
  dismissToast: vi.fn(),
  setWsConnected: vi.fn(),
}

vi.mock('zustand')
vi.mock('@/store/realtimeStore', () => ({
  useRealtimeStore: vi.fn((selector: (state: typeof mockStore) => unknown) => selector(mockStore)),
  DRAGON_DIRECTIONS,
}))

import {
  mockComparisonResult,
  mockMaterialAnalysisResult,
  mockLocalizationResult,
  mockEarthquakeTriggerResult,
  mockInstruments,
  mockMaterials,
  mockSimulationResult,
  mockSensitivityResult,
} from './mockApi'

vi.mock('@/lib/api', () => ({
  BASE_URL: 'http://localhost:8080',
  postSensor: vi.fn(async (data: Partial<SensorRecord>): Promise<SensorRecord> => ({
    ...mockSensorRecord(data.device_id),
    ...data,
  })),
  getRealtime: vi.fn(async (deviceId?: string): Promise<SensorRecord> => mockSensorRecord(deviceId)),
  runSimulation: vi.fn(async () => mockSimulationResult()),
  runSensitivityAnalysis: vi.fn(async () => mockSensitivityResult()),
  getAlerts: vi.fn(async (limit?: number): Promise<AlertItem[]> => mockAlerts(limit)),
  getInstruments: vi.fn(async () => mockInstruments()),
  getMaterials: vi.fn(async () => mockMaterials()),
  runInstrumentComparison: vi.fn(async () => mockComparisonResult()),
  runMaterialAnalysis: vi.fn(async () => mockMaterialAnalysisResult()),
  runLocalization: vi.fn(async () => mockLocalizationResult()),
  triggerEarthquake: vi.fn(async () => mockEarthquakeTriggerResult()),
}))

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
  putImageData: vi.fn(),
  createImageData: vi.fn().mockReturnValue(new MockImageData(1, 1) as unknown as ImageData),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 10 }),
  strokeText: vi.fn(),
  strokeRect: vi.fn(),
  createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  setLineDash: vi.fn(),
  clip: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
}))
