'use client'

import { useState, useRef, useEffect } from 'react'

const PROJECTS = [
  { id: '1', name: 'HajunAI', emoji: '🧠' }
]

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

export default function Home() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'dev' | 'control'>('dev')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const send = () => {
    if (!input.trim()) return

    setMsgs(prev => [
      ...prev,
      { role: 'user', content: input },
      { role: 'assistant', content: '응답 예시입니다.\n👉 다음 작업:\n- API 수정' }
    ])
    setInput('')
  }

  return (
    <div style={styles.container}>

      {/* 헤더 */}
      <div style={styles.header}>
        <div style={styles.logo}>🧠 HajunAI</div>

        <div style={styles.toggle}>
          <button
            onClick={() => setMode('dev')}
            style={mode === 'dev' ? styles.activeBtn : styles.btn}
          >
            🛠 Dev
          </button>
          <button
            onClick={() => setMode('control')}
            style={mode === 'control' ? styles.activeBtn : styles.btn}
          >
            📊 Control
          </button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div style={styles.chat}>
        {msgs.map((m, i) => (
          <div
            key={i}
            style={m.role === 'user' ? styles.userWrap : styles.aiWrap}
          >
            <div style={m.role === 'user' ? styles.userMsg : styles.aiMsg}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력 */}
      <div style={styles.inputWrap}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          style={styles.input}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button onClick={send} style={styles.sendBtn}>
          전송
        </button>
      </div>

    </div>
  )
}

const styles: Record<string, any> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    background: '#0a0c10',
    color: '#e2e8f0',
    fontFamily: 'system-ui'
  },

  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #1e2530',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  logo: {
    fontWeight: 700,
    fontSize: '16px'
  },

  toggle: {
    display: 'flex',
    gap: '6px'
  },

  btn: {
    background: '#1e2530',
    color: '#aaa',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '8px',
    cursor: 'pointer'
  },

  activeBtn: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0 0 8px rgba(37,99,235,0.5)'
  },

  chat: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px'
  },

  userWrap: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '10px'
  },

  aiWrap: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '10px'
  },

  userMsg: {
    background: '#2563eb',
    padding: '10px 12px',
    borderRadius: '12px',
    maxWidth: '70%',
    whiteSpace: 'pre-wrap'
  },

  aiMsg: {
    background: '#1e2530',
    padding: '10px 12px',
    borderRadius: '12px',
    maxWidth: '70%',
    whiteSpace: 'pre-wrap'
  },

  inputWrap: {
    display: 'flex',
    padding: '12px',
    borderTop: '1px solid #1e2530',
    gap: '8px'
  },

  input: {
    flex: 1,
    background: '#1e2530',
    border: 'none',
    color: '#fff',
    padding: '10px',
    borderRadius: '8px',
    resize: 'none'
  },

  sendBtn: {
    background: '#2563eb',
    border: 'none',
    padding: '10px 14px',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer'
  }
}