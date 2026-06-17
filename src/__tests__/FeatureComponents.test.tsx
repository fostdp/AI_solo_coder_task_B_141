import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import React from 'react'
import { RocChart } from '@/features/instrumentComparison/components/RocChart'
import { MiniHeatmap } from '@/features/instrumentComparison/components/MiniHeatmap'
import { MaterialSummaryCard } from '@/features/materialAnalysis/components/MaterialSummaryCard'
import { MetricsTable } from '@/features/materialAnalysis/components/MetricsTable'
import { LocalizationMap } from '@/features/networkLocalization/components/LocalizationMap'
import { DirectionCompass } from '@/features/virtualExperience/components/DirectionCompass'
import { TriggerButton } from '@/features/virtualExperience/components/TriggerButton'
import type { RocChartItem } from '@/features/instrumentComparison/types'
import type { HeatmapCell, MaterialMetrics, StationConfig, StationReading, LocalizationResult } from '@/types'
import { CHINA_BOUNDS, MAJOR_CITIES } from '@/features/networkLocalization/types'
import type { QuakeParams } from '@/features/networkLocalization/types'

vi.mock('@/types', async () => {
  const actual = await vi.importActual<typeof import('@/types')>('@/types')
  return {
    ...actual,
    DIRECTION_NAMES: ['北', '东北', '东', '东南', '南', '西南', '西', '西北'],
  }
})

vi.mock('lucide-react', () => ({
  Zap: () => <span data-testid="zap-icon">⚡</span>,
  RotateCcw: () => <span data-testid="rotate-icon">↺</span>,
  Target: () => <span>🎯</span>,
  Navigation: () => <span>🧭</span>,
  Radio: () => <span>📡</span>,
  Layers: () => <span>📊</span>,
}))

const coordToSvg = (lat: number, lon: number, width: number, height: number) => {
  const x = ((lon - CHINA_BOUNDS.minLon) / (CHINA_BOUNDS.maxLon - CHINA_BOUNDS.minLon)) * width
  const y = ((CHINA_BOUNDS.maxLat - lat) / (CHINA_BOUNDS.maxLat - CHINA_BOUNDS.minLat)) * height
  return { x, y }
}

const createMockRocData = (): RocChartItem[] => [
  {
    key: 'didongyi-copper',
    instrument: 'didongyi',
    material: 'copper',
    label: '候风地动仪-青铜',
    color: '#D4AF37',
    roc: [
      { threshold: 0, tpr: 0, fpr: 0 },
      { threshold: 1, tpr: 0.6, fpr: 0.05 },
      { threshold: 2, tpr: 0.85, fpr: 0.1 },
      { threshold: 3, tpr: 0.95, fpr: 0.15 },
    ],
    optimalThreshold: 1.5,
    youdenJ: 0.7,
  },
  {
    key: 'modern-copper',
    instrument: 'modern_seismometer',
    material: 'copper',
    label: '现代地震仪-青铜',
    color: '#C23B22',
    roc: [
      { threshold: 0, tpr: 0, fpr: 0 },
      { threshold: 0.5, tpr: 0.8, fpr: 0.02 },
      { threshold: 1, tpr: 0.95, fpr: 0.05 },
      { threshold: 2, tpr: 0.99, fpr: 0.08 },
    ],
    optimalThreshold: 0.8,
    youdenJ: 0.9,
  },
]

const createMockHeatmapGrid = (): HeatmapCell[][] => {
  const grid: HeatmapCell[][] = []
  for (let r = 0; r < 3; r++) {
    const row: HeatmapCell[] = []
    for (let c = 0; c < 4; c++) {
      row.push({
        row: r,
        col: c,
        value: (r * 4 + c) / 11,
        magnitude: 2 + r * 2,
        distance: 10 + c * 200,
        detection_prob: 0.5,
        false_alarm_rate: 0.05,
        avg_trigger_time: 2.5,
      })
    }
    grid.push(row)
  }
  return grid
}

