'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const PROJECTS = [
  { id: '82423554-fa71-42cc-a297-90a65747113b', name: 'HajunAI' },
  { id: 'c38f5b9a-14ab-4a36-85e2-b58289a4e4e6', name: 'CoreRing' },
  { id: '13196994-00d5-4d7f-9436-619f07f5bd45', name: 'CoreChat' },
  { id: '66666666-0000-0000-0000-000000000006', name: 'CoreNull' },
  { id: '0a385ad1-4735-4967-978c-3a9aa7588613', name: 'CoreRoad' },
  { id: '8f7e37b0-a19b-448f-a568-5bd8fd6bb3ff', name: 'CoreHub' },
  { id: '2a9aa9b2-6eaa-4386-a8af-8345e9c4a4d2', name: 'MindWorld' },
]

interface Context {
  projectId: string
  summary: string
  lastTask: string
  nextAction: string
  updatedAt: string
}

export default function ContextsPage() {
  const [contexts, setContexts] = useState<Record<string, Context>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Context>>({})

  // 로컬스토리지에서 컨텍스트 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem('contexts')
      if (stored) setContexts(JSON.parse(stored))
    } catch {}
  }, [])

  const saveContexts = (updated: Record<string, Context>) => {
    setContexts(updated)
    localStorage.setItem('contexts', JSON.stringify(updated))
  }

  const updateContext = (projectId: string, data: Partial<Context>) => {
    const updated = {
      ...contexts,
      [projectId]: {
        projectId,
        summary: data.summary || contexts[projectId]?.summary || '',
        lastTask: data.lastTask || contexts[projectId]?.lastTask || '',
        nextAction: data.nextAction || contexts[projectId]?.nextAction || '',
        updatedAt: new Date().toISOString()
      }
    }
    saveContexts(updated)
    setEditingId(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0a0c10', color: '#e2e8f0' }}>
      
      {/* 헤더 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2530', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Link href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>← 홈</Link>
        <span>📊 맥락 대시보드</span>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <h3>프로젝트별 맥락 (Context)</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {PROJECTS.map(project => {
            const ctx = contexts[project.id]
            const isEditing = editingId === project.id

            return (
              <div key={project.id} style={{ padding: '16px', background: '#1e2530', borderRadius: '8px', borderLeft: '4px solid #2563eb' }}>
                <div style={{ fontWeight: 600, marginBottom: '12px' }}>{project.name}</div>

                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#4a5568' }}>요약</label>
                      <textarea
                        value={editData.summary || ''}
                        onChange={(e) => setEditData({ ...editData, summary: e.target.value })}
                        style={{ width: '100%', padding: '8px', background: '#0a0c10', color: '#e2e8f0', border: '1px solid #2d3748', borderRadius: '4px', minHeight: '60px', marginTop: '4px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', color: '#4a5568' }}>마지막 작업</label>
                      <input
                        type="text"
                        value={editData.lastTask || ''}
                        onChange={(e) => setEditData({ ...editData, lastTask: e.target.value })}
                        style={{ width: '100%', padding: '8px', background: '#0a0c10', color: '#e2e8f0', border: '1px solid #2d3748', borderRadius: '4px', marginTop: '4px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', color: '#4a5568' }}>다음 행동</label>
                      <input
                        type="text"
                        value={editData.nextAction || ''}
                        onChange={(e) => setEditData({ ...editData, nextAction: e.target.value })}
                        style={{ width: '100%', padding: '8px', background: '#0a0c10', color: '#e2e8f0', border: '1px solid #2d3748', borderRadius: '4px', marginTop: '4px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => updateContext(project.id, editData)}
                        style={{ flex: 1, padding: '8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{ flex: 1, padding: '8px', background: '#4a5568', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#4a5568' }}>요약</div>
                      <div style={{ fontSize: '12px', marginTop: '4px', minHeight: '40px' }}>
                        {ctx?.summary || '(없음)'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', color: '#4a5568' }}>마지막 작업</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        {ctx?.lastTask || '(없음)'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', color: '#4a5568' }}>다음 행동</div>
                      <div style={{ fontSize: '12px', marginTop: '4px', color: '#ffd700' }}>
                        {ctx?.nextAction || '(없음)'}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setEditingId(project.id)
                        setEditData(ctx || {})
                      }}
                      style={{ width: '100%', padding: '8px', background: '#2d3748', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '8px' }}
                    >
                      수정
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
