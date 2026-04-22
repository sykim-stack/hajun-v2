'use client'

import { useState, useRef, useEffect } from 'react'
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

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

export default function AIPage() {
  const [projectId, setProjectId] = useState(PROJECTS[0].id)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    const next: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs(next)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          project_id: projectId,
          mode: 'control'
        })
      })

      const data = await res.json()
      const content = data.actions?.length
        ? `${data.answer}\n\n**제안된 행동:**\n${data.actions.join('\n')}`
        : data.answer

      setMsgs(prev => [...prev, {
        role: 'assistant',
        content
      }])
    } catch (e) {
      setMsgs(prev => [...prev, {
        role: 'assistant',
        content: `❌ 오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}`
      }])
    } finally {
      setLoading(false)
    }
  }

  const projectName = PROJECTS.find(p => p.id === projectId)?.name || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0a0c10', color: '#e2e8f0' }}>
      
      {/* 헤더 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2530', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>← 홈</Link>
          <span>🧠 MindWorld AI</span>
        </div>
        <select 
          value={projectId} 
          onChange={(e) => setProjectId(e.target.value)}
          style={{ padding: '6px', background: '#1e2530', color: '#e2e8f0', border: '1px solid #2d3748', borderRadius: '4px', fontSize: '12px' }}
        >
          {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* 메시지 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {msgs.length === 0 && (
          <div style={{ textAlign: 'center', color: '#4a5568', marginTop: '40px' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🧠</div>
            <div>MindWorld AI와 대화하세요</div>
            <div style={{ fontSize: '12px', marginTop: '10px' }}>
              아이디어, 일정, 맥락을 분석하여 최적의 다음 행동을 제안합니다
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ 
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '70%',
            padding: '12px',
            background: m.role === 'user' ? '#2563eb' : '#1e2530',
            borderRadius: '8px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력 */}
      <div style={{ padding: '12px', borderTop: '1px solid #1e2530', display: 'flex', gap: '8px' }}>
        <textarea 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          style={{ 
            flex: 1,
            padding: '8px',
            background: '#1e2530',
            color: '#e2e8f0',
            border: '1px solid #2d3748',
            borderRadius: '6px',
            fontFamily: 'monospace',
            resize: 'none'
          }}
          placeholder="메시지를 입력하세요..."
        />
        <button 
          onClick={send}
          disabled={loading}
          style={{
            background: loading ? '#4a5568' : '#2563eb',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '...' : '전송'}
        </button>
      </div>
    </div>
  )
}
