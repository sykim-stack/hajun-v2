// hajunai-v3.2 — 문제 누적 시스템 + 보안/버그 수정

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ─── 환경 변수 검증 ─────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY  // 🔥 서비스 롤 대신 anon key 사용
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO  = process.env.GITHUB_REPO
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase credentials')
}

// ─── 간단한 메모리 캐시 (GitHub 파일) ───────────────────────
let githubCache: { data: any[]; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5분

// ─── Supabase 클라이언트 (익명 키 + RLS 의존) ────────────────
function getSupabaseClient(authHeader?: string | null): SupabaseClient {
  // authHeader가 있으면 사용자 JWT로 클라이언트 생성 (RLS 적용)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = authHeader.slice(7)
    return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    })
  }
  // 인증 없으면 anon 키로 (익명 접근, RLS에 따라 제한)
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
}

const CORE_FILES = [
  'api/rooms.js',
  'house.html',
]

// ─── 시스템 프롬프트 (HANDOFF는 요청 시에만) ─────────────────
const SYSTEM_PROMPT_BASE = `너는 하준AI다.

규칙:
- 짧고 명확하게
- 코드 요청 시만 제공
- [USER CONTEXT] 기반 판단

만약 사용자가 "핸드오프" 또는 "HANDOFF"를 요청하면 아래 형식으로 출력하고, 그 외에는 일반 대화:

=== HANDOFF ===
프로젝트: {name}
스택: {stack}
마지막 작업: {last_task}

[완료]
{completed_tasks}

[미완료]
{pending_tasks}

[PROBLEMS]
- 문제 | status | cause | solution (해결된 문제는 status: solved)

[핵심 파일]
{key_files}

[다음 할 것]
{next_tasks}

[최근 대화 요약]
{recent_messages}
==============`

const SUMMARIZE_PROMPT = `사용자의 마지막 메시지에서 "완료", "마무리", "finished", "구현 완료" 등의 표현이 있을 때만 요약해줘. 없다면 "진행 중" 이라고만 출력. 요약은 동사+목적어 형태 50자 이내.`

interface ChatRequest {
  message: string
  project_id: string
}

// ─── 메인 핸들러 ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const supabase = getSupabaseClient(authHeader)

    const { message, project_id }: ChatRequest = await req.json()
    if (!message || !project_id) {
      return NextResponse.json({ error: '필수값 누락' }, { status: 400 })
    }

    // 사용자가 이 프로젝트에 접근 권한이 있는지 확인 (RLS에 맡기거나 별도 체크)
    const { error: accessError } = await supabase
      .from('contexts')
      .select('project_id')
      .eq('project_id', project_id)
      .maybeSingle()
    if (accessError) {
      return NextResponse.json({ error: '프로젝트 접근 권한 없음' }, { status: 403 })
    }

    const [context, savedUserMsg] = await Promise.all([
      loadContext(supabase, project_id),
      supabase.from('messages').insert({ project_id, role: 'user', content: message })
    ])

    const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n[USER CONTEXT]\n${context}`

    let answer: string | null = null
    let source = ''

    answer = await askGroq(systemPrompt, message)
    if (answer) source = 'groq'

    if (!answer) {
      answer = await askGemini(systemPrompt, message)
      if (answer) source = 'gemini'
    }

    if (!answer) {
      return NextResponse.json({ error: 'AI 응답 실패' }, { status: 503 })
    }

    // 🔥 last_task 자동 업데이트 (조건부 + AI 재호출 없이 응답에서 추출)
    const lastTaskUpdate = await extractLastTaskFromAnswer(message, answer)

    // 🔥 문제 상태 업데이트 (개선된 로직)
    const problemUpdate = await updateProblemStatus(supabase, project_id, answer)

    await Promise.all([
      supabase.from('messages').insert({ project_id, role: 'assistant', content: answer, ai_source: source }),
      lastTaskUpdate ? supabase.from('contexts').upsert({
        project_id,
        last_task: lastTaskUpdate,
        updated_at: new Date()
      }, { onConflict: 'project_id' }) : Promise.resolve(),
      problemUpdate
    ])

    return NextResponse.json({ answer, source })

  } catch (err) {
    console.error('API 오류:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// ─── Context 로드 (개별 실패 허용) ─────────────────────────
async function loadContext(supabase: SupabaseClient, project_id: string): Promise<string> {
  const results = await Promise.allSettled([
    supabase.from('contexts')
      .select('summary,last_task,next_tasks,current_problems,phase,completed_tasks,key_files,stack')
      .eq('project_id', project_id).single(),
    supabase.from('messages')
      .select('role,content,created_at')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false }).limit(20),
    supabase.from('documents')
      .select('title,content,created_at')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false }).limit(5),
    loadGithubFilesWithCache()
  ])

  const ctxResult = results[0].status === 'fulfilled' ? results[0].value.data : null
  const msgs = results[1].status === 'fulfilled' ? (results[1].value.data || []) : []
  const docs = results[2].status === 'fulfilled' ? (results[2].value.data || []) : []
  const githubFiles = results[3].status === 'fulfilled' ? results[3].value : []

  let text = ''

  if (ctxResult) {
    text += `[프로젝트]\n`
    text += `스택: ${ctxResult.stack || ''}\n`
    text += `단계: ${ctxResult.phase || ''}\n`
    text += `요약: ${ctxResult.summary || ''}\n`
    text += `마지막작업: ${ctxResult.last_task || ''}\n\n`

    if (ctxResult.completed_tasks?.length) {
      text += `[완료]\n`
      ctxResult.completed_tasks.forEach((t: string) => text += `✅ ${t}\n`)
      text += '\n'
    }

    if (ctxResult.next_tasks?.length) {
      text += `[다음]\n`
      ctxResult.next_tasks.forEach((t: string) => text += `- ${t}\n`)
      text += '\n'
    }

    if (ctxResult.current_problems) {
      text += `[PROBLEMS]\n${normalizeProblems(ctxResult.current_problems)}\n\n`
    }
  }

  if (docs.length > 0) {
    text += `[기록]\n`
    docs.forEach(d => text += `- ${d.title}: ${d.content.slice(0, 500)}\n`)
    text += '\n'
  }

  if (githubFiles.length > 0) {
    text += `[코드]\n`
    githubFiles.forEach(f => {
      text += `\n### ${f.path}\n${f.content.slice(0, 800)}\n`
    })
    text += '\n'
  }

  if (msgs.length > 0) {
    text += `[대화]\n`
    text += msgs.reverse().map(m =>
      `${m.role === 'user' ? '👤' : '🤖'} ${m.content.slice(0, 200)}`
    ).join('\n')
  }

  return text
}

