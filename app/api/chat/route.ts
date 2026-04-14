// hajunai-v3.3 — 문제 누적 + Action Router 확장 (비침투)

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ─── 환경 변수 검증 ─────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO  = process.env.GITHUB_REPO
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase credentials')
}

// ─── 캐시 ─────────────────────────────────────────
let githubCache: { data: any[]; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

// ─── Supabase ─────────────────────────────────────
function getSupabaseClient(authHeader?: string | null): SupabaseClient {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = authHeader.slice(7)
    return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    })
  }
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
}

const CORE_FILES = ['api/rooms.js', 'house.html']

// ─── Action Router (확장 추가) ─────────────────────
function routeAction(decision: string) {
  if (!decision) return null

  if (decision.includes('번역') || decision.includes('언어')) {
    return { action: 'CoreRing', type: 'translate' }
  }

  if (decision.includes('갈등') || decision.includes('오해')) {
    return { action: 'CoreChat', type: 'guide' }
  }

  if (decision.includes('이동') || decision.includes('배달')) {
    return { action: 'CoreRoad', type: 'route' }
  }

  if (decision.includes('운영') || decision.includes('관리')) {
    return { action: 'CoreHub', type: 'manage' }
  }

  return null
}

// ─── 메인 ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const supabase = getSupabaseClient(authHeader)

    const { message, project_id } = await req.json()
    if (!message || !project_id) {
      return NextResponse.json({ error: '필수값 누락' }, { status: 400 })
    }

    const [context] = await Promise.all([
      loadContext(supabase, project_id)
    ])

    const systemPrompt = `[USER CONTEXT]\n${context}`

    let answer: string | null = await askGroq(systemPrompt, message)
    if (!answer) answer = await askGemini(systemPrompt, message)

    if (!answer) {
      return NextResponse.json({ error: 'AI 응답 실패' }, { status: 503 })
    }

    await updateProblemStatus(supabase, project_id, answer)

    return NextResponse.json({ answer })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// ─── Context ─────────────────────────────────────
async function loadContext(supabase: SupabaseClient, project_id: string): Promise<string> {
  const { data } = await supabase
    .from('contexts')
    .select('*')
    .eq('project_id', project_id)
    .single()

  return JSON.stringify(data || {})
}

// ─── 문제 정규화 ─────────────────────────────────
function normalizeProblems(raw: string): string {
  if (!raw) return ''
  return raw.split('\n')
    .filter(Boolean)
    .map(line => line.includes('status:') ? line : `${line} | status: open`)
    .join('\n')
}

// ─── 문제 상태 업데이트 (확장됨) ─────────────────
async function updateProblemStatus(
  supabase: SupabaseClient,
  project_id: string,
  aiAnswer: string
) {
  const { data: ctx } = await supabase
    .from('contexts')
    .select('current_problems')
    .eq('project_id', project_id)
    .single()

  if (!ctx?.current_problems) return

  const problems: string[] = (ctx.current_problems || '')
    .split('\n')
    .filter(Boolean)

  const actionLogs: string[] = []

  const updatedProblems = problems.map((problem: string) => {
    if (problem.includes('status: solved')) return problem

    const problemText = problem.split('|')[0].trim()
    const solvedIndicators = ['해결', '수정', '처리', 'fixed', 'resolved', '완료']

    const isSolved = solvedIndicators.some(ind =>
      aiAnswer.includes(ind) &&
      (aiAnswer.includes(problemText) || problemText.length < 30)
    )

    if (isSolved) {
      const solution = aiAnswer.slice(0, 100).replace(/\n/g, ' ')

      // 🔥 Action Router
      const route = routeAction(problemText)
      if (route) {
        actionLogs.push(`[ACTION] ${route.action} → ${route.type} | ${problemText}`)
      }

      return `${problem} | status: solved | solution: ${solution}`
    }

    return problem
  }).join('\n')

  if (updatedProblems !== ctx.current_problems) {
    await supabase
      .from('contexts')
      .update({ current_problems: updatedProblems })
      .eq('project_id', project_id)
  }

  // 🔥 Action 로그 기록 (비침투)
  if (actionLogs.length > 0) {
    await supabase.from('messages').insert({
      project_id,
      role: 'assistant',
      content: actionLogs.join('\n')
    })
  }
}

// ─── AI 호출 ─────────────────────────────────────
async function askGroq(sys: string, user: string) {
  if (!GROQ_API_KEY) return null
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user }
        ]
      })
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content || null
  } catch {
    return null
  }
}

async function askGemini(sys: string, user: string) {
  if (!GEMINI_API_KEY) return null
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: user }] }]
        })
      }
    )
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null
  } catch {
    return null
  }
}