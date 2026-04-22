'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PROJECTS, COLORS } from '@/lib/constants'
import { loadIdeasFromSupabase, loadContextsFromSupabase, calcKPIFromSupabase } from '@/lib/storage'

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical'
  activity: number
  lastUpdate: string
  ideaCount: number
  nextAction: string
}

export default function HealthPage() {
  const [healthData, setHealthData] = useState<Record<string, HealthStatus>>({})
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const data: Record<string, HealthStatus> = {}
    
    for (const project of PROJECTS) {
      try {
        // Supabase에서 데이터 로드
        const ideas    = await loadIdeasFromSupabase(project.id)
        const contexts = await loadContextsFromSupabase()
        const context  = contexts[project.id]
        const kpi      = await calcKPIFromSupabase(project.id)
        
        // activity는 KPI의 executionRate 사용
        const activity = kpi.executionRate
        let status: HealthStatus['status'] = 'critical'
        if (activity >= 70) status = 'healthy'
        else if (activity >= 40) status = 'warning'
        
        data[project.id] = {
          status,
          activity,
          lastUpdate: context?.updatedAt || new Date().toISOString(),
          ideaCount:  ideas.length,
          nextAction: context?.nextAction || '(없음)',
        }
      } catch (err) {
        console.error(`Failed to load health for ${project.id}:`, err)
        data[project.id] = { 
          status: 'critical', 
          activity: 0, 
          lastUpdate: new Date().toISOString(), 
          ideaCount: 0, 
          nextAction: '(없음)' 
        }
      }
    }
    
    setHealthData(data)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // 5초마다 자동 갱신
    const interval = setInterval(refresh, 5000)
    window.addEventListener('context-updated', refresh)
    window.addEventListener('schedule-updated', refresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('context-updated', refresh)
      window.removeEventListener('schedule-updated', refresh)
    }
  }, [])

  const statusColor = { healthy: COLORS.success, warning: COLORS.warning, critical: COLORS.danger }
  const statusLabel = { healthy: '정상', warning: '주의', critical: '위험' }

  return (
    <div className="page-shell">
      <header className="page-header">
        <Link href="/" className="back-link">← 홈</Link>
        <span className="page-title">🏥 프로젝트 헬스</span>
        <button onClick={refresh} disabled={loading} className={`btn-refresh ${loading ? 'btn-loading' : ''}`}>
          {loading ? '로딩...' : '새로고침'}
        </button>
      </header>
      <div className="page-body">
        {loading && healthData && Object.keys(healthData).length === 0 ? (
          <div className="loading-state">Supabase에서 데이터를 로드하는 중...</div>
        ) : (
          <div className="health-grid">
            {PROJECTS.map(project => {
              const h = healthData[project.id]
              if (!h) return null
              const color = statusColor[h.status]
              return (
                <div key={project.id} className="health-card" style={{ borderLeftColor: color }}>
                  <div className="health-header">
                    <span>{project.emoji}</span>
                    <span className="health-name">{project.name}</span>
                    <span className="health-status-badge" style={{ background: color + '22', color }}>{statusLabel[h.status]}</span>
                  </div>
                  <div className="health-bar-bg">
                    <div className="health-bar-fill" style={{ width: `${h.activity}%`, background: color }} />
                  </div>
                  <div className="health-stats">
                    <div className="health-stat"><span className="health-stat-num">{h.activity}%</span><span className="health-stat-label">실행률</span></div>
                    <div className="health-stat"><span className="health-stat-num">{h.ideaCount}</span><span className="health-stat-label">아이디어</span></div>
                  </div>
                  <div className="health-next">
                    <span className="health-next-label">다음 행동</span>
                    <span className="health-next-value">{h.nextAction}</span>
                  </div>
                  <div className="health-updated">업데이트: {new Date(h.lastUpdate).toLocaleDateString('ko-KR')}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <style>{`
        .page-shell { display: flex; flex-direction: column; min-height: 100dvh; background: ${COLORS.bg}; color: ${COLORS.text}; }
        .page-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid ${COLORS.border}; }
        .back-link { color: ${COLORS.accent}; text-decoration: none; font-size: 13px; }
        .page-title { font-size: 15px; font-weight: 700; flex: 1; }
        .btn-refresh { padding: 5px 12px; background: ${COLORS.surface}; color: ${COLORS.textSub}; border: 1px solid ${COLORS.border}; border-radius: 6px; cursor: pointer; font-size: 12px; transition: border-color 0.15s; }
        .btn-refresh:hover { border-color: ${COLORS.accent}; color: ${COLORS.accent}; }
        .btn-loading { opacity: 0.5; cursor: not-allowed; }
        .page-body { flex: 1; overflow-y: auto; padding: 16px; }
        .loading-state { display: flex; align-items: center; justify-content: center; height: 200px; color: ${COLORS.muted}; font-size: 13px; }
        .health-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
        .health-card { background: ${COLORS.surface}; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; border-left: 3px solid ${COLORS.border}; }
        .health-header { display: flex; align-items: center; gap: 8px; }
        .health-name { font-size: 13px; font-weight: 700; flex: 1; }
        .health-status-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 700; }
        .health-bar-bg { height: 6px; background: ${COLORS.border}; border-radius: 3px; overflow: hidden; }
        .health-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }
        .health-stats { display: flex; gap: 16px; }
        .health-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .health-stat-num { font-size: 16px; font-weight: 700; }
        .health-stat-label { font-size: 9px; color: ${COLORS.muted}; }
        .health-next { display: flex; flex-direction: column; gap: 2px; }
        .health-next-label { font-size: 10px; color: ${COLORS.muted}; }
        .health-next-value { font-size: 12px; color: ${COLORS.warning}; font-weight: 600; }
        .health-updated { font-size: 10px; color: ${COLORS.muted}; }
        @media (max-width: 480px) { .health-grid { grid-template-columns: 1fr; } .page-body { padding: 12px; } }
      `}</style>
    </div>
  )
}