const createMockMaterialMetrics = (): MaterialMetrics[] => [
  {
    material: 'copper',
    material_name: '青铜',
    density_kgm3: 8960,
    youngs_modulus_pa: 110e9,
    damping_ratio: 0.05,
    yield_strength_pa: 70e6,
    cost_factor: 1.0,
    avg_trigger_time_sec: 2.5,
    trigger_time_std: 0.3,
    avg_max_angle_deg: 6.5,
    max_angle_std: 0.8,
    avg_peak_acceleration: 0.15,
    detection_probability: 0.75,
    false_alarm_rate: 0.08,
    response_ratio: 1.0,
    cost_efficiency: 0.75,
    trigger_times: [2.3, 2.6, 2.5, 2.4, 2.7],
    max_angles: [6.2, 6.8, 6.5, 6.3, 6.7],
  },
  {
    material: 'steel',
    material_name: '钢材',
    density_kgm3: 7850,
    youngs_modulus_pa: 206e9,
    damping_ratio: 0.02,
    yield_strength_pa: 350e6,
    cost_factor: 1.5,
    avg_trigger_time_sec: 1.8,
    trigger_time_std: 0.2,
    avg_max_angle_deg: 4.2,
    max_angle_std: 0.5,
    avg_peak_acceleration: 0.12,
    detection_probability: 0.9,
    false_alarm_rate: 0.03,
    response_ratio: 1.15,
    cost_efficiency: 0.6,
    trigger_times: [1.7, 1.9, 1.8, 1.75, 1.85],
    max_angles: [4.0, 4.4, 4.2, 4.1, 4.3],
  },
]

const createMockStations = (): StationConfig[] => [
  { device_id: 'DDY-001', latitude_deg: 39.9, longitude_deg: 116.4, elevation_m: 43 },
  { device_id: 'DDY-002', latitude_deg: 31.2, longitude_deg: 121.5, elevation_m: 4 },
  { device_id: 'DDY-003', latitude_deg: 23.1, longitude_deg: 113.3, elevation_m: 11 },
]

const createMockReadings = (): StationReading[] => [
  { device_id: 'DDY-001', trigger_time_sec: 1.2, azimuth_deg: 45, peak_acceleration: 0.2 },
  { device_id: 'DDY-003', trigger_time_sec: 2.1, azimuth_deg: 180, peak_acceleration: 0.15 },
]

const createMockLocalizationResult = (): LocalizationResult => ({
  status: 'ok',
  converged: true,
  valid_stations: 2,
  residual_mean: 5.2,
  residual_std: 2.1,
  best_estimate: {
    latitude_deg: 35.0,
    longitude_deg: 115.0,
    uncertainty_km: 25,
    confidence: 0.85,
    estimated_magnitude: 5.5,
    estimated_depth_km: 12,
    method: 'fused',
    error_ellipse: { major_axis_km: 30, minor_axis_km: 20, orientation_deg: 45 },
  },
  candidate_estimates: [
    {
      latitude_deg: 35.1,
      longitude_deg: 115.1,
      uncertainty_km: 35,
      confidence: 0.6,
      estimated_magnitude: 5.3,
      estimated_depth_km: 10,
      method: 'bearing',
      error_ellipse: { major_axis_km: 40, minor_axis_km: 28, orientation_deg: 30 },
    },
  ],
  stations: createMockStations(),
  readings: createMockReadings(),
})

const createMockQuakeParams = (): QuakeParams => ({
  magnitude: 5.5,
  epicenterLat: 35.0,
  epicenterLon: 115.0,
  depthKm: 10,
})

