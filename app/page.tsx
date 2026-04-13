'use client'

import { useState, useRef, useEffect } from 'react'

const PROJECTS = [
  { id: '82423554-fa71-42cc-a297-90a65747113b', name: 'HajunAI',   emoji: '🧠', color: '#ff9d00' },
  { id: 'c38f5b9a-14ab-4a36-85e2-b58289a4e4e6', name: 'CoreRing',  emoji: '🌐', color: '#00ff9d' },
  { id: '13196994-00d5-4d7f-9436-619f07f5bd45', name: 'CoreChat',  emoji: '💬', color: '#ff6b9d' },
  { id: '66666666-0000-0000-0000-000000000006', name: 'CoreNull',  emoji: '🏘️', color: '#f0b429' },
  { id: '0a385ad1-4735-4967-978c-3a9aa7588613', name: 'CoreRoad',  emoji: '🛵', color: '#00c8ff' },
  { id: '8f7e37b0-a19b-448f-a568-5bd8fd6bb3ff', name: 'CoreHub',   emoji: '🏊', color: '#ffd700' },
  { id: '2a9aa9b2-6eaa-4386-a8af-8345e9c4a4d2', name: 'MindWorld', emoji: '🧩', color: '#bf7fff' },
]

const TTL = 24 * 60 * 60 * 1000

interface Msg {
  role: 'user' | 'assistant'
  content: string
  source?: string
  state?: {
    intent?: string
    decision?: string
  }
}

/* ---------------- 저장 ---------------- */

function loadChat(pid: string): Msg[] {
  try {
    const raw = localStorage.getItem(`hj2_${pid}`)
    if (!raw) return []
    const { msgs, savedAt } = JSON.parse(raw)
    if (Date.now() - savedAt > TTL) {
      localStorage.removeItem(`hj2_${pid}`)
      return []
    }
    return msgs
  } catch { return [] }
}

function saveChat(pid: string, msgs: Msg[]) {
  try {
    localStorage.setItem(`hj2_${pid}`, JSON.stringify({
      msgs: msgs.slice(-50),
      savedAt: Date.now()
    }))
  } catch {}
}

/* ---------------- 상태 저장 ---------------- */

const STATE_KEY = (pid: string) => `hj2_state_${pid}`

function saveState(pid: string, msgs: Msg[]) {
  try {
    const decisions = msgs
      .filter(m => m.state?.decision)
      .slice(-10)
      .map(m => m.state?.decision)

    localStorage.setItem(STATE_KEY(pid), JSON.stringify({
      last_decisions: decisions,
      updatedAt: Date.now()
    }))
  } catch {}
}

function loadState(pid: string) {
  try {
    const raw = localStorage.getItem(STATE_KEY(pid))
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

/* ---------------- 컴포넌트 ---------------- */

export default function Home() {
  const [project, setProject] = useState(PROJECTS[3])
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  /* 초기 로드 */
  useEffect(() => {
    setMsgs(loadChat(project.id))
  }, [project.id])

  /* 저장 + 상태 */
  useEffect(() => {
    if (msgs.length) {
      saveChat(project.id, msgs)
      saveState(project.id, msgs)
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, project.id])

  /* 메시지 압축 */
  useEffect(() => {
    if (msgs.length > 40) {
      const recent = msgs.slice(-20)
      const compressed: Msg = {
        role: 'assistant',
        content: `🧠 세션 압축 (${msgs.length} → 20)`,
        state: { intent: 'compress' }
      }
      setMsgs([compressed, ...recent])
    }
  }, [msgs])

  /* Debug 로드 */
  useEffect(() => {
    const s = document.createElement('script')
    s.src = '/js/brainpool-debug.js'
    s.async = true
    document.body.appendChild(s)
    return () => { document.body.removeChild(s) }
  }, [])

  /* 전송 */
  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'

    let contextMsgs = [...msgs]

    /* 이어줘 */
    if (text === '이어줘') {
      const state = loadState(project.id)
      if (state?.last_decisions?.length) {
        contextMsgs = [{
          role: 'assistant',
          content: `📌 복구된 상태:\n- ${state.last_decisions.join('\n- ')}`
        }]
      }
    }

    const next: Msg[] = [...contextMsgs, { role: 'user', content: text }]
    setMsgs(next)
    setLoading(true)

    try {
      const CACHE_KEY = `hj2_cache_${project.id}_${text}`
      const cached = localStorage.getItem(CACHE_KEY)

      if (cached) {
        setMsgs(prev => [...prev, JSON.parse(cached)])
        setLoading(false)
        return
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, project_id: project.id })
      })

      const data = await res.json()
      const answer = data.error ? `❌ ${data.error}` : data.answer

      const msg: Msg = {
        role: 'assistant',
        content: answer,
        source: data.source,
        state: {
          intent: text.slice(0, 30),
          decision: answer.slice(0, 60)
        }
      }

      setMsgs(prev => [...prev, msg])

      localStorage.setItem(CACHE_KEY, JSON.stringify(msg))

    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: '❌ 네트워크 오류' }])
    } finally {
      setLoading(false)
    }
  }

  /* UI는 기존 그대로 유지 */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0a0c10', color: '#e2e8f0' }}>
      
      {/* 헤더 */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: '10px' }}>
        <span>{project.emoji}</span>
        <div style={{ flex: 1 }}>{project.name}</div>

        <button onClick={() => {
          const state = loadState(project.id)
          if (state?.last_decisions) {
            setMsgs([{
              role: 'assistant',
              content: `📌 긴급 복구:\n- ${state.last_decisions.join('\n- ')}`
            }])
          }
        }}>복구</button>
      </div>

      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {msgs.map((m, i) => (
          <div key={i}>{m.content}</div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력 */}
      <div style={{ padding: '12px' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button onClick={send}>전송</button>
      </div>
    </div>
  )
}