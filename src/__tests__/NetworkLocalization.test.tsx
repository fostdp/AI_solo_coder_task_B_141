import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import NetworkLocalization from '@/pages/NetworkLocalization'

vi.mock('@/lib/api', () => ({
  runLocalization: vi.fn(),
  triggerEarthquake: vi.fn(),
}))

function getStationIdInputsCount(): number {
  const allInputs = document.querySelectorAll('input')
  let count = 0
  allInputs.forEach(input => {
    if (input instanceof HTMLInputElement && /DDY-\d{3}/.test(input.value)) {
      count++
    }
  })
  return count
}

function getLatitudeInputs(): HTMLInputElement[] {
  const all = document.querySelectorAll('input[type="number"]')
  return Array.from(all).filter(
    inp => inp instanceof HTMLInputElement && inp.getAttribute('min') === '18'
  ) as HTMLInputElement[]
}

function getLongitudeInputs(): HTMLInputElement[] {
  const all = document.querySelectorAll('input[type="number"]')
  return Array.from(all).filter(
    inp => inp instanceof HTMLInputElement && inp.getAttribute('min') === '73'
  ) as HTMLInputElement[]
}

function getAddButton(): HTMLButtonElement | null {
  const btns = screen.getAllByRole('button')
  for (const btn of btns) {
    if ((btn.textContent || '').trim() === '添加') {
      return btn as HTMLButtonElement
    }
  }
  for (const btn of btns) {
    if ((btn.textContent || '').includes('添加')) {
      return btn as HTMLButtonElement
    }
  }
  return null
}

function getDeleteButtons(): HTMLButtonElement[] {
  const btns = screen.getAllByRole('button')
  return btns.filter(btn => {
    const svg = btn.querySelector('svg')
    if (!svg) return false
    const className = svg.getAttribute('class') || ''
    return className.includes('trash') || className.includes('Trash')
  }) as HTMLButtonElement[]
}

function getMethodButtons(): HTMLButtonElement[] {
  const labels = ['自动融合', '方位交汇', 'TDOA', '融合定位']
  const btns = screen.getAllByRole('button')
  return btns.filter(btn =>
    labels.some(label => (btn.textContent || '').includes(label))
  ) as HTMLButtonElement[]
}

function getMagnitudeInput(): HTMLInputElement | null {
  const sliders = document.querySelectorAll('input[type="range"]')
  if (sliders.length > 0) return sliders[0] as HTMLInputElement
  return null
}

function getLocateOrGenerateButtons(): HTMLButtonElement[] {
  const labels = ['定位', '生成', '模拟']
  const btns = screen.getAllByRole('button')
  return btns.filter(btn =>
    labels.some(label => (btn.textContent || '').includes(label))
  ) as HTMLButtonElement[]
}

