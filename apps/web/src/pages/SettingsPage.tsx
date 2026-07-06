import { useState } from 'react'
import {
  DEFAULT_BOUNDARY_DATES,
  QUARTER_LABELS,
  type BoundaryAssignTo,
  type Quarter,
} from '@hzcd/strategy'
import ThemeSwitcher from '../components/ThemeSwitcher'
import {
  loadUserState,
  saveUserState,
  setBoundaryAssignment,
  setQuarterReimbursed,
} from '../lib/storage'

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4']

export default function SettingsPage() {
  const [state, setState] = useState(loadUserState)
  const year = new Date().getFullYear()

  function toggleQuarter(q: Quarter) {
    const reimbursed = !state.quarters[q].reimbursed
    setState(setQuarterReimbursed(state, q, reimbursed))
  }

  function assignBoundary(md: string, assignTo: BoundaryAssignTo) {
    const date = md === '01-01' ? `${year + 1}-${md}` : `${year}-${md}`
    setState(setBoundaryAssignment(state, date, assignTo))
  }

  function resetYear() {
    if (!confirm('确定重置本年度所有报销记录与边界日选择？')) return
    const next = {
      ...state,
      quarters: {
        Q1: { reimbursed: false },
        Q2: { reimbursed: false },
        Q3: { reimbursed: false },
        Q4: { reimbursed: false },
      },
      boundaryAssignments: [],
    }
    saveUserState(next)
    setState(next)
  }

  return (
    <div className="page settings-page">
      <header className="page-header">
        <h1>设置</h1>
      </header>

      <p className="group-label">外观</p>
      <div className="grouped-card">
        <div className="grouped-section theme-section">
          <p className="section-title in-card">主题</p>
          <p className="muted">默认跟随系统，可手动切换浅色或深色</p>
          <ThemeSwitcher />
        </div>
      </div>

      <p className="group-label">报销 · {year}</p>
      <div className="grouped-card">
        {QUARTERS.map((q) => (
          <div key={q} className="grouped-row">
            <span>{QUARTER_LABELS[q]}</span>
            <button
              type="button"
              className={state.quarters[q].reimbursed ? 'pill on' : 'pill'}
              onClick={() => toggleQuarter(q)}
            >
              {state.quarters[q].reimbursed ? '已报销' : '未报销'}
            </button>
          </div>
        ))}
      </div>

      <p className="group-label">边界日计入季度</p>
      <div className="grouped-card">
        <div className="grouped-section">
          <p className="muted">默认边界日：{DEFAULT_BOUNDARY_DATES.join('、')}</p>
          {DEFAULT_BOUNDARY_DATES.map((md) => {
            const date = md === '01-01' ? `${year + 1}-${md}` : `${year}-${md}`
            const current = state.boundaryAssignments.find((a) => a.date === date)
            const options: Array<{ label: string; value: BoundaryAssignTo }> =
              md === '01-01'
                ? [
                    { label: '计入 Q1', value: 'Q1' },
                    { label: '计入 Q4', value: 'Q4' },
                  ]
                : [
                    { label: '计入 Q3', value: 'Q3' },
                    { label: '计入 Q4', value: 'Q4' },
                  ]
            return (
              <div key={md} className="boundary-block">
                <p>{date}</p>
                <div className="segmented small">
                  {options.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className={current?.assignTo === o.value ? 'active' : ''}
                      onClick={() => assignBoundary(md, o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="group-label">PWA</p>
      <div className="grouped-card">
        <div className="grouped-section">
          <p className="section-title in-card">添加到主屏幕</p>
          <ol className="install-steps">
            <li>使用 iPhone Safari 打开本页</li>
            <li>点击底部分享按钮</li>
            <li>选择「添加到主屏幕」</li>
          </ol>
        </div>
      </div>

      <button type="button" className="danger-btn" onClick={resetYear}>
        重置本年度报销记录
      </button>
    </div>
  )
}
