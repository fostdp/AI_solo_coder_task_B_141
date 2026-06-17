import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import MaterialAnalysis from '@/pages/MaterialAnalysis'
import { runMaterialAnalysis } from '@/lib/api'

vi.mock('@/lib/api')

const mockRunMaterialAnalysis = runMaterialAnalysis as vi.Mock

const findSelectByLabel = (labelText: string): HTMLSelectElement | null => {
  const labels = document.querySelectorAll('label')
  for (const label of labels) {
    if ((label.textContent || '').includes(labelText)) {
      const parent = label.closest('div')
      const select = parent?.querySelector('select')
      if (select) return select as HTMLSelectElement
    }
  }
  return null
}

const findInputByLabel = (labelText: string): HTMLInputElement | null => {
  const labels = document.querySelectorAll('label')
  for (const label of labels) {
    if ((label.textContent || '').includes(labelText)) {
      const parent = label.closest('div')
      const input = parent?.querySelector('input')
      if (input) return input as HTMLInputElement
    }
  }
  return null
}

const getMaterialButtons = (): HTMLButtonElement[] => {
  const materialLabels = ['青铜', '熟铁', '硬木', '钢材']
  return screen.getAllByRole('button').filter(btn =>
    materialLabels.some(label => btn.textContent?.includes(label))
  ) as HTMLButtonElement[]
}

