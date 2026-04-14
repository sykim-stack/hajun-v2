'use client'

import { useState, useRef, useEffect } from 'react'

const PROJECTS = [
  { id: '82423554-fa71-42cc-a297-90a65747113b', name: 'HajunAI', emoji: '🧠', color: '#ff9d00' },
  { id: 'c38f5b9a-14ab-4a36-85e2-b58289a4e4e6', name: 'CoreRing', emoji: '🌐', color: '#00ff9d' },
  { id: '13196994-00d5-4d7f-9436-619f07f5bd45', name: 'CoreChat', emoji: '💬', color: '#ff6b9d' },
  { id: '66666666-0000-0000-0000-000000000006', name: 'CoreNull', emoji: '🏘️', color: '#f0b429' },
  { id: '0a385ad1-4735-4967-978c-3a9aa7588613', name: 'CoreRoad', emoji: '🛵', color: '#00c8ff' },
  { id: '8f7e37b0-a19b-448f-a568-5bd8fd6bb3ff', name: 'CoreHub', emoji: '🏊', color: '#ffd700' },
  { id: '2a9aa9b2-6eaa-4386-a8af-8345e9c4a4d2', name: 'MindWorld', emoji: '🧩', color: '#bf7fff' },
]

const TTL = 24 * 60 * 60 * 1000
const CACHE_TTL = 10 * 60 * 1000

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

function loadChat(pid: string): Msg[] {
  try {
    const raw = localStorage.getItem(`hj2_${pid}`)
    if (!raw) return []
    const { msgs, savedAt } = JSON.parse(raw)
    if (Date.now() - savedAt > TTL) return []
    return msgs
  } catch { return [] }
}

function saveChat(pid: string, msgs: Msg[]) {
  try {
    localStorage.setItem(`hj2_${pid}`, JSON.stringify({
      msgs: msgs.slice(-60),
      savedAt: Date.now()
    }))
  } catch {}
}

export default function Home() {
  const [project, setProject] = useState(PROJECTS[0])
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  // 🔥 추가: Dev / Control 모드
  const [mode, setMode] = useState<'dev' | 'control'>('dev')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMsgs(loadChat(project.id))
  }, [project.id])

  useEffect(() => {
    if (msgs.length) saveChat(project.id, msgs)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, project.id])

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
          project_id: project.id,
          mode // 🔥 핵심 전달
        })
      })

      const data = await res.json()

      const content = data.actions?.length
        ? `${data.answer}\n\n${data.actions.join('\n')}`
        : data.answer

      setMsgs(prev => [...prev, {
        role: 'assistant',
        content
      }])

    } catch {
      setMsgs(prev => [...prev, {
        role: 'assistant',
        content: '❌ 네트워크 오류'
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      background: '#0a0c10',
      color: '#e2e8f0'
    }}>

      {/* 🔥 헤더 */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #1e2530',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>

        <span>🧠</span>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>HajunAI Console</div>
          <div style={{ fontSize: '10px', color: '#4a5568' }}>
            BRAINPOOL SYSTEM
          </div>
        </div>

        {/* 🔥 토글 버튼 */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setMode('dev')}
            style={{
              background: mode === 'dev' ? '#2563eb' : '#1e2530',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '6px',
              border: 'none'
            }}
          >
            🛠 Dev
          </button>

          <button
            onClick={() => setMode('control')}
            style={{
              background: mode === 'control' ? '#2563eb' : '#1e2530',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '6px',
              border: 'none'
            }}
          >
            📊 Control
          </button>
        </div>

      </div>

      {/* 메시지 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ marginBottom: '10px', lineHeight: '1.5' }}>
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력 */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #1e2530'
      }}>
        <textarea style={{ width: '80%', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px', padding: '8px' }}
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          style={{ width: '80%' }}
        />
        <button style={{
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '6px'
  }}onClick={send}>전송</button>
      </div>

    </div>
  )
}