describe('FeatureComponents 功能组件测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  // ===================== instrumentComparison - RocChart =====================
  describe('instrumentComparison - RocChart', () => {
    it('1. 渲染SVG容器：包含viewBox属性的svg元素', () => {
      act(() => {
        render(<RocChart rocData={createMockRocData()} />)
      })
      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('viewBox')
    })

    it('2. 渲染坐标轴标签：显示「假阳性率 (FPR)」和「真阳性率 (TPR)」文本', () => {
      act(() => {
        render(<RocChart rocData={createMockRocData()} />)
      })
      expect(screen.getByText('假阳性率 (FPR)')).toBeInTheDocument()
      expect(screen.getByText('真阳性率 (TPR)')).toBeInTheDocument()
    })

    it('3. 渲染ROC曲线路径：每个数据项生成一条path元素', () => {
      const rocData = createMockRocData()
      act(() => {
        render(<RocChart rocData={rocData} />)
      })
      const paths = document.querySelectorAll('path[d]')
      expect(paths.length).toBeGreaterThanOrEqual(rocData.length)
    })

    it('4. 渲染最优阈值标记：包含最佳阈值的circle元素', () => {
      act(() => {
        render(<RocChart rocData={createMockRocData()} />)
      })
      const circles = document.querySelectorAll('circle')
      expect(circles.length).toBeGreaterThan(0)
    })

    it('5. 渲染网格刻度：显示0.0、0.4和1.0的刻度标签', () => {
      act(() => {
        render(<RocChart rocData={createMockRocData()} />)
      })
      expect(screen.getAllByText('0.0').length).toBeGreaterThan(0)
      expect(screen.getAllByText('0.4').length).toBeGreaterThan(0)
      expect(screen.getAllByText('1.0').length).toBeGreaterThan(0)
    })
  })

  // ===================== instrumentComparison - MiniHeatmap =====================
  describe('instrumentComparison - MiniHeatmap', () => {
    it('6. 渲染标题：显示传入的title文本', () => {
      const title = '候风地动仪-青铜 检测概率热力图'
      act(() => {
        render(<MiniHeatmap grid={createMockHeatmapGrid()} title={title} />)
      })
      expect(screen.getByText(title)).toBeInTheDocument()
    })

    it('7. 渲染网格：正确数量的单元格div', () => {
      const grid = createMockHeatmapGrid()
      const totalCells = grid.length * grid[0].length
      act(() => {
        render(<MiniHeatmap grid={grid} title="测试热力图" />)
      })
      const cells = document.querySelectorAll('.aspect-square')
      expect(cells.length).toBe(totalCells)
    })

    it('8. 低值颜色映射：value<0.33时使用深蓝-紫色系rgb', () => {
      const grid: HeatmapCell[][] = [[
        { row: 0, col: 0, value: 0.1, magnitude: 2, distance: 10, detection_prob: 0.5, false_alarm_rate: 0.05, avg_trigger_time: 2.5 },
      ]]
      act(() => {
        render(<MiniHeatmap grid={grid} title="低值测试" />)
      })
      const cell = document.querySelector('.aspect-square') as HTMLElement
      const bgColor = cell.style.backgroundColor
      expect(bgColor).toMatch(/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/)
      const rgbMatch = bgColor.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
      expect(rgbMatch).not.toBeNull()
      const r = parseInt(rgbMatch![1])
      const g = parseInt(rgbMatch![2])
      expect(r).toBeLessThan(140)
      expect(g).toBeLessThan(80)
    })

    it('9. 中值颜色映射：0.33<=value<0.66时使用金色系rgb', () => {
      const grid: HeatmapCell[][] = [[
        { row: 0, col: 0, value: 0.5, magnitude: 5, distance: 300, detection_prob: 0.7, false_alarm_rate: 0.05, avg_trigger_time: 2.0 },
      ]]
      act(() => {
        render(<MiniHeatmap grid={grid} title="中值测试" />)
      })
      const cell = document.querySelector('.aspect-square') as HTMLElement
      const bgColor = cell.style.backgroundColor
      const rgbMatch = bgColor.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
      expect(rgbMatch).not.toBeNull()
      const r = parseInt(rgbMatch![1])
      const g = parseInt(rgbMatch![2])
      expect(r).toBeGreaterThanOrEqual(135)
      expect(r).toBeLessThanOrEqual(212)
      expect(g).toBeGreaterThanOrEqual(72)
      expect(g).toBeLessThanOrEqual(175)
    })

    it('10. 高值颜色映射：value>=0.66时使用红铜色系rgb', () => {
      const grid: HeatmapCell[][] = [[
        { row: 0, col: 0, value: 0.9, magnitude: 7, distance: 100, detection_prob: 0.95, false_alarm_rate: 0.03, avg_trigger_time: 1.0 },
      ]]
      act(() => {
        render(<MiniHeatmap grid={grid} title="高值测试" />)
      })
      const cell = document.querySelector('.aspect-square') as HTMLElement
      const bgColor = cell.style.backgroundColor
      const rgbMatch = bgColor.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
      expect(rgbMatch).not.toBeNull()
      const r = parseInt(rgbMatch![1])
      const g = parseInt(rgbMatch![2])
      expect(r).toBeGreaterThanOrEqual(194)
      expect(r).toBeLessThanOrEqual(212)
    })
  })

  // ===================== materialAnalysis - MaterialSummaryCard =====================
  describe('materialAnalysis - MaterialSummaryCard', () => {
    it('11. 渲染材料名称和颜色点：显示材料标签和对应颜色的圆点', () => {
      const metrics = createMockMaterialMetrics()[0]
      act(() => {
        render(<MaterialSummaryCard metrics={metrics} isReference={false} />)
      })
      expect(screen.getByText('青铜')).toBeInTheDocument()
      const colorDot = document.querySelector('.rounded-full.w-3.h-3') as HTMLElement
      expect(colorDot).toBeInTheDocument()
      expect(colorDot.style.backgroundColor).toBe('rgb(212, 175, 55)')
    })

    it('12. 渲染指标：显示密度、检测概率、平均触发、成本效率文本', () => {
      const metrics = createMockMaterialMetrics()[0]
      act(() => {
        render(<MaterialSummaryCard metrics={metrics} isReference={false} />)
      })
      expect(screen.getByText('密度')).toBeInTheDocument()
      expect(screen.getByText('检测概率')).toBeInTheDocument()
      expect(screen.getByText('平均触发')).toBeInTheDocument()
      expect(screen.getByText('成本效率')).toBeInTheDocument()
    })

    it('13. 参考基准标记：isReference=true时显示「参考基准」标签', () => {
      const metrics = createMockMaterialMetrics()[0]
      act(() => {
        render(<MaterialSummaryCard metrics={metrics} isReference={true} />)
      })
      expect(screen.getByText('参考基准')).toBeInTheDocument()
    })

    it('14. 非参考基准：isReference=false时不显示「参考基准」标签', () => {
      const metrics = createMockMaterialMetrics()[0]
      act(() => {
        render(<MaterialSummaryCard metrics={metrics} isReference={false} />)
      })
      expect(screen.queryByText('参考基准')).not.toBeInTheDocument()
    })
  })

  // ===================== materialAnalysis - MetricsTable =====================
  describe('materialAnalysis - MetricsTable', () => {
    it('15. 渲染表头：包含「指标」列和材料名称列', () => {
      act(() => {
        render(<MetricsTable data={createMockMaterialMetrics()} />)
      })
      expect(screen.getByText('指标')).toBeInTheDocument()
      expect(screen.getByText('青铜')).toBeInTheDocument()
      expect(screen.getByText('钢材')).toBeInTheDocument()
    })

    it('16. 渲染数据行：包含密度、杨氏模量、阻尼比等指标行', () => {
      act(() => {
        render(<MetricsTable data={createMockMaterialMetrics()} />)
      })
      expect(screen.getByText(/密度/)).toBeInTheDocument()
      expect(screen.getByText(/杨氏模量/)).toBeInTheDocument()
      expect(screen.getByText(/阻尼比/)).toBeInTheDocument()
      expect(screen.getByText(/检测概率/)).toBeInTheDocument()
    })

    it('17. 最大值高亮：检测概率最高的材料值使用text-gold-400样式', () => {
      act(() => {
        render(<MetricsTable data={createMockMaterialMetrics()} />)
      })
      const goldCells = document.querySelectorAll('.text-gold-400')
      expect(goldCells.length).toBeGreaterThan(0)
    })
  })

  // ===================== networkLocalization - LocalizationMap =====================
  describe('networkLocalization - LocalizationMap', () => {
    it('18. 渲染SVG地图容器：包含台站、城市标记的svg', () => {
      act(() => {
        render(
          <LocalizationMap
            stations={createMockStations()}
            readings={[]}
            localizationResult={null}
            quakeParams={createMockQuakeParams()}
            coordToSvg={coordToSvg}
            width={700}
            height={500}
          />
        )
      })
      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('19. 渲染台站ID：显示DDY-001、DDY-002、DDY-003文本', () => {
      act(() => {
        render(
          <LocalizationMap
            stations={createMockStations()}
            readings={[]}
            localizationResult={null}
            quakeParams={createMockQuakeParams()}
            coordToSvg={coordToSvg}
            width={700}
            height={500}
          />
        )
      })
      expect(screen.getByText('DDY-001')).toBeInTheDocument()
      expect(screen.getByText('DDY-002')).toBeInTheDocument()
      expect(screen.getByText('DDY-003')).toBeInTheDocument()
    })

    it('20. 有读数的台站红色高亮：readings包含DDY-001时台站圆圈使用红色stroke', () => {
      act(() => {
        render(
          <LocalizationMap
            stations={createMockStations()}
            readings={createMockReadings()}
            localizationResult={null}
            quakeParams={createMockQuakeParams()}
            coordToSvg={coordToSvg}
            width={700}
            height={500}
          />
        )
      })
      const stationCircles = document.querySelectorAll('circle[r="10"]')
      expect(stationCircles.length).toBe(3)
      const redCircles = Array.from(stationCircles).filter(
        (c) => (c as SVGElement).getAttribute('stroke') === '#C23B22'
      )
      expect(redCircles.length).toBe(2)
    })

    it('21. 渲染图例：包含「台站」「震中估计」「方位线」文本', () => {
      act(() => {
        render(
          <LocalizationMap
            stations={createMockStations()}
            readings={createMockReadings()}
            localizationResult={createMockLocalizationResult()}
            quakeParams={createMockQuakeParams()}
            coordToSvg={coordToSvg}
            width={700}
            height={500}
          />
        )
      })
      expect(screen.getByText('台站')).toBeInTheDocument()
      expect(screen.getByText('震中估计')).toBeInTheDocument()
      expect(screen.getByText('方位线')).toBeInTheDocument()
    })
  })

  // ===================== virtualExperience - DirectionCompass =====================
  describe('virtualExperience - DirectionCompass', () => {
    it('22. 渲染8个方向按钮：北、东北、东、东南、南、西南、西、西北', () => {
      const onDirectionChange = vi.fn()
      act(() => {
        render(<DirectionCompass earthquakeDirection={0} onDirectionChange={onDirectionChange} />)
      })
      expect(screen.getByText('北')).toBeInTheDocument()
      expect(screen.getByText('东北')).toBeInTheDocument()
      expect(screen.getByText('东')).toBeInTheDocument()
      expect(screen.getByText('东南')).toBeInTheDocument()
      expect(screen.getByText('南')).toBeInTheDocument()
      expect(screen.getByText('西南')).toBeInTheDocument()
      expect(screen.getByText('西')).toBeInTheDocument()
      expect(screen.getByText('西北')).toBeInTheDocument()
    })

    it('23. 点击方向按钮：点击「东」触发onDirectionChange回调，参数为90', () => {
      const onDirectionChange = vi.fn()
      act(() => {
        render(<DirectionCompass earthquakeDirection={0} onDirectionChange={onDirectionChange} />)
      })
      const eastBtn = screen.getByText('东')
      act(() => {
        fireEvent.click(eastBtn)
      })
      expect(onDirectionChange).toHaveBeenCalledWith(90)
    })

    it('24. 选中状态样式：选中方向（北，angle=0）的按钮有bg-gold-500类', () => {
      const onDirectionChange = vi.fn()
      act(() => {
        render(<DirectionCompass earthquakeDirection={0} onDirectionChange={onDirectionChange} />)
      })
      const northBtn = screen.getByText('北')
      expect(northBtn.className).toContain('bg-gold-500')
    })

    it('25. 禁用状态：disabled=true时点击按钮不触发回调', () => {
      const onDirectionChange = vi.fn()
      act(() => {
        render(<DirectionCompass earthquakeDirection={0} onDirectionChange={onDirectionChange} disabled={true} />)
      })
      const eastBtn = screen.getByText('东')
      act(() => {
        fireEvent.click(eastBtn)
      })
      expect(onDirectionChange).not.toHaveBeenCalled()
    })

    it('26. 角度滑块：range input改变值时触发onDirectionChange', () => {
      const onDirectionChange = vi.fn()
      act(() => {
        render(<DirectionCompass earthquakeDirection={0} onDirectionChange={onDirectionChange} />)
      })
      const slider = document.querySelector('input[type="range"]') as HTMLInputElement
      expect(slider).toBeInTheDocument()
      act(() => {
        fireEvent.change(slider, { target: { value: '180' } })
      })
      expect(onDirectionChange).toHaveBeenCalledWith(180)
    })
  })

  // ===================== virtualExperience - TriggerButton =====================
  describe('virtualExperience - TriggerButton', () => {
    it('27. 默认状态文本：isTriggering=false, isPlaying=false时显示「触发地震」', () => {
      const onTrigger = vi.fn()
      const onReset = vi.fn()
      act(() => {
        render(<TriggerButton isTriggering={false} isPlaying={false} onTrigger={onTrigger} onReset={onReset} />)
      })
      expect(screen.getByText('触发地震')).toBeInTheDocument()
    })

    it('28. 计算中状态：isTriggering=true时显示「计算中...」', () => {
      const onTrigger = vi.fn()
      const onReset = vi.fn()
      act(() => {
        render(<TriggerButton isTriggering={true} isPlaying={false} onTrigger={onTrigger} onReset={onReset} />)
      })
      expect(screen.getByText('计算中...')).toBeInTheDocument()
    })

    it('29. 地震进行中状态：isPlaying=true时显示「地震进行中...」', () => {
      const onTrigger = vi.fn()
      const onReset = vi.fn()
      act(() => {
        render(<TriggerButton isTriggering={false} isPlaying={true} onTrigger={onTrigger} onReset={onReset} />)
      })
      expect(screen.getByText('地震进行中...')).toBeInTheDocument()
    })

    it('30. 触发按钮点击：点击触发按钮调用onTrigger回调', () => {
      const onTrigger = vi.fn()
      const onReset = vi.fn()
      act(() => {
        render(<TriggerButton isTriggering={false} isPlaying={false} onTrigger={onTrigger} onReset={onReset} />)
      })
      const triggerBtn = screen.getByText('触发地震')
      act(() => {
        fireEvent.click(triggerBtn)
      })
      expect(onTrigger).toHaveBeenCalledTimes(1)
    })

    it('31. 禁用状态：disabled=true时触发按钮被禁用', () => {
      const onTrigger = vi.fn()
      const onReset = vi.fn()
      act(() => {
        render(<TriggerButton isTriggering={false} isPlaying={false} onTrigger={onTrigger} onReset={onReset} disabled={true} />)
      })
      const triggerBtn = screen.getByText('触发地震')
      expect(triggerBtn).toBeDisabled()
    })

    it('32. 重置按钮：显示「重置」文本，点击调用onReset', () => {
      const onTrigger = vi.fn()
      const onReset = vi.fn()
      act(() => {
        render(<TriggerButton isTriggering={false} isPlaying={false} onTrigger={onTrigger} onReset={onReset} />)
      })
      const resetBtn = screen.getByText('重置')
      expect(resetBtn).toBeInTheDocument()
      act(() => {
        fireEvent.click(resetBtn)
      })
      expect(onReset).toHaveBeenCalledTimes(1)
    })
  })
})
