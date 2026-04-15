'use client'

import { useState, useRef, useEffect } from 'react'

const PROJECTS = [
  { id: '82423554-fa71-42cc-a297-90a65747113b', name: 'HajunAI',   emoji: '🧠', desc: 'BRAINPOOL 관제탑',         color: '#ff9d00' },
  { id: 'c38f5b9a-14ab-4a36-85e2-b58289a4e4e6', name: 'CoreRing',  emoji: '🌐', desc: '한-베 번역 데이터 엔진',   color: '#00ff9d' },
  { id: '13196994-00d5-4d7f-9436-619f07f5bd45', name: 'CoreChat',  emoji: '💬', desc: '국제결혼 특화 번역 AI',    color: '#ff6b9d' },
  { id: '66666666-0000-0000-0000-000000000006', name: 'CoreNull',  emoji: '🏘️', desc: '한-베 디지털 마을 커뮤니티', color: '#f0b429' },
  { id: '0a385ad1-4735-4967-978c-3a9aa7588613', name: 'CoreRoad',  emoji: '🛵', desc: '배달 라이더 GPS 검증',     color: '#00c8ff' },
  { id: '8f7e37b0-a19b-448f-a568-5bd8fd6bb3ff', name: 'CoreHub',   emoji: '🏊', desc: '수영장 운영 인텔리전스',   color: '#ffd700' },
  { id: '2a9aa9b2-6eaa-4386-a8af-8345e9c4a4d2', name: 'MindWorld', emoji: '🧩', desc: '감정·의도 분석 로직 엔진', color: '#bf7fff' },
]

// ✅ 수정: HAJUNAI_ 접두사 환경변수 사용
const SUPABASE_URL = process.env.NEXT_PUBLIC_HAJUNAI_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_HAJUNAI_SUPABASE_ANON_KEY
const CHAT_STORAGE_KEY = 'hajunai_chat_v1'
const CHAT_TTL_MS = 24 * 60 * 60 * 1000

// ================================
// Supabase REST API
// ================================
async function fetchContexts() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/contexts?select=*`, {
    headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  return res.json()
}

async function saveContext(
  project_id: string,
  last_task: string,
  summary: string,
  extra?: {
    code_context?: string
    decisions?: string
    architecture?: string
    current_problems?: string
  }
) {
  const body: Record<string, any> = {
    project_id,
    last_task,
    summary,
    updated_at: new Date().toISOString(),
  }
  if (extra?.code_context)     body.code_context = extra.code_context
  if (extra?.decisions)        body.decisions = extra.decisions
  if (extra?.architecture)     body.architecture = extra.architecture
  if (extra?.current_problems) body.current_problems = extra.current_problems

  // ✅ upsert 방식으로 교체
  const res = await fetch(`${SUPABASE_URL}/rest/v1/contexts?on_conflict=project_id`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

// ================================
// localStorage 채팅 캐시
// ================================
interface Message { role: 'user' | 'assistant'; content: string; source?: string }
interface StoredChat { projectId: string; messages: Message[]; savedAt: number }

function loadChat(projectId: string): Message[] {
  try {
    const raw = localStorage.getItem(`${CHAT_STORAGE_KEY}_${projectId}`)
    if (!raw) return []
    const stored: StoredChat = JSON.parse(raw)
    if (Date.now() - stored.savedAt > CHAT_TTL_MS) {
      localStorage.removeItem(`${CHAT_STORAGE_KEY}_${projectId}`)
      return []
    }
    return stored.messages
  } catch { return [] }
}

function persistChat(projectId: string, messages: Message[]) {
  try {
    localStorage.setItem(
      `${CHAT_STORAGE_KEY}_${projectId}`,
      JSON.stringify({ projectId, messages, savedAt: Date.now() })
    )
  } catch {}
}

// ================================
// 루트 컴포넌트
// ================================
export default function Home() {
  const [view, setView] = useState<'chat' | 'control'>('chat')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=JetBrains+Mono:wght@300;400;600;700&family=Orbitron:wght@400;700;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{height:100%;overflow:hidden;background:#0a0c10;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#1e2530;border-radius:2px;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .msg-anim{animation:fadeIn 0.2s ease;}
        .send-btn{transition:all 0.15s;}
        .send-btn:hover:not(:disabled){opacity:0.85;transform:scale(1.05);}
      `}</style>

      <div style={{
        display: 'flex', flexDirection: 'column', height: '100dvh',
        background: '#0a0c10', color: '#e2e8f0',
        fontFamily: "'Noto Sans KR', sans-serif", overflow: 'hidden',
      }}>
        {/* 공통 헤더 */}
        <div style={{
          background: '#0f1218', borderBottom: '1px solid #1e2530',
          padding: '12px 16px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🧠</span>
            <div>
              <div style={{
                fontSize: '15px', fontWeight: 700,
                background: 'linear-gradient(90deg,#00d4ff,#7c3aed)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                letterSpacing: '1px', whiteSpace: 'nowrap',
              }}>HAJUN AI</div>
              <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '2px' }}>BRAINPOOL · PHASE 0</div>
            </div>
          </div>

          {/* 토글 */}
          <div style={{
            display: 'flex', background: '#0a0c10', border: '1px solid #1e2530',
            borderRadius: '10px', padding: '3px', gap: '2px', flexShrink: 0,
          }}>
            {(['chat', 'control'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '7px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600, fontFamily: "'Noto Sans KR',sans-serif",
                transition: 'all 0.15s', whiteSpace: 'nowrap',
                background: view === v ? 'linear-gradient(135deg,rgba(0,212,255,0.2),rgba(124,58,237,0.2))' : 'transparent',
                color: view === v ? '#00d4ff' : '#4a5568',
              }}>{v === 'chat' ? '💬 채팅' : '🎛 관제탑'}</button>
            ))}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: '#151a22', border: '1px solid #1e2530',
            borderRadius: '20px', padding: '4px 10px',
            fontSize: '11px', fontFamily: 'monospace', flexShrink: 0,
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
            <span>ON</span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {view === 'chat' ? <ChatView /> : <ControlView />}
        </div>
      </div>
    </>
  )
}