// ─── 문제 정규화 (기존 status 유지, 없으면 open 추가) ──────
function normalizeProblems(raw: string): string {
  if (!raw) return ''
  return raw.split('\n')
    .filter(Boolean)
    .map(line => {
      if (line.includes('status:')) return line
      return `${line} | status: open`
    })
    .join('\n')
}

// ─── GitHub 파일 로드 (base64 디코딩 + 캐싱) ───────────────
async function loadGithubFilesWithCache() {
  if (!GITHUB_REPO) return []

  if (githubCache && (Date.now() - githubCache.timestamp) < CACHE_TTL) {
    return githubCache.data
  }

  const results: any[] = []
  await Promise.all(
    CORE_FILES.map(async (filePath) => {
      try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`
        const res = await fetch(url, {
          headers: GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}
        })
        if (!res.ok) return
        const data = await res.json()
        // 🔥 GitHub API는 content를 base64로 반환
        const content = Buffer.from(data.content, 'base64').toString('utf-8')
        results.push({ path: filePath, content })
      } catch (err) {
        console.error(`GitHub 파일 로드 실패: ${filePath}`, err)
      }
    })
  )

  githubCache = { data: results, timestamp: Date.now() }
  return results
}

// ─── last_task 조건부 추출 (AI 재호출 없이) ─────────────────
async function extractLastTaskFromAnswer(userMsg: string, aiAnswer: string): Promise<string | null> {
  const completeKeywords = ['완료', '마무리', 'finished', '구현 완료', '처리 완료', 'done']
  const hasCompletion = completeKeywords.some(kw => 
    userMsg.includes(kw) || aiAnswer.includes(kw)
  )
  if (!hasCompletion) return null

  // 간단한 요약: 사용자 메시지와 AI 답변에서 첫 문장 추출
  const firstLine = (userMsg + ' ' + aiAnswer).split(/[.!?]\s/)[0].slice(0, 100)
  return firstLine
}

// ─── 개선된 문제 상태 업데이트 (해결된 문제만 감지) ─────────
async function updateProblemStatus(supabase: SupabaseClient, project_id: string, aiAnswer: string) {
  const { data: ctx } = await supabase
    .from('contexts')
    .select('current_problems')
    .eq('project_id', project_id)
    .single()

  if (!ctx?.current_problems) return

  const problems = ctx.current_problems.split('\n').filter(Boolean)
  const updatedProblems = problems.map(problem => {
    // 이미 solved면 그대로
    if (problem.includes('status: solved')) return problem

    // AI 응답에 문제 키워드가 포함되어 있고 해결 표현이 있으면 solved 처리
    const problemText = problem.split('|')[0].trim()
    const solvedIndicators = ['해결', '수정', '처리', 'fixed', 'resolved', '완료']
    const isSolved = solvedIndicators.some(ind => 
      aiAnswer.includes(ind) && (aiAnswer.includes(problemText) || problemText.length < 30)
    )
    if (isSolved) {
      // solution 추가 (간단히 AI 응답 앞부분)
      const solution = aiAnswer.slice(0, 100).replace(/\n/g, ' ')
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
}

// ─── AI 호출 함수 (기존과 동일하나 에러 로깅 추가) ─────────
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
  } catch (err) {
    console.error('Groq 오류:', err)
    return null
  }
}

async function askGemini(sys: string, user: string) {
  if (!GEMINI_API_KEY) return null
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: sys }] },
        contents: [{ role: 'user', parts: [{ text: user }] }]
      })
    })
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null
  } catch (err) {
    console.error('Gemini 오류:', err)
    return null
  }
}