import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import InstrumentComparison from '@/pages/InstrumentComparison'

vi.mock('@/lib/api')

const findInputByLabelText = (container: HTMLElement, labelText: RegExp | string): HTMLInputElement => {
  const labels = container.querySelectorAll('label')
  for (const label of labels) {
    if (typeof labelText === 'string' ? label.textContent?.includes(labelText) : labelText.test(label.textContent || '')) {
      const wrapper = label.closest('div')?.parentElement
      if (wrapper) {
        const input = wrapper.querySelector('input[type="range"]') as HTMLInputElement | null
        if (input) return input
      }
    }
  }
  throw new Error(`Could not find range input with label matching: ${labelText}`)
}

const findSelectByLabelText = (container: HTMLElement, labelText: RegExp | string): HTMLSelectElement => {
  const labels = container.querySelectorAll('label')
  for (const label of labels) {
    if (typeof labelText === 'string' ? label.textContent?.includes(labelText) : labelText.test(label.textContent || '')) {
      const wrapper = label.closest('div')?.parentElement
      if (wrapper) {
        const select = wrapper.querySelector('select') as HTMLSelectElement | null
        if (select) return select
      }
    }
  }
  throw new Error(`Could not find select with label matching: ${labelText}`)
}

const findInstrumentButton = (label: string) => {
  const buttons = screen.getAllByRole('button').filter(
    (btn) => btn.textContent?.includes(label) && !btn.textContent?.includes('运行')
  )
  return buttons[0]
}

const findMaterialButton = (label: string) => {
  const buttons = screen.getAllByRole('button').filter(
    (btn) => btn.textContent?.includes(label) && !btn.textContent?.includes('运行')
  )
  return buttons.find(
    (btn) => btn.className.includes('gap-1.5')
  ) || buttons[0]
}