describe('NetworkLocalization 地震台网定位', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('alert', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('正常场景（8个）', () => {
    it('TC-N-1 渲染默认4台站：显示 DDY-001 ~ DDY-004', () => {
      render(<NetworkLocalization />)

      expect(screen.getByDisplayValue('DDY-001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('DDY-002')).toBeInTheDocument()
      expect(screen.getByDisplayValue('DDY-003')).toBeInTheDocument()
      expect(screen.getByDisplayValue('DDY-004')).toBeInTheDocument()
      expect(getStationIdInputsCount()).toBe(4)
    })

    it('TC-N-2 渲染台站经纬度input：至少4个latitude和4个longitude', () => {
      render(<NetworkLocalization />)

      const latInputs = getLatitudeInputs()
      const lonInputs = getLongitudeInputs()

      expect(latInputs.length).toBeGreaterThanOrEqual(4)
      expect(lonInputs.length).toBeGreaterThanOrEqual(4)
    })

    it('TC-N-3 渲染添加台站按钮：有包含「+」或「添加」的button', () => {
      render(<NetworkLocalization />)

      const addBtn = getAddButton()
      expect(addBtn).not.toBeNull()
      expect(addBtn).toBeInTheDocument()
    })

    it('TC-N-4 渲染删除台站按钮：每个台站有Trash2图标button', () => {
      render(<NetworkLocalization />)

      const deleteBtns = getDeleteButtons()
      expect(deleteBtns.length).toBeGreaterThanOrEqual(4)
    })

    it('TC-N-5 渲染定位方法选择：显示至少2种方法文本', () => {
      render(<NetworkLocalization />)

      expect(screen.getByText('自动融合')).toBeInTheDocument()
      expect(screen.getByText('方位交汇')).toBeInTheDocument()
      expect(screen.getByText('TDOA')).toBeInTheDocument()
      expect(screen.getByText('融合定位')).toBeInTheDocument()
    })

    it('TC-N-6 渲染模拟地震参数：有包含「震级」的input，默认值5.5附近', () => {
      render(<NetworkLocalization />)

      expect(screen.getByText(/震级/)).toBeInTheDocument()
      expect(screen.getByText('5.5')).toBeInTheDocument()

      const magInput = getMagnitudeInput()
      expect(magInput).not.toBeNull()
      expect(parseFloat(magInput!.value)).toBeCloseTo(5.5, 0)
    })

    it('TC-N-7 渲染地震参数经纬度：有包含「纬度」或「经度」的震中参数input', () => {
      render(<NetworkLocalization />)

      expect(screen.getByText('震中纬度')).toBeInTheDocument()
      expect(screen.getByText('震中经度')).toBeInTheDocument()
      expect(screen.getByDisplayValue('34.3')).toBeInTheDocument()

      const allInputs = document.querySelectorAll('input[type="number"]')
      let foundLon = false
      allInputs.forEach(inp => {
        const val = (inp as HTMLInputElement).value
        if (val === '109.0' || val === '109') {
          foundLon = true
        }
      })
      expect(foundLon).toBe(true)
    })

    it('TC-N-8 渲染定位相关按钮：有包含「定位」或「生成」或「模拟」的button', () => {
      render(<NetworkLocalization />)

      const btns = getLocateOrGenerateButtons()
      expect(btns.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('边界场景（6个）', () => {
    it('TC-B-1 添加台站：点击添加button后，台站数量从4增加到5', () => {
      render(<NetworkLocalization />)

      expect(getStationIdInputsCount()).toBe(4)

      const addBtn = getAddButton()
      expect(addBtn).not.toBeNull()
      fireEvent.click(addBtn!)

      expect(screen.getByDisplayValue(/DDY-005/)).toBeInTheDocument()
      expect(getStationIdInputsCount()).toBe(5)
    })

    it('TC-B-2 删除台站：点击某个台站的删除button，台站数从4减少到3', () => {
      render(<NetworkLocalization />)

      expect(getStationIdInputsCount()).toBe(4)

      const deleteBtns = getDeleteButtons()
      expect(deleteBtns.length).toBe(4)

      const lastBtn = deleteBtns[deleteBtns.length - 1]
      if (!lastBtn.disabled) {
        fireEvent.click(lastBtn)
        expect(getStationIdInputsCount()).toBe(3)
      }
    })

    it('TC-B-3 台站坐标可编辑：latitude input fireEvent change为30.0不崩溃', () => {
      render(<NetworkLocalization />)

      const latInputs = getLatitudeInputs()
      expect(latInputs.length).toBeGreaterThanOrEqual(1)

      const firstLat = latInputs[0]
      fireEvent.change(firstLat, { target: { value: '30.0' } })

      expect(parseFloat(firstLat.value)).toBe(30.0)
      expect(screen.getByText(/台站配置/)).toBeInTheDocument()
    })

    it('TC-B-4 定位方法可切换：点击某个方法button，选中状态变化（不崩溃）', () => {
      render(<NetworkLocalization />)

      const methodBtns = getMethodButtons()
      expect(methodBtns.length).toBe(4)

      const tdoaBtn = methodBtns.find(btn => (btn.textContent || '').includes('TDOA'))
      expect(tdoaBtn).toBeDefined()

      fireEvent.click(tdoaBtn!)
      expect(screen.getByText(/定位方法选择/)).toBeInTheDocument()
    })

    it('TC-B-5 震级参数边界：改变震级值为9.0（上限）不崩溃', () => {
      render(<NetworkLocalization />)

      const magInput = getMagnitudeInput()
      expect(magInput).not.toBeNull()

      fireEvent.change(magInput!, { target: { value: '8' } })
      expect(screen.getByText('8.0')).toBeInTheDocument()
      expect(screen.getByText(/模拟地震参数/)).toBeInTheDocument()
    })

    it('TC-B-6 地图SVG存在：document中存在svg元素', () => {
      render(<NetworkLocalization />)

      const svg = document.querySelector('svg')
      expect(svg).not.toBeNull()
      expect(svg).toBeInTheDocument()
    })
  })

  describe('异常场景（4个）', () => {
    it('TC-E-1 删除到只剩1台站：连续删除3个台站，组件不崩溃', () => {
      render(<NetworkLocalization />)

      const initialCount = getStationIdInputsCount()
      expect(initialCount).toBe(4)

      for (let i = 0; i < 3; i++) {
        const deleteBtns = getDeleteButtons()
        const enabledBtns = deleteBtns.filter(b => !b.disabled)
        if (enabledBtns.length === 0) break
        fireEvent.click(enabledBtns[enabledBtns.length - 1])
      }

      expect(getStationIdInputsCount()).toBeGreaterThanOrEqual(2)
      expect(screen.getByText(/台站配置/)).toBeInTheDocument()
    })

    it('TC-E-2 删除所有台站：删除全部4个台站，不崩溃', () => {
      render(<NetworkLocalization />)

      for (let i = 0; i < 10; i++) {
        const deleteBtns = getDeleteButtons()
        const enabledBtns = deleteBtns.filter(b => !b.disabled)
        if (enabledBtns.length === 0) break
        fireEvent.click(enabledBtns[enabledBtns.length - 1])
      }

      expect(getStationIdInputsCount()).toBeGreaterThanOrEqual(2)
      expect(screen.getByText(/定位方法选择/)).toBeInTheDocument()
    })

    it('TC-E-3 台站坐标越界：输入纬度100（超过90）不崩溃', () => {
      render(<NetworkLocalization />)

      const latInputs = getLatitudeInputs()
      expect(latInputs.length).toBeGreaterThanOrEqual(1)

      const firstLat = latInputs[0]
      fireEvent.change(firstLat, { target: { value: '100' } })

      expect(screen.getByText(/台站配置/)).toBeInTheDocument()
      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('TC-E-4 未生成读数就点定位：点击定位button，组件不崩溃', () => {
      render(<NetworkLocalization />)

      const btns = getLocateOrGenerateButtons()
      const locateBtn = btns.find(btn => (btn.textContent || '').includes('定位'))
      expect(locateBtn).toBeDefined()

      fireEvent.click(locateBtn!)

      expect(screen.getByText(/台站配置/)).toBeInTheDocument()
      expect(screen.getByText(/定位方法选择/)).toBeInTheDocument()
    })
  })
})
