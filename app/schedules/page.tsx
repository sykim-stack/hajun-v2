'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PROJECTS, COLORS } from '@/lib/constants'
import { loadSchedules, saveSchedules, Schedule } from '@/lib/storage'

export default function SchedulesPage() {
  const [projectId, setProjectId] = useState<string>(PROJECTS[0].id)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [newTitle, setNewTitle]   = useState('')
  const [newDate, setNewDate]     = useState('')
  const [newDesc, setNewDesc]     = useState('')
  const [toast, setToast]         = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { setSchedules(loadSchedules(projectId)) }, [projectId])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const persist = (updated: Schedule[]) => {
    setSchedules(updated)
    saveSchedules(projectId, updated)
  }

  const addSchedule = () => {
    if (!newTitle.trim() || !newDate) return
    const s: Schedule = {
      id: `sch_${Date.now()}`,
      projectId,
      title: newTitle.trim(),
      scheduledDate: newDate,
      description: newDesc.trim(),
      createdAt: new Date().toISOString(),
    }
    persist([...schedules, s].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)))
    setNewTitle('')
    setNewDate('')
    setNewDesc('')
    showToast('✅ 일정 추가됨 — KPI 자동 업데이트')
  }

  const deleteSchedule = (id: string) => persist(schedules.filter(s => s.id !== id))

  const projectName = PROJECTS.find(p => p.id === projectId)?.name || ''

  return (
    <div className="page-shell">
      <header className="page-header">
        <Link href="/" className="back-link">← 홈</Link>
        <span className="page-title">📅 스마트 캘린더</span>
        <span className="header-count">{schedules.length}개</span>
      </header>

      {toast && <div className="toast">{toast}</div>}

      <div className="page-body">
        <div className="input-panel">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">프로젝트</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} className="form-select">
                {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">날짜</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="form-input" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">제목</label>
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSchedule()}
              placeholder="일정 제목..." className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">설명 (선택)</label>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
              placeholder="선택사항..." className="form-textarea" rows={2} />
          </div>
          <button onClick={addSchedule} className="btn-primary">추가</button>
        </div>

        <div>
          <h3 className="section-title">{projectName} 프로젝트의 일정 ({schedules.length})</h3>
          {schedules.length === 0 ? (
            <div className="empty-state">일정이 없습니다. 새로운 일정을 추가해보세요!</div>
          ) : (
            <div className="schedules-list">
              {schedules.map(s => {
                const isToday = s.scheduledDate === today
                const isPast  = s.scheduledDate < today
                return (
                  <div key={s.id} className={`sch-card ${isToday ? 'sch-today' : isPast ? 'sch-past' : 'sch-future'}`}>
                    <div className="sch-main">
                      <div className="sch-title">{s.title}</div>
                      <div className="sch-date">
                        📅 {new Date(s.scheduledDate + 'T00:00:00').toLocaleDateString('ko-KR')}
                        {isToday && <span className="sch-badge badge-today">오늘</span>}
                        {isPast  && <span className="sch-badge badge-past">지남</span>}
                      </div>
                      {s.description && <div className="sch-desc">{s.description}</div>}
                    </div>
                    <button onClick={() => deleteSchedule(s.id)} className="btn-delete" title="삭제">✕</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .page-shell { display: flex; flex-direction: column; min-height: 100dvh; background: ${COLORS.bg}; color: ${COLORS.text}; }
        .page-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid ${COLORS.border}; }
        .back-link { color: ${COLORS.accent}; text-decoration: none; font-size: 13px; }
        .page-title { font-size: 15px; font-weight: 700; flex: 1; }
        .header-count { font-size: 12px; color: ${COLORS.muted}; }
        .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #1a3a1a; color: ${COLORS.success}; padding: 10px 20px; border-radius: 8px; font-size: 13px; z-index: 999; border: 1px solid ${COLORS.success}44; }
        .page-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 20px; }
        .input-panel { background: ${COLORS.surface}; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-label { font-size: 11px; color: ${COLORS.muted}; font-weight: 600; }
        .form-input, .form-select, .form-textarea { padding: 9px 12px; background: ${COLORS.bg}; color: ${COLORS.text}; border: 1px solid ${COLORS.border}; border-radius: 6px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; transition: border-color 0.15s; font-family: inherit; }
        .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: ${COLORS.accent}; }
        .form-textarea { resize: vertical; }
        .btn-primary { padding: 10px; background: ${COLORS.accent}; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
        .btn-primary:hover { opacity: 0.85; }
        .section-title { font-size: 13px; font-weight: 700; color: ${COLORS.textSub}; margin-bottom: 12px; }
        .empty-state { padding: 30px; text-align: center; color: ${COLORS.muted}; font-size: 13px; background: ${COLORS.surface}; border-radius: 10px; }
        .schedules-list { display: flex; flex-direction: column; gap: 8px; }
        .sch-card { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; background: ${COLORS.surface}; border-radius: 8px; border-left: 3px solid ${COLORS.border}; }
        .sch-today  { border-left-color: ${COLORS.warning}; }
        .sch-past   { border-left-color: ${COLORS.danger}; opacity: 0.7; }
        .sch-future { border-left-color: ${COLORS.accent}; }
        .sch-main { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .sch-title { font-size: 13px; font-weight: 600; }
        .sch-date { font-size: 11px; color: ${COLORS.muted}; display: flex; align-items: center; gap: 6px; }
        .sch-badge { font-size: 9px; padding: 1px 5px; border-radius: 3px; font-weight: 700; }
        .badge-today { background: ${COLORS.warning}22; color: ${COLORS.warning}; }
        .badge-past  { background: ${COLORS.danger}22; color: ${COLORS.danger}; }
        .sch-desc { font-size: 11px; color: ${COLORS.textSub}; }
        .btn-delete { background: transparent; border: none; color: ${COLORS.muted}; cursor: pointer; font-size: 14px; padding: 2px 4px; border-radius: 4px; transition: color 0.15s; flex-shrink: 0; }
        .btn-delete:hover { color: ${COLORS.danger}; }
        @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } .page-body { padding: 12px; } }
      `}</style>
    </div>
  )
}