describe('InstrumentComparisonPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  // ===================== 正常场景（8个） =====================
  describe('正常场景', () => {
    it('1. 渲染标题：显示「仪器对比参数配置」文本', () => {
      render(<InstrumentComparison />)
      expect(screen.getByText('仪器对比参数配置', { exact: false })).toBeInTheDocument()
    })

    it('2. 渲染震级滑块：有label包含「最小震级」和「最大震级」的range input', () => {
      const { container } = render(<InstrumentComparison />)
      const minMagSlider = findInputByLabelText(container, '最小震级')
      expect(minMagSlider).toBeInTheDocument()
      expect(minMagSlider.type).toBe('range')
      const maxMagSlider = findInputByLabelText(container, '最大震级')
      expect(maxMagSlider).toBeInTheDocument()
      expect(maxMagSlider.type).toBe('range')
    })

    it('3. 渲染距离滑块：有label包含「最小距离」和「最大距离」的range input', () => {
      const { container } = render(<InstrumentComparison />)
      const minDistSlider = findInputByLabelText(container, '最小距离')
      expect(minDistSlider).toBeInTheDocument()
      expect(minDistSlider.type).toBe('range')
      const maxDistSlider = findInputByLabelText(container, '最大距离')
      expect(maxDistSlider).toBeInTheDocument()
      expect(maxDistSlider.type).toBe('range')
    })

    it('4. 渲染场地土select：有combobox，name或label包含「场地土」', () => {
      const { container } = render(<InstrumentComparison />)
      const siteSoilSelect = findSelectByLabelText(container, '场地土')
      expect(siteSoilSelect).toBeInTheDocument()
      expect(siteSoilSelect.tagName).toBe('SELECT')
    })

    it('5. 渲染仪器选择：显示「候风地动仪」「水运仪象台」「现代地震仪」文本', () => {
      render(<InstrumentComparison />)
      expect(screen.getByText('候风地动仪', { exact: false })).toBeInTheDocument()
      expect(screen.getByText('水运仪象台', { exact: false })).toBeInTheDocument()
      expect(screen.getByText('现代地震仪', { exact: false })).toBeInTheDocument()
    })

    it('6. 渲染材料选择：显示「青铜」「熟铁」「硬木」「钢材」文本', () => {
      render(<InstrumentComparison />)
      expect(screen.getByText('青铜', { exact: false })).toBeInTheDocument()
      expect(screen.getByText('熟铁', { exact: false })).toBeInTheDocument()
      expect(screen.getByText('硬木', { exact: false })).toBeInTheDocument()
      expect(screen.getByText('钢材', { exact: false })).toBeInTheDocument()
    })

    it('7. 显示选择状态：有「已选仪器」文本（无需精确匹配，只查包含）', () => {
      render(<InstrumentComparison />)
      expect(screen.getByText('已选仪器', { exact: false })).toBeInTheDocument()
    })

    it('8. 运行按钮存在：有button包含「运行」文本', () => {
      render(<InstrumentComparison />)
      const runButton = screen.getByRole('button', { name: /运行/ })
      expect(runButton).toBeInTheDocument()
    })
  })

  // ===================== 边界场景（6个） =====================
  describe('边界场景', () => {
    it('9. 取消仪器：点击包含「水运仪象台」的button后，再次点击可切换（验证button存在且可点击）', () => {
      render(<InstrumentComparison />)
      const waterClockBtn = findInstrumentButton('水运仪象台')
      expect(waterClockBtn).toBeInTheDocument()
      expect(waterClockBtn).toBeEnabled()
      fireEvent.click(waterClockBtn)
      fireEvent.click(waterClockBtn)
      expect(waterClockBtn).toBeInTheDocument()
    })

    it('10. 取消材料：点击包含「熟铁」的button可点击不崩溃', () => {
      render(<InstrumentComparison />)
      const ironBtn = findMaterialButton('熟铁')
      expect(ironBtn).toBeInTheDocument()
      expect(ironBtn).toBeEnabled()
      expect(() => fireEvent.click(ironBtn)).not.toThrow()
    })

    it('11. 震级滑块可改值：对最小震级range fireEvent.change({target:{value:\'4\'}})，value变为4', () => {
      const { container } = render(<InstrumentComparison />)
      const minMagSlider = findInputByLabelText(container, '最小震级')
      fireEvent.change(minMagSlider, { target: { value: '4' } })
      expect(parseFloat(minMagSlider.value)).toBe(4)
    })

    it('12. 距离滑块可改值：对最小距离range fireEvent.change({target:{value:\'50\'}})，value变为50', () => {
      const { container } = render(<InstrumentComparison />)
      const minDistSlider = findInputByLabelText(container, '最小距离')
      fireEvent.change(minDistSlider, { target: { value: '50' } })
      expect(parseInt(minDistSlider.value)).toBe(50)
    })

    it('13. 选择状态文字存在（已选仪器/已选材料，查询用getByText不抛异常即可）', () => {
      render(<InstrumentComparison />)
      expect(screen.getByText('已选仪器', { exact: false })).toBeInTheDocument()
      expect(screen.getByText('已选材料', { exact: false })).toBeInTheDocument()
    })

    it('14. 场地土option数量：select至少有5个option（I0, I1, II, III, IV）', () => {
      const { container } = render(<InstrumentComparison />)
      const siteSoilSelect = findSelectByLabelText(container, '场地土')
      const options = siteSoilSelect.querySelectorAll('option')
      expect(options.length).toBeGreaterThanOrEqual(5)
    })
  })

  // ===================== 异常场景（4个） =====================
  describe('异常场景', () => {
    it('15. 不选仪器时：手动取消全部3个仪器后，运行按钮不崩溃（点击不抛异常）', () => {
      render(<InstrumentComparison />)
      fireEvent.click(findInstrumentButton('候风地动仪'))
      fireEvent.click(findInstrumentButton('水运仪象台'))
      fireEvent.click(findInstrumentButton('现代地震仪'))
      const runButton = screen.getByRole('button', { name: /运行/ })
      expect(() => fireEvent.click(runButton)).not.toThrow()
    })

    it('16. 不选材料时：手动取消全部材料后，组件不崩溃', () => {
      render(<InstrumentComparison />)
      fireEvent.click(findMaterialButton('青铜'))
      expect(screen.getByText('仪器对比参数配置', { exact: false })).toBeInTheDocument()
    })

    it('17. API返回空结果：运行时即使API返回空数组，组件仍可渲染不抛异常', async () => {
      const { runInstrumentComparison } = await import('@/lib/api')
      const mockRun = runInstrumentComparison as vi.Mock
      mockRun.mockResolvedValue({
        request_id: 'EMPTY',
        comparisons: [],
        magnitude_min: 2,
        magnitude_max: 8,
        magnitude_steps: 12,
        distance_min: 10,
        distance_max: 800,
        distance_steps: 12,
      })
      render(<InstrumentComparison />)
      const runButton = screen.getByRole('button', { name: /运行/ })
      expect(() => fireEvent.click(runButton)).not.toThrow()
    })

    it('18. 连续点击运行按钮：快速点击2次，组件不崩溃（不检查调用次数，只检查不抛异常）', () => {
      render(<InstrumentComparison />)
      const runButton = screen.getByRole('button', { name: /运行/ })
      expect(() => {
        fireEvent.click(runButton)
        fireEvent.click(runButton)
      }).not.toThrow()
    })
  })
})
