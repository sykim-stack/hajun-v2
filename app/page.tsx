'use client'
import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import NavBar from '@/components/NavBar'
import DevPanel from '@/components/DevPanel'
import { PROJECTS, COLORS, AppMode } from '@/lib/constants'
import { loadIdeas, loadContexts, loadSchedules, calcKPI } from '@/lib/storage'
import Link from 'next/link'
import { BrainpoolInsights } from '@/components/BrainpoolInsights'; 
import React from 'react'

// ─── 채팅 캐시 ─────────────────────────────────────────
const TTL = 24 * 60 * 60 * 1000
interface Msg { role: 'user' | 'assistant'; content: string }

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
    localStorage.setItem(`hj2_${pid}`, JSON.stringify({ msgs: msgs.slice(-60), savedAt: Date.now() }))
  } catch {}
}

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase'; // 기존 supabase 클라이언트

interface Insight {
  interpretation_type: string;
  payload: any;
  created_at: string;
}

export function BrainpoolInsights({ projectId }: { projectId: string }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    async function fetchInsights() {
      setLoading(true);
      const supabase = createClient();
      // 프로젝트와 관련된 해석 이벤트 조회: documents, contexts, conversations
      // 복잡한 쿼리: source_id가 project_id인 contexts, 그리고 documents의 project_id 필드는 payload 내부에 있음.
      // 간단히: contexts(project_id = 직접), documents(project_id는 payload.project_id)
      // 여기서는 간단히 최근 10개만 가져오는 예시
      const { data: contextInsights, error: ctxErr } = await supabase
        .from('brainpool_interpretations')
        .select('*')
        .eq('source_type', 'context')
        .eq('source_id', projectId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      const { data: docInsights, error: docErr } = await supabase
        .from('brainpool_interpretations')
        .select('*')
        .eq('source_type', 'document')
        .contains('payload', { project_id: projectId }) // JSONB contains
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (ctxErr || docErr) {
        setError('인사이트를 불러오지 못했습니다.');
      } else {
        const combined = [...(contextInsights || []), ...(docInsights || [])];
        combined.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setInsights(combined.slice(0, 10));
      }
      setLoading(false);
    }
    fetchInsights();
  }, [projectId]);

  if (loading) return <div className="brainpool-loading">🧠 인사이트 로딩 중...</div>;
  if (error) return <div className="brainpool-error">{error}</div>;
  if (insights.length === 0) return <div className="brainpool-empty">아직 BRAINPOOL 해석이 없습니다. 백필을 실행하세요.</div>;

  return (
    <div className="brainpool-panel" style={{ marginTop: '20px', padding: '16px', background: '#1e2530', borderRadius: '12px' }}>
      <h3 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🧠 BRAINPOOL 해석</span>
        <span style={{ fontSize: '12px', background: '#3fb950', padding: '2px 8px', borderRadius: '20px' }}>Phase 0</span>
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {insights.map(insight => (
          <div key={insight.id} style={{ borderLeft: `3px solid ${insight.interpretation_type === 'memory' ? '#58a6ff' : insight.interpretation_type === 'intent' ? '#f0b429' : '#3fb950'}`, paddingLeft: '12px' }}>
            <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '4px' }}>
              {insight.interpretation_type === 'memory' && '📝 기억'}
              {insight.interpretation_type === 'intent' && '🎯 의도'}
              {insight.interpretation_type === 'emotion' && '💬 감정'}
              {' · '}{new Date(insight.created_at).toLocaleString()}
            </div>
            <div style={{ fontSize: '13px' }}>
              {insight.interpretation_type === 'memory' && (
                <>✍️ {insight.payload.action}: {insight.payload.content_preview}…</>
              )}
              {insight.interpretation_type === 'intent' && (
                <>🎯 현재 의도: {insight.payload.current_intent} → 다음: {insight.payload.next_action}</>
              )}
              {insight.interpretation_type === 'emotion' && (
                <>😌 감정: {insight.payload.emotion} (강도 {insight.payload.intensity})</>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Control 대시보드 ───────────────────────────────────
function ControlDashboard({ projectId }: { projectId: string }) {
  const [ideas, setIdeas]         = useState<ReturnType<typeof loadIdeas>>([])
  const [context, setContext]     = useState<ReturnType<typeof loadContexts>[string] | null>(null)
  const [schedules, setSchedules] = useState<ReturnType<typeof loadSchedules>>([])
  const [kpi, setKpi]             = useState<ReturnType<typeof calcKPI> | null>(null)

  const refresh = () => {
    setIdeas(loadIdeas(projectId))
    const ctx = loadContexts()
    setContext(ctx[projectId] || null)
    setSchedules(loadSchedules(projectId))
    setKpi(calcKPI(projectId))
  }

  useEffect(() => {
    refresh()
    const onUpdate = () => refresh()
    window.addEventListener('context-updated', onUpdate)
    window.addEventListener('schedule-updated', onUpdate)
    return () => {
      window.removeEventListener('context-updated', onUpdate)
      window.removeEventListener('schedule-updated', onUpdate)
    }
  }, [projectId])

  const today          = new Date().toISOString().split('T')[0]
  const todaySchedules = schedules.filter(s => s.scheduledDate === today)
  const pendingIdeas   = ideas.filter(i => i.status === '검토중')
  const confirmed      = ideas.filter(i => i.status === '반영확정')

  return (
    <div className="ctrl-dashboard">
      <div className="ctrl-card ctrl-card-accent">
        <div className="ctrl-card-title">📊 현재 맥락</div>
        {context ? (
          <>
            <div className="ctrl-field"><span className="ctrl-label">요약</span><span className="ctrl-value">{context.summary || '(없음)'}</span></div>
            <div className="ctrl-field"><span className="ctrl-label">마지막 작업</span><span className="ctrl-value">{context.lastTask || '(없음)'}</span></div>
            <div className="ctrl-field"><span className="ctrl-label">다음 행동</span><span className="ctrl-value ctrl-next-action">{context.nextAction || '(없음)'}</span></div>
          </>
        ) : (
          <div className="ctrl-empty">맥락 없음 — <Link href="/contexts" className="ctrl-link">맥락 설정하기</Link></div>
        )}
        <Link href="/contexts" className="ctrl-btn-sm">수정 →</Link>
      </div>

      <div className="ctrl-card">
        <div className="ctrl-card-title">📅 오늘 일정 ({todaySchedules.length})</div>
        {todaySchedules.length === 0 ? (
          <div className="ctrl-empty">오늘 일정 없음</div>
        ) : (
          <ul className="ctrl-list">
            {todaySchedules.slice(0, 3).map(s => <li key={s.id} className="ctrl-list-item">{s.title}</li>)}
            {todaySchedules.length > 3 && <li className="ctrl-list-more">+{todaySchedules.length - 3}개 더</li>}
          </ul>
        )}
        <Link href="/schedules" className="ctrl-btn-sm">전체 보기 →</Link>
      </div>

      <div className="ctrl-card">
        <div className="ctrl-card-title">💡 아이디어 현황</div>
        <div className="ctrl-stats-row">
          <div className="ctrl-stat"><span className="ctrl-stat-num">{pendingIdeas.length}</span><span className="ctrl-stat-label">검토중</span></div>
          <div className="ctrl-stat"><span className="ctrl-stat-num ctrl-stat-green">{confirmed.length}</span><span className="ctrl-stat-label">반영확정</span></div>
          <div className="ctrl-stat"><span className="ctrl-stat-num">{ideas.length}</span><span className="ctrl-stat-label">전체</span></div>
        </div>
        <Link href="/ideas" className="ctrl-btn-sm">아이디어 관리 →</Link>
      </div>

      {kpi && (
        <div className="ctrl-card">
          <div className="ctrl-card-title">📈 실행률</div>
          <div className="ctrl-kpi-bar-wrap">
            <div className="ctrl-kpi-bar-bg">
              <div className="ctrl-kpi-bar-fill" style={{ width: `${kpi.executionRate}%`, background: kpi.executionRate >= 80 ? COLORS.success : kpi.executionRate >= 60 ? COLORS.warning : kpi.executionRate >= 40 ? '#ff9d00' : COLORS.danger }} />
            </div>
            <span className="ctrl-kpi-pct">{kpi.executionRate}%</span>
          </div>
          <Link href="/kpi" className="ctrl-btn-sm">KPI 상세 →</Link>
          function ControlDashboard({ projectId }) {
  // ... 기존 코드

  return (
    <div className="dashboard">
      {/* 기존 내용들 ... */}
      
      {/* 👇 여기에 추가 */}
      <BrainpoolInsights projectId={projectId} />
    </div>
  );
}
        </div>
      )}

      <style>{`
        .ctrl-dashboard { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; padding: 16px; }
        .ctrl-card { background: ${COLORS.surface}; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; border-left: 3px solid ${COLORS.border}; }
        .ctrl-card-accent { border-left-color: ${COLORS.accent}; }
        .ctrl-card-title { font-size: 13px; font-weight: 700; color: ${COLORS.text}; }
        .ctrl-field { display: flex; flex-direction: column; gap: 2px; }
        .ctrl-label { font-size: 10px; color: ${COLORS.muted}; }
        .ctrl-value { font-size: 12px; color: ${COLORS.textSub}; }
        .ctrl-next-action { color: ${COLORS.warning}; font-weight: 600; }
        .ctrl-empty { font-size: 12px; color: ${COLORS.muted}; }
        .ctrl-link { color: ${COLORS.accent}; text-decoration: none; }
        .ctrl-btn-sm { display: inline-block; margin-top: auto; font-size: 11px; color: ${COLORS.accent}; text-decoration: none; font-weight: 600; }
        .ctrl-btn-sm:hover { text-decoration: underline; }
        .ctrl-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
        .ctrl-list-item { font-size: 12px; color: ${COLORS.textSub}; padding: 4px 0; border-bottom: 1px solid ${COLORS.border}; }
        .ctrl-list-more { font-size: 11px; color: ${COLORS.muted}; }
        .ctrl-stats-row { display: flex; gap: 16px; }
        .ctrl-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .ctrl-stat-num { font-size: 20px; font-weight: 700; color: ${COLORS.text}; }
        .ctrl-stat-green { color: ${COLORS.success}; }
        .ctrl-stat-label { font-size: 10px; color: ${COLORS.muted}; }
        .ctrl-kpi-bar-wrap { display: flex; align-items: center; gap: 10px; }
        .ctrl-kpi-bar-bg { flex: 1; height: 8px; background: ${COLORS.border}; border-radius: 4px; overflow: hidden; }
        .ctrl-kpi-bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s; }
        .ctrl-kpi-pct { font-size: 14px; font-weight: 700; color: ${COLORS.text}; flex-shrink: 0; }
        @media (max-width: 480px) { .ctrl-dashboard { grid-template-columns: 1fr; padding: 12px; } }
      `}</style>
    </div>
  )
}

// ─── AI 채팅 패널 ────────────────────────────────────────
function ChatPanel({ mode }: { mode: AppMode }) {
  const [project, setProject] = useState<typeof PROJECTS[number]>(PROJECTS[0])
  const [msgs, setMsgs]       = useState<Msg[]>([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setMsgs(loadChat(project.id)) }, [project.id])
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
      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, project_id: project.id, mode }),
      })
      const data = await res.json()
      const content = data.actions?.length ? `${data.answer}\n\n${data.actions.join('\n')}` : data.answer
      setMsgs(prev => [...prev, { role: 'assistant', content }])
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: '❌ 네트워크 오류' }])
    } finally { setLoading(false) }
  }

  return (
    <div className="chat-panel">
      <div className="chat-project-bar">
        {PROJECTS.map(p => (
          <button key={p.id} onClick={() => setProject(p)}
            className={`chat-proj-btn ${project.id === p.id ? 'chat-proj-active' : ''}`}
            style={{ borderColor: project.id === p.id ? p.color : 'transparent' }}>
            {p.emoji} <span className="chat-proj-name">{p.name}</span>
          </button>
        ))}
      </div>
      <div className={`chat-mode-banner ${mode === 'dev' ? 'banner-dev' : 'banner-ctrl'}`}>
        {mode === 'dev' ? '🛠 Dev 모드 — 이전 작업 이어서 진행, 다음 작업 1개 제시' : '📊 Control 모드 — 문제 분석, 해결 여부 판단, 상태 정리'}
      </div>
      <div className="chat-messages">
        {msgs.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">🧠</div>
            <div>HajunAI와 대화를 시작하세요</div>
            <div className="chat-empty-sub">{mode === 'dev' ? '개발 흐름을 이어서 진행합니다' : '아이디어와 맥락을 분석합니다'}</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
            <span className="bubble-who">{m.role === 'user' ? '👤' : '🤖'}</span>
            <div className="bubble-content">{m.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-bar">
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          rows={1} className="chat-textarea"
          placeholder={mode === 'dev' ? '개발 상황을 입력하세요...' : '아이디어나 질문을 입력하세요...'} />
        <button onClick={send} disabled={loading} className={`chat-send-btn ${loading ? 'btn-loading' : ''}`}>
          {loading ? '⏳' : '전송'}
        </button>
      </div>
      <style>{`
        .chat-panel { display: flex; flex-direction: column; flex: 1; min-height: 0; }
        .chat-project-bar { display: flex; gap: 6px; padding: 10px 14px; overflow-x: auto; border-bottom: 1px solid ${COLORS.border}; scrollbar-width: none; }
        .chat-project-bar::-webkit-scrollbar { display: none; }
        .chat-proj-btn { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; border: 2px solid transparent; background: ${COLORS.surface}; color: ${COLORS.textSub}; cursor: pointer; font-size: 12px; white-space: nowrap; transition: border-color 0.15s, color 0.15s; flex-shrink: 0; }
        .chat-proj-btn:hover { color: ${COLORS.text}; }
        .chat-proj-active { color: ${COLORS.text}; }
        .chat-mode-banner { padding: 6px 14px; font-size: 11px; font-weight: 600; }
        .banner-dev  { background: #1a2540; color: #7ba3f7; border-bottom: 1px solid #2563eb44; }
        .banner-ctrl { background: #1a2a1a; color: #7bf7a3; border-bottom: 1px solid #00ff9d44; }
        .chat-messages { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
        .chat-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 8px; color: ${COLORS.muted}; text-align: center; padding: 40px 20px; }
        .chat-empty-icon { font-size: 32px; }
        .chat-empty-sub { font-size: 12px; }
        .chat-bubble { display: flex; gap: 8px; max-width: 85%; }
        .bubble-user { align-self: flex-end; flex-direction: row-reverse; }
        .bubble-ai   { align-self: flex-start; }
        .bubble-who  { font-size: 16px; flex-shrink: 0; padding-top: 2px; }
        .bubble-content { padding: 10px 12px; border-radius: 10px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
        .bubble-user .bubble-content { background: ${COLORS.accent}; color: #fff; border-radius: 10px 2px 10px 10px; }
        .bubble-ai   .bubble-content { background: ${COLORS.surface}; color: ${COLORS.text}; border-radius: 2px 10px 10px 10px; }
        .chat-input-bar { display: flex; gap: 8px; padding: 10px 14px; border-top: 1px solid ${COLORS.border}; }
        .chat-textarea { flex: 1; padding: 9px 12px; background: ${COLORS.surface}; color: ${COLORS.text}; border: 1px solid ${COLORS.border}; border-radius: 8px; font-family: inherit; font-size: 13px; resize: none; outline: none; transition: border-color 0.15s; }
        .chat-textarea:focus { border-color: ${COLORS.accent}; }
        .chat-send-btn { padding: 9px 18px; background: ${COLORS.accent}; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: opacity 0.15s; flex-shrink: 0; }
        .chat-send-btn:hover { opacity: 0.85; }
        .btn-loading { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 480px) {
          .chat-proj-name { display: none; }
          .chat-proj-btn { padding: 4px 8px; }
          .bubble-content { font-size: 12px; }
          .chat-bubble { max-width: 92%; }
        }
      `}</style>
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────
export default function Home() {
  const pathname = usePathname()
  const [mode, setMode]           = useState<AppMode>('dev')
  const [projectId, setProjectId] = useState(PROJECTS[0].id)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('app_mode') as AppMode | null
      if (saved === 'dev' || saved === 'control') setMode(saved)
    } catch {}
  }, [])

  const handleModeChange = (m: AppMode) => {
    setMode(m)
    try { localStorage.setItem('app_mode', m) } catch {}
  }

  return (
    <div className="app-shell">
      <NavBar mode={mode} onModeChange={handleModeChange} currentPath={pathname} />
      <div className="app-body">
        {mode === 'dev' && (
          <div className="dev-layout">
            <aside className="dev-sidebar"><DevPanel /></aside>
            <main className="dev-main"><ChatPanel mode={mode} /></main>
          </div>
        )}
        {mode === 'control' && (
          <div className="ctrl-layout">
            <div className="ctrl-top"><ControlDashboard projectId={projectId} /></div>
            <div className="ctrl-bottom"><ChatPanel mode={mode} /></div>
          </div>
        )}
      </div>
      <style>{`
        .app-shell { display: flex; flex-direction: column; height: 100dvh; background: ${COLORS.bg}; color: ${COLORS.text}; overflow: hidden; }
        .app-body { flex: 1; min-height: 0; overflow: hidden; }
        .dev-layout { display: flex; height: 100%; }
        .dev-sidebar { width: 320px; flex-shrink: 0; border-right: 1px solid ${COLORS.border}; overflow-y: auto; }
        .dev-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .ctrl-layout { display: flex; flex-direction: column; height: 100%; }
        .ctrl-top { overflow-y: auto; max-height: 45%; border-bottom: 1px solid ${COLORS.border}; }
        .ctrl-bottom { flex: 1; display: flex; flex-direction: column; min-height: 0; }
        @media (max-width: 768px) {
          .dev-layout { flex-direction: column; }
          .dev-sidebar { width: 100%; max-height: 40%; border-right: none; border-bottom: 1px solid ${COLORS.border}; }
          .ctrl-top { max-height: 50%; }
        }
        @media (max-width: 480px) {
          .dev-sidebar { max-height: 35%; }
          .ctrl-top { max-height: 55%; }
        }
      `}</style>
    </div>
  )
}
