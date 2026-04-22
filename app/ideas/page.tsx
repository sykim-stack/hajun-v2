'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PROJECTS, COLORS } from '@/lib/constants'
import { loadIdeas, saveIdeas, syncIdeaToNextAction, Idea } from '@/lib/storage'

export default function IdeasPage() {
  const [projectId, setProjectId] = useState<string>(PROJECTS[0].id)
  const [ideas, setIdeas]         = useState<Idea[]>([])
  const [newIdea, setNewIdea]     = useState('')
  const [newTags, setNewTags]     = useState('')
  const [toast, setToast]         = useState<string | null>(null)

  useEffect(() => { setIdeas(loadIdeas(projectId)) }, [projectId])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const persist = (updated: Idea[]) => {
    setIdeas(updated)
    saveIdeas(projectId, updated)
  }

  const addIdea = () => {
    if (!newIdea.trim()) return
    const idea: Idea = {
      id: `idea_${Date.now()}`,
      content: newIdea.trim(),
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      status: '검토중',
      createdAt: new Date().toISOString(),
    }
    persist([...ideas, idea])
    setNewIdea('')
    setNewTags('')
  }

  const updateStatus = (id: string, status: Idea['status']) => {
    const updated = ideas.map(i => i.id === id ? { ...i, status } : i)
    persist(updated)
    if (status === '반영확정') {
      const idea = ideas.find(i => i.id === id)
      if (idea) {
        syncIdeaToNextAction(projectId, idea.content)
        showToast(`✅ "${idea.content.slice(0, 30)}" → next_action 자동 등록됨`)
      }
    }
  }

  const deleteIdea = (id: string) => persist(ideas.filter(i => i.id !== id))

  const projectName = PROJECTS.find(p => p.id === projectId)?.name || ''
  const statusCount = {
    검토중:   ideas.filter(i => i.status === '검토중').length,
    반영확정: ideas.filter(i => i.status === '반영확정').length,
    보류:     ideas.filter(i => i.status === '보류').length,
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <Link href="/" className="back-link">← 홈</Link>
        <span className="page-title">💡 아이디어 뱅크</span>
        <div className="header-stats">
          <span className="stat-chip chip-review">{statusCount.검토중} 검토중</span>
          <span className="stat-chip chip-confirmed">{statusCount.반영확정} 확정</span>
          <span className="stat-chip chip-hold">{statusCount.보류} 보류</span>
        </div>
      </header>

      {toast && <div className="toast">{toast}</div>}

      <div className="page-body">
        <div className="input-panel">
          <div className="form-group">
            <label className="form-label">프로젝트</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="form-select">
              {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">새 아이디어</label>
            <input type="text" value={newIdea} onChange={e => setNewIdea(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addIdea()}
              placeholder="아이디어를 입력하세요..." className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">태그 (쉼표로 구분)</label>
            <input type="text" value={newTags} onChange={e => setNewTags(e.target.value)}
              placeholder="예: 기능, 개선, 버그" className="form-input" />
          </div>
          <button onClick={addIdea} className="btn-primary">추가</button>
        </div>

        <div className="ideas-section">
          <h3 className="section-title">{projectName} 프로젝트의 아이디어 ({ideas.length})</h3>
          {ideas.length === 0 ? (
            <div className="empty-state">아이디어가 없습니다. 새로운 아이디어를 추가해보세요!</div>
          ) : (
            <div className="ideas-grid">
              {ideas.map(idea => {
                const cls = idea.status === '반영확정' ? 'confirmed' : idea.status === '검토중' ? 'review' : 'hold'
                return (
                  <div key={idea.id} className={`idea-card status-${cls}`}>
                    <div className="idea-header">
                      <div className="idea-content-wrap">
                        <div className="idea-content">{idea.content}</div>
                        {idea.tags.length > 0 && (
                          <div className="idea-tags">
                            {idea.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                          </div>
                        )}
                      </div>
                      <button onClick={() => deleteIdea(idea.id)} className="btn-delete" title="삭제">✕</button>
                    </div>
                    <div className="idea-footer">
                      <span className="idea-date">{new Date(idea.createdAt).toLocaleDateString('ko-KR')}</span>
                      <select value={idea.status} onChange={e => updateStatus(idea.id, e.target.value as Idea['status'])}
                        className={`status-select status-${cls}`}>
                        <option value="검토중">검토중</option>
                        <option value="반영확정">반영확정</option>
                        <option value="보류">보류</option>
                      </select>
                    </div>
                    {idea.status === '반영확정' && (
                      <div className="idea-confirmed-badge">✅ next_action 자동 등록됨</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .page-shell { display: flex; flex-direction: column; min-height: 100dvh; background: ${COLORS.bg}; color: ${COLORS.text}; }
        .page-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid ${COLORS.border}; flex-wrap: wrap; }
        .back-link { color: ${COLORS.accent}; text-decoration: none; font-size: 13px; flex-shrink: 0; }
        .page-title { font-size: 15px; font-weight: 700; flex: 1; }
        .header-stats { display: flex; gap: 6px; flex-wrap: wrap; }
        .stat-chip { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
        .chip-review    { background: #1a2540; color: #7ba3f7; }
        .chip-confirmed { background: #1a3a1a; color: ${COLORS.success}; }
        .chip-hold      { background: #3a2a1a; color: ${COLORS.warning}; }
        .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #1a3a1a; color: ${COLORS.success}; padding: 10px 20px; border-radius: 8px; font-size: 13px; z-index: 999; border: 1px solid ${COLORS.success}44; box-shadow: 0 4px 12px #00000066; white-space: nowrap; }
        .page-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 20px; }
        .input-panel { background: ${COLORS.surface}; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-label { font-size: 11px; color: ${COLORS.muted}; font-weight: 600; }
        .form-input, .form-select { padding: 9px 12px; background: ${COLORS.bg}; color: ${COLORS.text}; border: 1px solid ${COLORS.border}; border-radius: 6px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; transition: border-color 0.15s; }
        .form-input:focus, .form-select:focus { border-color: ${COLORS.accent}; }
        .btn-primary { padding: 10px; background: ${COLORS.accent}; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: opacity 0.15s; }
        .btn-primary:hover { opacity: 0.85; }
        .section-title { font-size: 13px; font-weight: 700; color: ${COLORS.textSub}; margin-bottom: 12px; }
        .empty-state { padding: 30px; text-align: center; color: ${COLORS.muted}; font-size: 13px; background: ${COLORS.surface}; border-radius: 10px; }
        .ideas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .idea-card { background: ${COLORS.surface}; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; border-left: 3px solid ${COLORS.border}; }
        .idea-card.status-review    { border-left-color: ${COLORS.accent}; }
        .idea-card.status-confirmed { border-left-color: ${COLORS.success}; }
        .idea-card.status-hold      { border-left-color: ${COLORS.warning}; }
        .idea-header { display: flex; gap: 8px; align-items: flex-start; }
        .idea-content-wrap { flex: 1; }
        .idea-content { font-size: 13px; font-weight: 600; color: ${COLORS.text}; line-height: 1.4; }
        .idea-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
        .tag { font-size: 10px; background: ${COLORS.border}; padding: 2px 6px; border-radius: 4px; color: ${COLORS.textSub}; }
        .btn-delete { background: transparent; border: none; color: ${COLORS.muted}; cursor: pointer; font-size: 14px; padding: 2px 4px; border-radius: 4px; flex-shrink: 0; transition: color 0.15s; }
        .btn-delete:hover { color: ${COLORS.danger}; }
        .idea-footer { display: flex; justify-content: space-between; align-items: center; }
        .idea-date { font-size: 10px; color: ${COLORS.muted}; }
        .status-select { padding: 4px 8px; background: ${COLORS.bg}; color: ${COLORS.text}; border: 1px solid ${COLORS.border}; border-radius: 4px; font-size: 11px; cursor: pointer; outline: none; }
        .status-select.status-confirmed { border-color: ${COLORS.success}44; color: ${COLORS.success}; }
        .status-select.status-review    { border-color: ${COLORS.accent}44; color: #7ba3f7; }
        .status-select.status-hold      { border-color: ${COLORS.warning}44; color: ${COLORS.warning}; }
        .idea-confirmed-badge { font-size: 10px; color: ${COLORS.success}; background: #1a3a1a; padding: 4px 8px; border-radius: 4px; }
        @media (max-width: 600px) { .ideas-grid { grid-template-columns: 1fr; } .page-body { padding: 12px; } }
      `}</style>
    </div>
  )
}
