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

interface Msg { role: 'user' | 'assistant'; content: string; source?: string }

function loadChat(pid: string): Msg[] {
  try {
    const raw = localStorage.getItem(`hj2_${pid}`)
    if (!raw) return []
    const { msgs, savedAt } = JSON.parse(raw)
    if (Date.now() - savedAt > TTL) { localStorage.removeItem(`hj2_${pid}`); return [] }
    return msgs
  } catch { return [] }
}
function saveChat(pid: string, msgs: Msg[]) {
  try { localStorage.setItem(`hj2_${pid}`, JSON.stringify({ msgs, savedAt: Date.now() })) } catch {}
}

export default function Home() {
  const [project, setProject]   = useState(PROJECTS[3]) // CoreNull 기본
  const [msgs, setMsgs]         = useState<Msg[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setMsgs(loadChat(project.id)) }, [project.id])
  useEffect(() => {
    if (msgs.length) saveChat(project.id, msgs)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, project.id])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    const next: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs(next)
    setLoading(true)
    try {
      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, project_id: project.id })
      })
      const data = await res.json()
      setMsgs(prev => [...prev, {
        role: 'assistant',
        content: data.error ? `❌ ${data.error}` : data.answer,
        source: data.source
      }])
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: '❌ 네트워크 오류' }])
    } finally { setLoading(false) }
  }

  const srcColor = (s?: string) =>
    s === 'groq' ? '#f59e0b' : s === 'gemini' ? '#3b82f6' : '#6b7280'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh',
      background: '#0a0c10', color: '#e2e8f0',
      fontFamily: "'Noto Sans KR', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=JetBrains+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{overflow:hidden;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:#1e2530;border-radius:2px;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .msg{animation:fadeUp .18s ease;}
        textarea{resize:none;}
        .proj-item:hover{background:rgba(255,255,255,.04)!important;}
        .send:hover:not(:disabled){filter:brightness(1.15);}
        .menu{
          position:fixed;inset:0;z-index:50;
          display:flex;align-items:flex-end;
          background:rgba(0,0,0,.6);
        }
        .menu-panel{
          width:100%;background:#0f1218;
          border-top:1px solid #1e2530;
          border-radius:16px 16px 0 0;
          padding:12px 0 32px;
          max-height:70vh;overflow-y:auto;
        }
        .menu-handle{
          width:36px;height:4px;border-radius:2px;
          background:#1e2530;margin:0 auto 16px;
        }
      `}</style>

      {/* 헤더 */}
      <div style={{
        background: '#0f1218', borderBottom: '1px solid #1e2530',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '18px' }}>{project.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: project.color }}>{project.name}</div>
          <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '1px' }}>HAJUN AI · BRAINPOOL</div>
        </div>
        <button onClick={() => setMenuOpen(true)} style={{
          background: '#151a22', border: '1px solid #1e2530', borderRadius: '8px',
          color: '#8b949e', fontSize: '12px', padding: '6px 12px', cursor: 'pointer',
          fontFamily: 'inherit',
        }}>프로젝트 ▾</button>
        {msgs.length > 0 && (
          <button onClick={() => { setMsgs([]); localStorage.removeItem(`hj2_${project.id}`) }} style={{
            background: 'none', border: '1px solid #1e2530', borderRadius: '8px',
            color: '#4a5568', fontSize: '11px', padding: '6px 10px', cursor: 'pointer',
          }}>초기화</button>
        )}
      </div>

      {/* 메시지 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {msgs.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#4a5568' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>{project.emoji}</div>
            <div style={{ fontSize: '14px', color: '#718096', fontWeight: 600 }}>{project.name}</div>
            <div style={{ fontSize: '12px', marginTop: '8px', lineHeight: 1.8 }}>
              "이어줘" 입력 시 맥락을 불러옵니다
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className="msg" style={{
            display: 'flex',
            flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
            gap: '8px', alignItems: 'flex-start',
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
              background: m.role === 'user'
                ? `linear-gradient(135deg,${project.color}80,${project.color}40)`
                : '#151a22',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
              border: `1px solid ${m.role === 'user' ? project.color + '40' : '#1e2530'}`,
            }}>{m.role === 'user' ? '👤' : '🧠'}</div>

            <div style={{ maxWidth: 'min(78%, 520px)' }}>
              <div style={{
                background: m.role === 'user' ? `${project.color}18` : '#111620',
                border: `1px solid ${m.role === 'user' ? project.color + '30' : '#1e2530'}`,
                borderRadius: m.role === 'user' ? '14px 3px 14px 14px' : '3px 14px 14px 14px',
                padding: '10px 14px', fontSize: '14px', lineHeight: 1.8,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{m.content}</div>
              {m.source && m.role === 'assistant' && (
                <div style={{ fontSize: '10px', color: srcColor(m.source), marginTop: '3px', paddingLeft: '3px', fontFamily: 'JetBrains Mono' }}>
                  via {m.source}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="msg" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: '#151a22', border: '1px solid #1e2530',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
            }}>🧠</div>
            <div style={{
              background: '#111620', border: '1px solid #1e2530',
              borderRadius: '3px 14px 14px 14px', padding: '12px 16px',
              display: 'flex', gap: '4px', alignItems: 'center',
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: project.color,
                  animation: `blink 1.2s infinite ${i*0.2}s`,
                }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{
        padding: '12px 16px 20px', borderTop: '1px solid #1e2530',
        background: '#0f1218', flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'flex-end',
          background: '#151a22', border: `1px solid #1e2530`,
          borderRadius: '12px', padding: '10px 12px',
        }}>
          <textarea
            ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
            placeholder={`${project.name} 작업 요청 · "이어줘" 로 맥락 복구`}
            rows={1}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6,
              fontFamily: 'inherit', maxHeight: '120px', overflowY: 'auto',
            }}
          />
          <button className="send" onClick={send} disabled={loading || !input.trim()} style={{
            width: '34px', height: '34px', borderRadius: '8px', border: 'none',
            background: loading || !input.trim() ? '#1e2530' : project.color,
            color: loading || !input.trim() ? '#4a5568' : '#000',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: '16px', fontWeight: 700, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s',
          }}>↑</button>
        </div>
        <div style={{ fontSize: '11px', color: '#2d3748', marginTop: '5px', paddingLeft: '2px' }}>
          Enter 전송 · Shift+Enter 줄바꿈
        </div>
      </div>

      {/* 프로젝트 선택 메뉴 */}
      {menuOpen && (
        <div className="menu" onClick={() => setMenuOpen(false)}>
          <div className="menu-panel" onClick={e => e.stopPropagation()}>
            <div className="menu-handle" />
            <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {PROJECTS.map(p => (
                <button key={p.id} className="proj-item" onClick={() => { setProject(p); setMenuOpen(false) }} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 12px', borderRadius: '8px', border: 'none',
                  background: project.id === p.id ? `${p.color}15` : 'transparent',
                  borderLeft: project.id === p.id ? `3px solid ${p.color}` : '3px solid transparent',
                  color: '#e2e8f0', cursor: 'pointer', width: '100%', textAlign: 'left',
                  fontFamily: 'inherit',
                }}>
                  <span style={{ fontSize: '20px' }}>{p.emoji}</span>
                  <span style={{ fontSize: '14px', fontWeight: project.id === p.id ? 700 : 400, color: project.id === p.id ? p.color : '#e2e8f0' }}>
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

<script src="/js/brainpool-debug.js" />