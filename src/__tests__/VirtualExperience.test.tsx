import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import VirtualExperience from '@/pages/VirtualExperience'

vi.mock('@/lib/api', () => ({ triggerEarthquake: vi.fn() }))

vi.mock('@/types', async () => {
  const actual = await vi.importActual<typeof import('@/types')>('@/types')
  return {
    ...actual,
    DIRECTION_NAMES: ['北', '东北', '东', '东南', '南', '西南', '西', '西北'],
  }
})

vi.mock('@/store/realtimeStore', () => ({
  useRealtimeStore: vi.fn((selector?: any) => {
    const dirNames = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
    const state = {
      pillar: { displacement_x: 0, displacement_y: 0, angle: 0, angular_velocity: 0 },
      dragons: dirNames.map((name, i) => ({ id: i, direction: name, triggered: false, ball_dropped: false })),
      setDisplacementX: vi.fn(),
      setDisplacementY: vi.fn(),
      setTiltAngle: vi.fn(),
      setAcceleration: vi.fn(),
      triggerDragon: vi.fn(),
      resetDragons: vi.fn(),
      addWaveSample: vi.fn(),
    }
    return typeof selector === 'function' ? selector(state) : state
  })
}))

vi.mock('@/components/Didongyi3D/SceneCanvas', () => ({
  default: vi.fn(() => <div data-testid="r3f-canvas" />),
}))

vi.mock('@/components/Visuals/SeismicWaveform', () => ({
  default: vi.fn(() => <div data-testid="seismic-waveform-container"><span>地震波</span></div>),
}))

const findSliderByRange = (min: string, max: string): HTMLInputElement | null => {
  const sliders = document.querySelectorAll('input[type="range"]')
  for (const s of sliders) {
    if (s.getAttribute('min') === min && s.getAttribute('max') === max) {
      return s as HTMLInputElement
    }
  }
  return null
}

const findSelects = (): HTMLSelectElement[] => {
  return Array.from(document.querySelectorAll('select')) as HTMLSelectElement[]
}

const textContentContains = (pattern: RegExp): boolean => {
  return pattern.test(document.body.textContent || '')
}

