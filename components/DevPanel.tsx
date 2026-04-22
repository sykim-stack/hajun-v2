'use client'
import { useState, useEffect } from 'react'
import { PROJECTS, COLORS } from '@/lib/constants'
import { loadIdeas, loadContexts, loadSchedules } from '@/lib/storage'

interface LogEntry {
  time: string
  level: 'info' | 'warn' | 'error'
  msg: string
}

export default function DevPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<Record<string, { ideas: number; schedules: number; hasContext: boolean }>>({})

  useEffect(() => {
    // 초기 상태 수집
    const s: typeof stats = {}
    PROJECTS.forEach(p => {
      const ideas     = loadIdeas(p.id)
      const schedules = loadSchedules(p.id)
      const contexts  = loadContexts()
      s[p.id] = {
        ideas:      ideas.length,
        schedules:  schedules.length,
        hasContext: !!contexts[p.id]?.summary,
      }
    })
    setStats(s)

    // 초기 로그
    addLog('info', 'Dev 모드 초기화 완료')
    addLog('info', `localStorage 키 수: ${Object.keys(localStorage).length}개`)

    // 이벤트 리스너
    const onCtxUpdate = (e: Event) => {
      const { projectId } = (e as CustomEvent).detail
      addLog('info', `[Context] ${PROJECTS.find(p => p.id === projectId)?.name} next_action 업데이트됨`)
    }
    const onSchUpdate = (e: Event) => {
      const { projectId } = (e as CustomEvent).detail
      addLog('info', `[Schedule] ${PROJECTS.find(p => p.id === projectId)?.name} 일정 변경 → KPI 재계산`)
    }
    window.addEventListener('context-updated', onCtxUpdate)
    window.addEventListener('schedule-updated', onSchUpdate)
    return () => {
      window.removeEventListener('context-updated', onCtxUpdate)
      window.removeEventListener('schedule-updated', onSchUpdate)
    }
  }, [])

  function addLog(level: LogEntry['level'], msg: string) {
    setLogs(prev => [
      { time: new Date().toLocaleTimeString('ko-KR'), level, msg },
      ...prev.slice(0, 49),
    ])
  }

  const levelColor = { info: COLORS.success, warn: COLORS.warning, error: COLORS.danger }

  return (
    <div className="dev-panel">
      {/* ─── 상태 요약 ─── */}
      <section className="dev-section">
        <h3 className="dev-section-title">📊 프로젝트 상태</h3>
        <div className="dev-grid">
          {PROJECTS.map(p => {
            const s = stats[p.id]
            return (
              <div key={p.id} className="dev-card">
                <div className="dev-card-header">
                  <span>{p.emoji}</span>
                  <span className="dev-card-name">{p.name}</span>
                  <span
                    className="dev-badge"
                    style={{ background: s?.hasContext ? '#1e3a1e' : '#3a1e1e', color: s?.hasContext ? COLORS.success : COLORS.danger }}
                  >
                    {s?.hasContext ? 'CTX ✓' : 'CTX ✗'}
                  </span>
                </div>
                <div className="dev-card-stats">
                  <span>💡 {s?.ideas ?? 0}</span>
                  <span>📅 {s?.schedules ?? 0}</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ─── 로그 ─── */}
      <section className="dev-section">
        <div className="dev-section-header">
          <h3 className="dev-section-title">🖥 이벤트 로그</h3>
          <button className="dev-clear-btn" onClick={() => setLogs([])}>지우기</button>
        </div>
        <div className="dev-log-box">
          {logs.length === 0 && (
            <div className="dev-log-empty">이벤트 없음</div>
          )}
          {logs.map((l, i) => (
            <div key={i} className="dev-log-row">
              <span className="dev-log-time">{l.time}</span>
              <span className="dev-log-level" style={{ color: levelColor[l.level] }}>
                [{l.level.toUpperCase()}]
              </span>
              <span className="dev-log-msg">{l.msg}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── localStorage 디버그 ─── */}
      <section className="dev-section">
        <h3 className="dev-section-title">🗄 localStorage 키</h3>
        <div className="dev-log-box">
          {typeof window !== 'undefined' && Object.keys(localStorage).length === 0 && (
            <div className="dev-log-empty">비어있음</div>
          )}
          {typeof window !== 'undefined' && Object.keys(localStorage).map(key => (
            <div key={key} className="dev-log-row">
              <span className="dev-log-key">{key}</span>
              <span className="dev-log-size">
                {(localStorage.getItem(key) || '').length}B
              </span>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .dev-panel { padding: 16px; display: flex; flex-direction: column; gap: 20px; }
        .dev-section { background: ${COLORS.surface}; border-radius: 10px; padding: 14px; }
        .dev-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .dev-section-title { font-size: 13px; font-weight: 700; color: ${COLORS.textSub}; margin: 0 0 10px; }
        .dev-section-header .dev-section-title { margin: 0; }
        .dev-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
        .dev-card { background: ${COLORS.bg}; border-radius: 8px; padding: 10px; }
        .dev-card-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
        .dev-card-name { font-size: 12px; font-weight: 600; flex: 1; }
        .dev-badge { font-size: 9px; padding: 2px 5px; border-radius: 4px; }
        .dev-card-stats { display: flex; gap: 10px; font-size: 11px; color: ${COLORS.muted}; }
        .dev-log-box {
          background: ${COLORS.bg};
          border-radius: 6px;
          padding: 10px;
          max-height: 200px;
          overflow-y: auto;
          font-family: monospace;
          font-size: 11px;
        }
        .dev-log-empty { color: ${COLORS.muted}; text-align: center; padding: 10px; }
        .dev-log-row { display: flex; gap: 8px; padding: 2px 0; border-bottom: 1px solid ${COLORS.border}; }
        .dev-log-time { color: ${COLORS.muted}; flex-shrink: 0; }
        .dev-log-level { flex-shrink: 0; font-weight: 700; }
        .dev-log-msg { color: ${COLORS.textSub}; word-break: break-all; }
        .dev-log-key { color: ${COLORS.accent}; flex: 1; }
        .dev-log-size { color: ${COLORS.muted}; flex-shrink: 0; }
        .dev-clear-btn {
          background: ${COLORS.border};
          color: ${COLORS.textSub};
          border: none;
          border-radius: 4px;
          padding: 3px 8px;
          font-size: 11px;
          cursor: pointer;
        }
        .dev-clear-btn:hover { background: ${COLORS.danger}; color: #fff; }
      `}</style>
    </div>
  )
}
