'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PROJECTS, COLORS } from '@/lib/constants'
import { calcKPI, KPIData } from '@/lib/storage'

export default function KPIPage() {
  const [kpiData, setKpiData] = useState<Record<string, KPIData>>({})

  const refresh = () => {
    const data: Record<string, KPIData> = {}
    PROJECTS.forEach(p => { data[p.id] = calcKPI(p.id) })
    setKpiData(data)
  }

  useEffect(() => {
    refresh()
    window.addEventListener('schedule-updated', refresh)
    window.addEventListener('context-updated', refresh)
    return () => {
      window.removeEventListener('schedule-updated', refresh)
      window.removeEventListener('context-updated', refresh)
    }
  }, [])

  const getColor = (rate: number) =>
    rate >= 80 ? COLORS.success : rate >= 60 ? COLORS.warning : rate >= 40 ? '#ff9d00' : COLORS.danger

  return (
    <div className="page-shell">
      <header className="page-header">
        <Link href="/" className="back-link">← 홈</Link>
        <span className="page-title">📈 KPI 대시보드</span>
        <button onClick={refresh} className="btn-refresh">새로고침</button>
      </header>
      <div className="page-body">
        <div className="kpi-grid">
          {PROJECTS.map(project => {
            const kpi = kpiData[project.id]
            if (!kpi) return null
            const color = getColor(kpi.executionRate)
            return (
              <div key={project.id} className="kpi-card" style={{ borderLeftColor: color }}>
                <div className="kpi-header">
                  <span>{project.emoji}</span>
                  <span className="kpi-name">{project.name}</span>
                  <span className="kpi-rate" style={{ color }}>{kpi.executionRate}%</span>
                </div>
                <div className="kpi-bar-bg">
                  <div className="kpi-bar-fill" style={{ width: `${kpi.executionRate}%`, background: color }} />
                </div>
                <div className="kpi-stats">
                  <div className="kpi-stat"><span className="kpi-stat-num">{kpi.ideaCount}</span><span className="kpi-stat-label">아이디어</span></div>
                  <div className="kpi-stat"><span className="kpi-stat-num" style={{ color: COLORS.success }}>{kpi.confirmedIdeas}</span><span className="kpi-stat-label">확정</span></div>
                  <div className="kpi-stat"><span className="kpi-stat-num">{kpi.scheduledCount}</span><span className="kpi-stat-label">일정</span></div>
                  <div className="kpi-stat"><span className="kpi-stat-num">{kpi.executedActions}</span><span className="kpi-stat-label">실행</span></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <style>{`
        .page-shell { display: flex; flex-direction: column; min-height: 100dvh; background: ${COLORS.bg}; color: ${COLORS.text}; }
        .page-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid ${COLORS.border}; }
        .back-link { color: ${COLORS.accent}; text-decoration: none; font-size: 13px; }
        .page-title { font-size: 15px; font-weight: 700; flex: 1; }
        .btn-refresh { padding: 5px 12px; background: ${COLORS.surface}; color: ${COLORS.textSub}; border: 1px solid ${COLORS.border}; border-radius: 6px; cursor: pointer; font-size: 12px; }
        .btn-refresh:hover { border-color: ${COLORS.accent}; color: ${COLORS.accent}; }
        .page-body { flex: 1; overflow-y: auto; padding: 16px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
        .kpi-card { background: ${COLORS.surface}; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; border-left: 3px solid ${COLORS.border}; }
        .kpi-header { display: flex; align-items: center; gap: 8px; }
        .kpi-name { font-size: 13px; font-weight: 700; flex: 1; }
        .kpi-rate { font-size: 18px; font-weight: 800; }
        .kpi-bar-bg { height: 6px; background: ${COLORS.border}; border-radius: 3px; overflow: hidden; }
        .kpi-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }
        .kpi-stats { display: flex; gap: 12px; }
        .kpi-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
        .kpi-stat-num { font-size: 16px; font-weight: 700; }
        .kpi-stat-label { font-size: 9px; color: ${COLORS.muted}; }
        @media (max-width: 480px) { .kpi-grid { grid-template-columns: 1fr; } .page-body { padding: 12px; } }
      `}</style>
    </div>
  )
}