describe('VirtualExperience 虚拟体验页面', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    window.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('正常场景（Normal）', () => {
    it('TC-N-1 渲染主标题：包含「候风地动仪虚拟体验」', () => {
      render(<VirtualExperience />)
      expect(textContentContains(/候风地动仪虚拟体验|虚拟体验/)).toBe(true)
      const h1 = document.querySelector('h1')
      expect(h1).not.toBeNull()
    })

    it('TC-N-2 渲染教育说明文字：包含「触发地震」/「千年神器」/「张衡」', () => {
      render(<VirtualExperience />)
      expect(textContentContains(/触发地震|千年神器|张衡/)).toBe(true)
    })

    it('TC-N-3 渲染震级滑块：默认值5.5', () => {
      render(<VirtualExperience />)
      const magnitudeSlider = findSliderByRange('1', '10')
      expect(magnitudeSlider).not.toBeNull()
      expect(parseFloat(magnitudeSlider!.value)).toBeCloseTo(5.5, 0)
      expect(textContentContains(/震级/)).toBe(true)
    })

    it('TC-N-4 渲染震中距滑块：label包含「距离」或「震中距」', () => {
      render(<VirtualExperience />)
      const distanceSlider = findSliderByRange('10', '1000')
      expect(distanceSlider).not.toBeNull()
      expect(textContentContains(/震中距|距离/)).toBe(true)
    })

    it('TC-N-5 渲染持续时间滑块：label包含「持续时间」', () => {
      render(<VirtualExperience />)
      const durationSlider = findSliderByRange('5', '120')
      expect(durationSlider).not.toBeNull()
      expect(textContentContains(/持续时间/)).toBe(true)
    })

    it('TC-N-6 渲染8个方向选择：显示「北」「东」「南」「西」至少4个方向', () => {
      render(<VirtualExperience />)
      const directions = ['北', '东', '南', '西']
      directions.forEach(dir => {
        expect(textContentContains(new RegExp(dir))).toBe(true)
      })
    })

    it('TC-N-7 渲染仪器类型select：有label包含「仪器」或「类型」', () => {
      render(<VirtualExperience />)
      const selects = findSelects()
      expect(selects.length).toBeGreaterThanOrEqual(2)
      expect(textContentContains(/仪器/)).toBe(true)
    })

    it('TC-N-8 渲染材料select：有label包含「材料」', () => {
      render(<VirtualExperience />)
      const selects = findSelects()
      expect(selects.length).toBeGreaterThanOrEqual(2)
      expect(textContentContains(/材料/)).toBe(true)
    })
  })

  describe('边界场景（Boundary）', () => {
    it('TC-B-1 渲染触发地震大按钮：有button包含「触发」', () => {
      render(<VirtualExperience />)
      const buttons = screen.getAllByRole('button')
      const triggerBtn = buttons.find(btn => btn.textContent?.includes('触发'))
      expect(triggerBtn).toBeDefined()
      expect(triggerBtn).toBeInTheDocument()
    })

    it('TC-B-2 渲染重置button：有包含「重置」或「Reset」', () => {
      render(<VirtualExperience />)
      const buttons = screen.getAllByRole('button')
      const resetBtn = buttons.find(btn => /重置|Reset/.test(btn.textContent || ''))
      expect(resetBtn).toBeDefined()
      expect(resetBtn).toBeInTheDocument()
    })

    it('TC-B-3 渲染高级参数折叠：有包含「高级参数」的区域', () => {
      render(<VirtualExperience />)
      expect(textContentContains(/高级参数/)).toBe(true)
    })

    it('TC-B-4 震级边界值：滑块change到1.0（最小）不崩溃', () => {
      render(<VirtualExperience />)
      const magnitudeSlider = findSliderByRange('1', '10')
      expect(magnitudeSlider).not.toBeNull()
      expect(() => {
        fireEvent.change(magnitudeSlider!, { target: { value: '1.0' } })
      }).not.toThrow()
      expect(magnitudeSlider!.value).toBe('1')
    })

    it('TC-B-5 震级边界值：滑块change到10.0（最大）不崩溃', () => {
      render(<VirtualExperience />)
      const magnitudeSlider = findSliderByRange('1', '10')
      expect(magnitudeSlider).not.toBeNull()
      expect(() => {
        fireEvent.change(magnitudeSlider!, { target: { value: '10.0' } })
      }).not.toThrow()
      expect(magnitudeSlider!.value).toBe('10')
    })

    it('TC-B-6 方向切换：点击「北」方向button，不崩溃', () => {
      render(<VirtualExperience />)
      const buttons = screen.getAllByRole('button')
      const northBtn = buttons.find(btn => btn.textContent?.trim() === '北')
      expect(northBtn).toBeDefined()
      expect(() => {
        fireEvent.click(northBtn!)
      }).not.toThrow()
    })
  })

  describe('异常场景（Exception）', () => {
    it('TC-E-1 重复点击触发：连续点击触发button 2次，组件不崩溃', () => {
      render(<VirtualExperience />)
      const buttons = screen.getAllByRole('button')
      const triggerBtn = buttons.find(btn => btn.textContent?.includes('触发'))
      expect(triggerBtn).toBeDefined()
      expect(() => {
        fireEvent.click(triggerBtn!)
        fireEvent.click(triggerBtn!)
      }).not.toThrow()
    })

    it('TC-E-2 重置操作：点击重置button，状态复位不崩溃', () => {
      render(<VirtualExperience />)
      const buttons = screen.getAllByRole('button')
      const resetBtn = buttons.find(btn => /重置|Reset/.test(btn.textContent || ''))
      expect(resetBtn).toBeDefined()
      expect(() => {
        fireEvent.click(resetBtn!)
      }).not.toThrow()
    })

    it('TC-E-3 3D容器渲染：有data-testid=r3f-canvas的元素', () => {
      render(<VirtualExperience />)
      const canvas = screen.getByTestId('r3f-canvas')
      expect(canvas).toBeInTheDocument()
    })

    it('TC-E-4 波形区域渲染：有包含「波形」或「waveform」或「地震波」的区域', () => {
      render(<VirtualExperience />)
      const hasWaveform = screen.queryAllByText(/波形|waveform|地震波/).length > 0
      const hasWaveformContainer = screen.queryByTestId('seismic-waveform-container') !== null
      expect(hasWaveform || hasWaveformContainer).toBe(true)
    })
  })
})