describe('MaterialAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRunMaterialAnalysis.mockResolvedValue({
      request_id: 'TEST-001',
      reference_material: 'copper',
      material_metrics: [],
      magnitude: 5.5,
      distance: 100,
      trials: 20,
    })
  })

  afterEach(() => {
    cleanup()
  })

  describe('正常场景', () => {
    it('渲染标题：显示材料分析参数配置或材料响应对比', () => {
      render(<MaterialAnalysis />)
      expect(
        screen.getByText('材料分析参数配置', { exact: false }) ||
        screen.getByText('都柱材料响应对比分析', { exact: false })
      ).toBeInTheDocument()
    })

    it('渲染参考材料select：有label包含参考材料', () => {
      render(<MaterialAnalysis />)
      const select = findSelectByLabel('参考材料')
      expect(select).not.toBeNull()
      expect(select!.tagName).toBe('SELECT')
    })

    it('渲染震级input：有number，label包含震级', () => {
      render(<MaterialAnalysis />)
      const input = findInputByLabel('震级')
      expect(input).not.toBeNull()
      expect(input!.type).toBe('number')
    })

    it('渲染震中距input：有number，label包含震中距', () => {
      render(<MaterialAnalysis />)
      const input = findInputByLabel('震中距')
      expect(input).not.toBeNull()
      expect(input!.type).toBe('number')
    })

    it('渲染试验次数input：有label包含试验', () => {
      render(<MaterialAnalysis />)
      const input = findInputByLabel('试验')
      expect(input).not.toBeNull()
      expect(input!.type).toBe('number')
    })

    it('渲染场地土select：有label包含场地土', () => {
      render(<MaterialAnalysis />)
      const select = findSelectByLabel('场地土')
      expect(select).not.toBeNull()
      expect(select!.tagName).toBe('SELECT')
    })

    it('渲染仪器类型select：有label包含仪器类型', () => {
      render(<MaterialAnalysis />)
      const select = findSelectByLabel('仪器类型')
      expect(select).not.toBeNull()
      expect(select!.tagName).toBe('SELECT')
    })

    it('4种材料显示：显示青铜熟铁硬木钢材', () => {
      render(<MaterialAnalysis />)
      const buttons = getMaterialButtons()
      expect(buttons.length).toBe(4)
      const buttonTexts = buttons.map(b => b.textContent || '')
      expect(buttonTexts.some(t => t.includes('青铜'))).toBe(true)
      expect(buttonTexts.some(t => t.includes('熟铁'))).toBe(true)
      expect(buttonTexts.some(t => t.includes('硬木'))).toBe(true)
      expect(buttonTexts.some(t => t.includes('钢材'))).toBe(true)
    })
  })

  describe('边界场景', () => {
    it('参考材料可切换：select value是copper，改变不崩溃', () => {
      render(<MaterialAnalysis />)
      const select = findSelectByLabel('参考材料')
      expect(select).not.toBeNull()
      expect(select!.value).toBe('copper')
      expect(() => {
        fireEvent.change(select!, { target: { value: 'iron' } })
      }).not.toThrow()
      expect(select!.value).toBe('iron')
    })

    it('震级input可改变值：change为6.5', () => {
      render(<MaterialAnalysis />)
      const input = findInputByLabel('震级')
      expect(input).not.toBeNull()
      fireEvent.change(input!, { target: { value: '6.5' } })
      expect(parseFloat(input!.value)).toBe(6.5)
    })

    it('距离input可改变值：change为500', () => {
      render(<MaterialAnalysis />)
      const input = findInputByLabel('震中距')
      expect(input).not.toBeNull()
      fireEvent.change(input!, { target: { value: '500' } })
      expect(parseFloat(input!.value)).toBe(500)
    })

    it('试验次数边界：改变值为100，不崩溃', () => {
      render(<MaterialAnalysis />)
      const input = findInputByLabel('试验')
      expect(input).not.toBeNull()
      expect(() => {
        fireEvent.change(input!, { target: { value: '100' } })
      }).not.toThrow()
      expect(parseInt(input!.value)).toBe(100)
    })

    it('场地土option至少有5个', () => {
      render(<MaterialAnalysis />)
      const select = findSelectByLabel('场地土')
      expect(select).not.toBeNull()
      expect(select!.options.length).toBeGreaterThanOrEqual(5)
      const optionValues = Array.from(select!.options).map(o => o.value)
      expect(optionValues).toContain('I0')
      expect(optionValues).toContain('I1')
      expect(optionValues).toContain('II')
      expect(optionValues).toContain('III')
      expect(optionValues).toContain('IV')
    })

    it('仪器类型option至少有3个', () => {
      render(<MaterialAnalysis />)
      const select = findSelectByLabel('仪器类型')
      expect(select).not.toBeNull()
      expect(select!.options.length).toBeGreaterThanOrEqual(3)
      const optionTexts = Array.from(select!.options).map(o => o.textContent || '')
      const hasDidongyi = optionTexts.some(t => t.includes('候风地动仪'))
      const hasWaterClock = optionTexts.some(t => t.includes('水运仪象台'))
      const hasModern = optionTexts.some(t => t.includes('现代地震仪'))
      expect(hasDidongyi || hasWaterClock || hasModern).toBe(true)
    })
  })

  describe('异常场景', () => {
    it('取消全部材料：点击取消所有4种材料后，组件不崩溃', () => {
      render(<MaterialAnalysis />)
      const buttons = getMaterialButtons()
      expect(buttons.length).toBe(4)
      expect(() => {
        buttons.forEach(btn => {
          fireEvent.click(btn)
        })
      }).not.toThrow()
      const container = document.querySelector('.space-y-5')
      expect(container).toBeInTheDocument()
    })

    it('API reject时不崩溃：组件不白屏', () => {
      mockRunMaterialAnalysis.mockRejectedValue(new Error('API error'))
      expect(() => {
        render(<MaterialAnalysis />)
      }).not.toThrow()
      const container = document.querySelector('.space-y-5')
      expect(container).toBeInTheDocument()
    })

    it('输入非法数字：震级input输入abc不抛异常', () => {
      render(<MaterialAnalysis />)
      const input = findInputByLabel('震级')
      expect(input).not.toBeNull()
      expect(() => {
        fireEvent.change(input!, { target: { value: 'abc' } })
      }).not.toThrow()
    })

    it('加载状态下操作：切换select不崩溃', () => {
      let resolveApi: ((value: unknown) => void) | null = null
      mockRunMaterialAnalysis.mockImplementation(
        () => new Promise(resolve => { resolveApi = resolve })
      )
      render(<MaterialAnalysis />)
      const select = findSelectByLabel('参考材料')
      expect(select).not.toBeNull()
      expect(() => {
        fireEvent.change(select!, { target: { value: 'steel' } })
      }).not.toThrow()
      if (resolveApi) {
        resolveApi({
          request_id: 'TEST-001',
          reference_material: 'steel',
          material_metrics: [],
          magnitude: 5.5,
          distance: 100,
          trials: 20,
        })
      }
    })
  })
})
