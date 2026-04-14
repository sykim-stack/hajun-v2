// hajunai-v3.4 — Dev/Control + Action Router + 타입 안정화 (배포용)

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ─── 환경 변수 ─────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase credentials')
}

// ─── 타입 ─────────────────────────────────────────
interface ChatRequest {
  message: string
  project_id: string
  mode?: 'dev' | 'control'
}

// ─── Supabase ─────────────────────────────────────
function getSupabaseClient(authHeader?: string | null): SupabaseClient {
  if (authHeader?.startsWith('Bearer ')) {
    const jwt = authHeader.slice(7)
    return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    })
  }
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
}

// ─── Action Router ─────────────────────────────────
function routeAction(text: string) {
  if (!text) return null

  if (text.includes('번역') || text.includes('언어')) {
    return { action: 'CoreRing', type: 'translate' }
  }
  if (text.includes('갈등') || text.includes('오해')) {
    return { action: 'CoreChat', type: 'guide' }
  }
  if (text.includes('이동') || text.includes('배달')) {
    return { action: 'CoreRoad', type: 'route' }
  }
  if (text.includes('운영') || text.includes('관리')) {
    return { action: 'CoreHub', type: 'manage' }
  }

  return null
}

// ─── 메인 ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const supabase = getSupabaseClient(authHeader)

    const { message, project_id, mode = 'dev' }: ChatRequest = await req.json()

    if (!message || !project_id) {
      return NextResponse.json({ error: '필수값 누락' }, { status: 400 })
    }

    const context = await loadContext(supabase, project_id)

    // ─── 프롬프트 분기 ─────────────────────────
    let systemPrompt = ''

    if (mode === 'dev') {
      systemPrompt = `
[USER CONTEXT]
${context}

규칙:
- 이전 작업을 이어서 진행
- 새로 시작 금지
- 반드시 다음 작업 1개 제시
`
    } else {
      systemPrompt = `
[USER CONTEXT]
${context}

규칙:
- 문제 분석
- 해결 여부 판단
- 상태 정리
`
    }

    // ─── AI 호출 ─────────────────────────
    let answer: string | null = await askGroq(systemPrompt, message)
    if (!answer) answer = await askGemini(systemPrompt, message)

    if (!answer) {
      return NextResponse.json({ error: 'AI 응답 실패' }, { status: 503 })
    }

    // ─── Action Router 결과 ─────────────────
    let actions: string[] = []

    if (mode === 'control') {
      actions = await updateProblemStatus(supabase, project_id, answer)
    }

    // ─── Dev Mode 흐름 유지 ─────────────────
    if (mode === 'dev') {
      answer += `

👉 다음 작업:
- 이어서 진행할 작업 1개`
    }

    return NextResponse.json({
      answer,
      actions
    })

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

// ─── 문제 상태 업데이트 ─────────────────────────
async function updateProblemStatus(
  supabase: SupabaseClient,
  project_id: string,
  aiAnswer: string
): Promise<string[]> {

  const { data: ctx } = await supabase
    .from('contexts')
    .select('current_problems')
    .eq('project_id', project_id)
    .single()

  if (!ctx?.current_problems) return []

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

      const route = routeAction(problemText)
      if (route) {
        actionLogs.push(`👉 추천: ${route.action} (${route.type})`)
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

  return actionLogs
}

// ─── AI ─────────────────────────────────────────
async function askGroq(sys: string, user: string) {
  if (!GROQ_API_KEY) return null
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`
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