// ================================
// 채팅 뷰
// ================================
function ChatView() {
  const [selectedProject, setSelectedProject] = useState(PROJECTS[0])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMessages(loadChat(selectedProject.id))
  }, [selectedProject.id])

  useEffect(() => {
    if (messages.length > 0) persistChat(selectedProject.id, messages)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedProject.id])

  const handleProjectChange = (p: typeof PROJECTS[0]) => {
    setSelectedProject(p)
    setSidebarOpen(false)
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, project_id: selectedProject.id }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.error ? `❌ 오류: ${data.error}` : data.answer,
        source: data.source,
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ 네트워크 오류', source: 'error' }])
    } finally { setLoading(false) }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const srcColor = (s?: string) =>
    s === 'groq' ? '#f59e0b' : s === 'gemini' ? '#3b82f6' : s === 'gpt' ? '#10b981' : '#6b7280'

  return (
    <>
      <style>{`
        .overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10;}
        .chat-sidebar{
          width:220px;flex-shrink:0;background:#0f1218;
          border-right:1px solid #1e2530;
          display:flex;flex-direction:column;padding:16px 12px;gap:4px;overflow-y:auto;
        }
        .proj-btn:hover{background:rgba(0,212,255,0.06)!important;}
        @media(max-width:640px){
          .overlay.open{display:block;}
          .chat-sidebar{position:fixed!important;left:0;top:0;bottom:0;z-index:20;transform:translateX(-100%);transition:transform .25s ease;}
          .chat-sidebar.open{transform:translateX(0)!important;}
          .hamburger{display:flex!important;}
          .mobile-tag{display:flex!important;}
        }
        @media(min-width:641px){
          .hamburger{display:none!important;}
          .mobile-tag{display:none!important;}
        }
      `}</style>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className={`overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* 사이드바 */}
        <div className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div style={{ fontSize: '11px', color: '#4a5568', letterSpacing: '2px', padding: '0 8px', marginBottom: '8px' }}>PROJECTS</div>
          {PROJECTS.map(p => (
            <button key={p.name} className="proj-btn" onClick={() => handleProjectChange(p)} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: selectedProject.name === p.name
                ? 'linear-gradient(135deg,rgba(0,212,255,0.1),rgba(124,58,237,0.1))' : 'transparent',
              borderLeft: selectedProject.name === p.name ? '2px solid #00d4ff' : '2px solid transparent',
              color: '#e2e8f0', textAlign: 'left', width: '100%',
            }}>
              <span style={{ fontSize: '18px' }}>{p.emoji}</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: '#718096' }}>{p.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* 메인 채팅 영역 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* 채팅 헤더 */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #1e2530',
            display: 'flex', alignItems: 'center', gap: '10px',
            background: '#0f1218', flexShrink: 0,
          }}>
            <button className="hamburger" onClick={() => setSidebarOpen(true)} style={{
              display: 'none', background: 'none', border: 'none',
              color: '#718096', fontSize: '22px', cursor: 'pointer', padding: '2px 6px',
            }}>☰</button>
            <span style={{ fontSize: '20px' }}>{selectedProject.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{selectedProject.name}</div>
              <div style={{ fontSize: '11px', color: '#718096' }}>{selectedProject.desc}</div>
            </div>
            {messages.length > 0 && (
              <button onClick={() => {
                setMessages([])
                localStorage.removeItem(`${CHAT_STORAGE_KEY}_${selectedProject.id}`)
              }} style={{
                background: 'none', border: '1px solid #1e2530', borderRadius: '6px',
                color: '#4a5568', fontSize: '11px', padding: '4px 10px', cursor: 'pointer',
              }}>초기화</button>
            )}
          </div>

          {/* 메시지 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.length === 0 && (
              <div style={{ margin: 'auto', textAlign: 'center', color: '#4a5568' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>{selectedProject.emoji}</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#718096' }}>{selectedProject.name}</div>
                <div style={{ fontSize: '13px', marginTop: '8px', lineHeight: 1.8, color: '#4a5568' }}>
                  맥락이 자동으로 이어집니다.<br />어떤 작업을 도와드릴까요?
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className="msg-anim" style={{
                display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                gap: '10px', alignItems: 'flex-start',
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  background: msg.role === 'user' ? 'linear-gradient(135deg,#7c3aed,#00d4ff)' : 'linear-gradient(135deg,#1e2530,#2d3748)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
                }}>{msg.role === 'user' ? '👤' : '🧠'}</div>

                <div style={{ maxWidth: 'min(75%,520px)' }}>
                  <div style={{
                    background: msg.role === 'user' ? 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(0,212,255,0.2))' : '#151a22',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(124,58,237,0.3)' : '#1e2530'}`,
                    borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    padding: '12px 16px', fontSize: '15px', lineHeight: '1.85',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>{msg.content}</div>
                  {msg.source && msg.role === 'assistant' && (
                    <div style={{ marginTop: '4px', fontSize: '11px', fontFamily: 'monospace', color: srcColor(msg.source), paddingLeft: '4px' }}>
                      via {msg.source.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="msg-anim" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'linear-gradient(135deg,#1e2530,#2d3748)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
                }}>🧠</div>
                <div style={{
                  background: '#151a22', border: '1px solid #1e2530',
                  borderRadius: '4px 16px 16px 16px', padding: '14px 18px',
                  display: 'flex', gap: '5px', alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '6px', height: '6px', borderRadius: '50%', background: '#00d4ff',
                      animation: `bounce 1s infinite ${i * 0.15}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid #1e2530', background: '#0f1218', flexShrink: 0 }}>
            <div className="mobile-tag" style={{ display: 'none', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span style={{ fontSize: '14px' }}>{selectedProject.emoji}</span>
              <span style={{ fontSize: '13px', color: '#718096', fontWeight: 500 }}>{selectedProject.name}</span>
              <button onClick={() => setSidebarOpen(true)} style={{
                marginLeft: 'auto', background: 'none', border: '1px solid #1e2530',
                borderRadius: '6px', color: '#718096', fontSize: '11px', padding: '3px 10px', cursor: 'pointer',
              }}>변경</button>
            </div>

            <div style={{
              display: 'flex', gap: '10px', alignItems: 'flex-end',
              background: '#151a22', border: '1px solid #1e2530', borderRadius: '14px', padding: '10px 14px',
            }}>
              <textarea
                ref={textareaRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`${selectedProject.name}에 대해 작업 요청...`}
                rows={1}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#e2e8f0', fontSize: '15px', lineHeight: '1.6',
                  resize: 'none', fontFamily: 'inherit', maxHeight: '120px', overflowY: 'auto',
                }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement
                  t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px'
                }}
              />
              <button className="send-btn" onClick={handleSend} disabled={loading || !input.trim()} style={{
                width: '36px', height: '36px', borderRadius: '10px', border: 'none', flexShrink: 0,
                background: loading || !input.trim() ? '#1e2530' : 'linear-gradient(135deg,#00d4ff,#7c3aed)',
                color: loading || !input.trim() ? '#4a5568' : '#000',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
              }}>↑</button>
            </div>
            <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '6px', paddingLeft: '2px' }}>
              Enter 전송 · Shift+Enter 줄바꿈 · 24시간 자동 보관
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ================================
// 관제탑 뷰
// ================================
function ControlView() {
  const [contexts, setContexts] = useState<Record<string, any>>({})
  const [selected, setSelected] = useState<typeof PROJECTS[0] | null>(null)
  const [memo, setMemo] = useState('')
  const [summary, setSummary] = useState('')
  const [codeContext, setCodeContext] = useState('')
  const [decisions, setDecisions] = useState('')
  const [architecture, setArchitecture] = useState('')
  const [currentProblems, setCurrentProblems] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [now, setNow] = useState(new Date())
  const [mobilePanel, setMobilePanel] = useState<'list' | 'edit'>('list')

  useEffect(() => {
    loadContexts()
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  async function loadContexts() {
    try {
      const data = await fetchContexts()
      const map: Record<string, any> = {}
      if (Array.isArray(data)) data.forEach((d: any) => { map[d.project_id] = d })
      setContexts(map)
    } catch (e) { console.error(e) }
  }

  function selectProject(p: typeof PROJECTS[0]) {
    setSelected(p)
    const ctx = contexts[p.id]
    setMemo(ctx?.last_task || '')
    setSummary(ctx?.summary || '')
    setCodeContext(ctx?.code_context || '')
    setDecisions(ctx?.decisions || '')
    setArchitecture(ctx?.architecture || '')
    setCurrentProblems(ctx?.current_problems || '')
    setSaved(false)
    setMobilePanel('edit')
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    await saveContext(selected.id, memo, summary, {
      code_context: codeContext,
      decisions,
      architecture,
      current_problems: currentProblems,
    })
    await loadContexts()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const fmtTime = (d: Date) => d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const fmtDate = (d: Date) => d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <>
      <style>{`
        .ctrl-list{
          width:260px;min-width:260px;border-right:1px solid #0f2030;
          padding:20px 12px;overflow-y:auto;background:#050a0e;flex-shrink:0;
        }
        .ctrl-edit{flex:1;padding:28px 24px;overflow-y:auto;background:#050a0e;min-width:0;}
        .proj-card{
          border:1px solid #1a2a3a;border-radius:8px;padding:14px;
          cursor:pointer;transition:all 0.2s ease;
          background:#080f16;position:relative;overflow:hidden;
        }
        .proj-card:hover{border-color:#2a4a6a;background:#0a1520;transform:translateY(-1px);}
        .proj-card.active{background:#0a1a2a;}
        .pulse-dot{animation:pulse 2s infinite;}
        .ctrl-textarea{
          resize:none;outline:none;
          border:1px solid #1a2a3a;background:#040810;
          color:#a0c8e0;border-radius:6px;padding:14px;
          font-family:'JetBrains Mono',monospace;
          font-size:13px;line-height:1.7;width:100%;transition:border-color 0.2s;
        }
        .ctrl-textarea:focus{border-color:#2a5a8a;}
        .ctrl-label{font-size:13px;color:#2a6a5a;letter-spacing:2px;margin-bottom:8px;}
        .btn-save{
          background:linear-gradient(135deg,#0a3a5a,#1a5a8a);
          border:1px solid #2a7ab0;color:#80d0ff;
          padding:12px 28px;border-radius:6px;cursor:pointer;
          font-family:'JetBrains Mono',monospace;
          font-size:13px;font-weight:600;letter-spacing:1px;transition:all 0.2s;
        }
        .btn-save:hover{background:linear-gradient(135deg,#1a5a8a,#2a7ab0);transform:translateY(-1px);}
        .btn-save:disabled{opacity:0.5;cursor:not-allowed;}
        .card-last-task{
          font-size:11px;color:#4a7a6a;background:#030810;
          border:1px solid #0a2020;border-radius:4px;padding:6px 8px;
          line-height:1.5;overflow:hidden;white-space:nowrap;
          text-overflow:ellipsis;max-width:100%;
        }
        @media(max-width:640px){
          .ctrl-list{width:100%!important;min-width:0!important;border-right:none!important;}
          .ctrl-list.hide{display:none!important;}
          .ctrl-edit.hide{display:none!important;}
          .ctrl-edit{padding:20px 16px!important;}
          .back-btn{display:flex!important;}
        }
        @media(min-width:641px){
          .back-btn{display:none!important;}
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', fontFamily: "'JetBrains Mono',monospace" }}>
        {/* 서브헤더 */}
        <div style={{
          borderBottom: '1px solid #0f2030', padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(5,10,14,0.98)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="back-btn" onClick={() => setMobilePanel('list')} style={{
              display: 'none', background: 'none', border: '1px solid #1a2a3a',
              borderRadius: '6px', color: '#4a7a9a', fontSize: '13px',
              padding: '5px 12px', cursor: 'pointer', alignItems: 'center', gap: '4px',
            }}>← 목록</button>
            <div style={{ fontFamily: "'Orbitron',monospace", fontSize: '13px', fontWeight: 900, letterSpacing: '2px', color: '#00c8ff' }}>
              CONTROL TOWER
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Orbitron',monospace", fontSize: '15px', fontWeight: 700, color: '#00ff9d', letterSpacing: '2px' }}>
              {fmtTime(now)}
            </div>
            <div style={{ fontSize: '11px', color: '#3a6a8a' }}>{fmtDate(now)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* 프로젝트 목록 */}
          <div className={`ctrl-list ${mobilePanel === 'edit' ? 'hide' : ''}`}>
            <div style={{ fontSize: '12px', color: '#2a5a7a', letterSpacing: '2px', marginBottom: '12px', paddingLeft: '4px' }}>
              PROJECTS ({PROJECTS.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {PROJECTS.map(p => {
                const ctx = contexts[p.id]
                const isActive = selected?.id === p.id
                return (
                  <div key={p.id} className={`proj-card ${isActive ? 'active' : ''}`}
                    style={{ borderColor: isActive ? p.color + '60' : '#1a2a3a' }}
                    onClick={() => selectProject(p)}
                  >
                    <div style={{
                      position: 'absolute', top: 0, left: 0, width: '3px', height: '100%',
                      background: p.color, borderRadius: '8px 0 0 8px', opacity: isActive ? 1 : 0.3,
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', gap: '6px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: isActive ? p.color : '#6a9ab0', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {p.emoji} {p.name}
                      </div>
                      <div className={ctx?.last_task ? '' : 'pulse-dot'} style={{
                        width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                        background: ctx?.last_task ? '#00ff9d' : '#ff4444',
                      }} />
                    </div>
                    <div style={{ fontSize: '12px', color: '#3a6a7a', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginBottom: ctx?.last_task ? '6px' : 0 }}>
                      {p.desc}
                    </div>
                    {ctx?.last_task && (
                      <div className="card-last-task">{ctx.last_task}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 편집 패널 */}
          <div className={`ctrl-edit ${mobilePanel === 'list' ? 'hide' : ''}`}>
            {!selected ? (
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: 0.4,
              }}>
                <div style={{ fontSize: '44px' }}>🎯</div>
                <div style={{ fontFamily: "'Orbitron',monospace", fontSize: '13px', color: '#2a5a7a', letterSpacing: '2px' }}>
                  SELECT A PROJECT
                </div>
                <div style={{ fontSize: '13px', color: '#1a3a5a' }}>좌측에서 프로젝트를 선택하세요</div>
              </div>
            ) : (
              <div>
                {/* 프로젝트 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '4px', height: '40px', background: selected.color, borderRadius: '2px', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Orbitron',monospace", fontSize: '18px', fontWeight: 700,
                      color: selected.color, letterSpacing: '2px',
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    }}>{selected.name}</div>
                    <div style={{ fontSize: '13px', color: '#3a6a8a' }}>{selected.desc}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: '3px',
                      fontSize: '12px', fontWeight: 600, letterSpacing: '1px',
                      background: selected.color + '20', color: selected.color, border: `1px solid ${selected.color}40`,
                    }}>PHASE 0</span>
                  </div>
                </div>

                {/* UUID */}
                <div style={{
                  fontSize: '12px', color: '#1a4a6a', background: '#030810',
                  border: '1px solid #0a1a2a', borderRadius: '4px',
                  padding: '8px 12px', marginBottom: '18px', letterSpacing: '1px', wordBreak: 'break-all',
                }}>UUID: {selected.id}</div>

                {/* 마지막 작업 */}
                <div style={{ marginBottom: '18px' }}>
                  <div className="ctrl-label">▸ 마지막 작업</div>
                  <textarea className="ctrl-textarea" rows={3} value={memo}
                    onChange={e => setMemo(e.target.value)}
                    placeholder="마지막으로 완료한 작업을 입력하세요..." />
                </div>

                {/* 프로젝트 요약 */}
                <div style={{ marginBottom: '18px' }}>
                  <div className="ctrl-label">▸ 프로젝트 요약</div>
                  <textarea className="ctrl-textarea" rows={4} value={summary}
                    onChange={e => setSummary(e.target.value)}
                    placeholder="프로젝트 현황 및 주요 내용을 입력하세요..." />
                </div>

                {/* 아키텍처 */}
                <div style={{ marginBottom: '18px' }}>
                  <div className="ctrl-label">▸ 아키텍처</div>
                  <textarea className="ctrl-textarea" rows={3} value={architecture}
                    onChange={e => setArchitecture(e.target.value)}
                    placeholder="기술 스택, 구조, 배포 환경..." />
                </div>

                {/* 핵심 코드 */}
                <div style={{ marginBottom: '18px' }}>
                  <div className="ctrl-label">▸ 핵심 코드</div>
                  <textarea className="ctrl-textarea" rows={3} value={codeContext}
                    onChange={e => setCodeContext(e.target.value)}
                    placeholder="핵심 함수, 컬럼명, API 엔드포인트..." />
                </div>

                {/* 설계 결정 */}
                <div style={{ marginBottom: '18px' }}>
                  <div className="ctrl-label">▸ 설계 결정</div>
                  <textarea className="ctrl-textarea" rows={3} value={decisions}
                    onChange={e => setDecisions(e.target.value)}
                    placeholder="왜 이 방식을 선택했는지, 폐기한 방식과 이유..." />
                </div>

                {/* 현재 문제 */}
                <div style={{ marginBottom: '22px' }}>
                  <div className="ctrl-label">▸ 현재 문제</div>
                  <textarea className="ctrl-textarea" rows={3} value={currentProblems}
                    onChange={e => setCurrentProblems(e.target.value)}
                    placeholder="미해결 버그, 미완성 기능, 다음 작업..." />
                </div>

                {/* 저장 버튼 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button className="btn-save" onClick={handleSave} disabled={saving}>
                    {saving ? 'SAVING...' : '[ SAVE ]'}
                  </button>
                  {saved && <div style={{ fontSize: '14px', color: '#00ff9d' }}>✓ 저장완료</div>}
                </div>

                {contexts[selected.id]?.updated_at && (
                  <div style={{ marginTop: '16px', fontSize: '12px', color: '#1a4a5a' }}>
                    마지막 업데이트: {new Date(contexts[selected.id].updated_at).toLocaleString('ko-KR')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
