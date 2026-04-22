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

interface Idea {
  id: string
  content: string
  tags: string[]
  status: '검토중' | '반영확정' | '보류'
  createdAt: string
}

export default function IdeasPage() {
  const [projectId, setProjectId] = useState(PROJECTS[0].id)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [newIdea, setNewIdea] = useState('')
  const [newTags, setNewTags] = useState('')
  const [loading, setLoading] = useState(false)

  // 로컬스토리지에서 아이디어 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`ideas_${projectId}`)
      if (stored) setIdeas(JSON.parse(stored))
      else setIdeas([])
    } catch {
      setIdeas([])
    }
  }, [projectId])

  const saveIdeas = (updated: Idea[]) => {
    setIdeas(updated)
    localStorage.setItem(`ideas_${projectId}`, JSON.stringify(updated))
  }

  const addIdea = () => {
    if (!newIdea.trim()) return
    const idea: Idea = {
      id: `idea_${Date.now()}`,
      content: newIdea,
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      status: '검토중',
      createdAt: new Date().toISOString()
    }
    saveIdeas([...ideas, idea])
    setNewIdea('')
    setNewTags('')
  }

  const updateStatus = (id: string, status: '검토중' | '반영확정' | '보류') => {
    const updated = ideas.map(i => i.id === id ? { ...i, status } : i)
    saveIdeas(updated)
  }

  const projectName = PROJECTS.find(p => p.id === projectId)?.name || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0a0c10', color: '#e2e8f0' }}>
      
      {/* 헤더 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2530', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Link href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>← 홈</Link>
        <span>💡 아이디어 뱅크</span>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        
        {/* 프로젝트 선택 및 입력 */}
        <div style={{ marginBottom: '20px', padding: '12px', background: '#1e2530', borderRadius: '8px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', color: '#4a5568' }}>프로젝트</label>
            <select 
              value={projectId} 
              onChange={(e) => setProjectId(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '4px', background: '#0a0c10', color: '#e2e8f0', border: '1px solid #2d3748', borderRadius: '4px' }}
            >
              {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', color: '#4a5568' }}>새 아이디어</label>
            <input 
              type="text"
              value={newIdea}
              onChange={(e) => setNewIdea(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addIdea()}
              placeholder="아이디어를 입력하세요..."
              style={{ width: '100%', padding: '8px', marginTop: '4px', background: '#0a0c10', color: '#e2e8f0', border: '1px solid #2d3748', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', color: '#4a5568' }}>태그 (쉼표로 구분)</label>
            <input 
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="예: 기능, 개선, 버그"
              style={{ width: '100%', padding: '8px', marginTop: '4px', background: '#0a0c10', color: '#e2e8f0', border: '1px solid #2d3748', borderRadius: '4px' }}
            />
          </div>

          <button 
            onClick={addIdea}
            style={{ width: '100%', padding: '8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            추가
          </button>
        </div>

        {/* 아이디어 목록 */}
        <h3>{projectName} 프로젝트의 아이디어 ({ideas.length})</h3>
        
        {ideas.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#4a5568' }}>
            아이디어가 없습니다. 새로운 아이디어를 추가해보세요!
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {ideas.map(idea => (
              <div key={idea.id} style={{ padding: '12px', background: '#1e2530', borderRadius: '8px', borderLeft: '4px solid #2563eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{idea.content}</div>
                    {idea.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {idea.tags.map(tag => (
                          <span key={tag} style={{ fontSize: '10px', background: '#2d3748', padding: '2px 6px', borderRadius: '3px' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <select 
                    value={idea.status}
                    onChange={(e) => updateStatus(idea.id, e.target.value as any)}
                    style={{ padding: '4px', background: '#0a0c10', color: '#e2e8f0', border: '1px solid #2d3748', borderRadius: '4px', fontSize: '12px' }}
                  >
                    <option value="검토중">검토중</option>
                    <option value="반영확정">반영확정</option>
                    <option value="보류">보류</option>
                  </select>
                </div>
                <div style={{ fontSize: '10px', color: '#4a5568' }}>
                  {new Date(idea.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
