'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PROJECTS, COLORS } from '@/lib/constants'
import { loadContexts, saveContexts, Context } from '@/lib/storage'

export default function ContextsPage() {
  const [contexts, setContexts]   = useState<Record<string, Context>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData]   = useState<Partial<Context>>({})
  const [toast, setToast]         = useState<string | null>(null)

  useEffect(() => { setContexts(loadContexts()) }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const persist = (updated: Record<string, Context>) => {
    setContexts(updated)
    saveContexts(updated)
  }

  const updateContext = (projectId: string, data: Partial<Context>) => {
    const prev = contexts[projectId]
    const updated = {
      ...contexts,
      [projectId]: {
        projectId,
        summary:    data.summary    ?? prev?.summary    ?? '',
        lastTask:   data.lastTask   ?? prev?.lastTask   ?? '',
        nextAction: data.nextAction ?? prev?.nextAction ?? '',
        updatedAt:  new Date().toISOString(),
      },
    }
    persist(updated)
    setEditingId(null)
    showToast('✅ 맥락 저장됨')
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <Link href="/" className="back-link">← 홈</Link>
        <span className="page-title">📊 맥락 대시보드</span>
      </header>

      {toast && <div className="toast">{toast}</div>}

      <div className="page-body">
        <div className="ctx-grid">
          {PROJECTS.map(project => {
            const ctx       = contexts[project.id]
            const isEditing = editingId === project.id
            return (
              <div key={project.id} className="ctx-card">
                <div className="ctx-card-header">
                  <span>{project.emoji}</span>
                  <span className="ctx-card-name">{project.name}</span>
                  {ctx?.updatedAt && (
                    <span className="ctx-updated">{new Date(ctx.updatedAt).toLocaleDateString('ko-KR')}</span>
                  )}
                </div>

                {isEditing ? (
                  <div className="ctx-edit-form">
                    <div className="form-group">
                      <label className="form-label">요약</label>
                      <textarea value={editData.summary || ''} onChange={e => setEditData({ ...editData, summary: e.target.value })}
                        className="form-textarea" rows={2} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">마지막 작업</label>
                      <input type="text" value={editData.lastTask || ''} onChange={e => setEditData({ ...editData, lastTask: e.target.value })}
                        className="form-input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">다음 행동 (next_action)</label>
                      <input type="text" value={editData.nextAction || ''} onChange={e => setEditData({ ...editData, nextAction: e.target.value })}
                        className="form-input" placeholder="아이디어 반영확정 시 자동 등록됩니다" />
                    </div>
                    <div className="ctx-edit-actions">
                      <button onClick={() => updateContext(project.id, editData)} className="btn-primary">저장</button>
                      <button onClick={() => setEditingId(null)} className="btn-secondary">취소</button>
                    </div>
                  </div>
                ) : (
                  <div className="ctx-view">
                    <div className="ctx-field">
                      <span className="ctx-field-label">요약</span>
                      <span className="ctx-field-value">{ctx?.summary || '(없음)'}</span>
                    </div>
                    <div className="ctx-field">
                      <span className="ctx-field-label">마지막 작업</span>
                      <span className="ctx-field-value">{ctx?.lastTask || '(없음)'}</span>
                    </div>
                    <div className="ctx-field">
                      <span className="ctx-field-label">다음 행동</span>
                      <span className="ctx-field-value ctx-next-action">{ctx?.nextAction || '(없음)'}</span>
                    </div>
                    <button onClick={() => { setEditingId(project.id); setEditData(ctx || {}) }} className="btn-edit">수정</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        .page-shell { display: flex; flex-direction: column; min-height: 100dvh; background: ${COLORS.bg}; color: ${COLORS.text}; }
        .page-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid ${COLORS.border}; }
        .back-link { color: ${COLORS.accent}; text-decoration: none; font-size: 13px; }
        .page-title { font-size: 15px; font-weight: 700; }
        .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #1a3a1a; color: ${COLORS.success}; padding: 10px 20px; border-radius: 8px; font-size: 13px; z-index: 999; border: 1px solid ${COLORS.success}44; }
        .page-body { flex: 1; overflow-y: auto; padding: 16px; }
        .ctx-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
        .ctx-card { background: ${COLORS.surface}; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; border-left: 3px solid ${COLORS.accent}; }
        .ctx-card-header { display: flex; align-items: center; gap: 8px; }
        .ctx-card-name { font-size: 13px; font-weight: 700; flex: 1; }
        .ctx-updated { font-size: 10px; color: ${COLORS.muted}; }
        .ctx-view { display: flex; flex-direction: column; gap: 8px; }
        .ctx-field { display: flex; flex-direction: column; gap: 2px; }
        .ctx-field-label { font-size: 10px; color: ${COLORS.muted}; }
        .ctx-field-value { font-size: 12px; color: ${COLORS.textSub}; min-height: 18px; }
        .ctx-next-action { color: ${COLORS.warning}; font-weight: 600; }
        .btn-edit { padding: 7px; background: ${COLORS.border}; color: ${COLORS.text}; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; margin-top: 4px; transition: background 0.15s; }
        .btn-edit:hover { background: ${COLORS.accent}; }
        .ctx-edit-form { display: flex; flex-direction: column; gap: 10px; }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-label { font-size: 11px; color: ${COLORS.muted}; font-weight: 600; }
        .form-input, .form-textarea { padding: 8px 10px; background: ${COLORS.bg}; color: ${COLORS.text}; border: 1px solid ${COLORS.border}; border-radius: 6px; font-size: 12px; outline: none; width: 100%; box-sizing: border-box; transition: border-color 0.15s; font-family: inherit; }
        .form-input:focus, .form-textarea:focus { border-color: ${COLORS.accent}; }
        .form-textarea { resize: vertical; }
        .ctx-edit-actions { display: flex; gap: 8px; }
        .btn-primary { flex: 1; padding: 8px; background: ${COLORS.accent}; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
        .btn-secondary { flex: 1; padding: 8px; background: ${COLORS.border}; color: ${COLORS.text}; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; }
        @media (max-width: 600px) { .ctx-grid { grid-template-columns: 1fr; } .page-body { padding: 12px; } }
      `}</style>
    </div>
  )
}
