// hajunai-v3.1 — 문제 누적 시스템 적용 버전

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase ─────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// ─── GitHub 설정 ─────────────────────────────────────────
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO  = process.env.GITHUB_REPO

const CORE_FILES = [
  'api/rooms.js',
  'house.html',
]

// ─── 시스템 프롬프트 ─────────────────────────────────────
const SYSTEM_PROMPT = `너는 하준AI다.

규칙:
- 짧고 명확하게
- 코드 요청 시만 제공
- [USER CONTEXT] 기반 판단

HANDOFF 요청 시 아래 형식만 출력:

=== HANDOFF ===
프로젝트: {name}
스택: {stack}
마지막 작업: {last_task}

[완료]
{completed_tasks}

[미완료]
{pending_tasks}

[PROBLEMS]
- 문제 | status | cause | solution

[핵심 파일]
{key_files}

[다음 할 것]
{next_tasks}

[최근 대화 요약]
{recent_messages}
==============`

const SUMMARIZE_PROMPT = `완료 작업을 50자 이내로 요약. 동사+목적어 형태.`

interface ChatRequest {
  message: string
  project_id: string
}

// ─── 메인 ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { message, project_id }: ChatRequest = await req.json()
    if (!message || !project_id) {
      return NextResponse.json({ error: '필수값 누락' }, { status: 400 })
    }

    const [context] = await Promise.all([
      loadContext(project_id),
      supabase.from('messages').insert({ project_id, role: 'user', content: message })
    ])

    const systemPrompt = `${SYSTEM_PROMPT}\n\n[USER CONTEXT]\n${context}`

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

    await Promise.all([
      supabase.from('messages').insert({ project_id, role: 'assistant', content: answer, ai_source: source }),
      autoUpdateLastTask(project_id, message, answer),
      updateProblemStatus(project_id, answer) // 🔥 핵심 추가
    ])

    return NextResponse.json({ answer, source })

  } catch (err) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// ─── 문제 정규화 ───────────────────────────────────────
function normalizeProblems(raw: string): string {
  if (!raw) return ''

  return raw
    .split('\n')
    .filter(Boolean)
    .map((line, i) => {
      if (line.includes('status:')) return line
      return `${i + 1}. ${line} | status: open`
    })
    .join('\n')
}

// ─── Context 로드 ─────────────────────────────────────
async function loadContext(project_id: string): Promise<string> {
  const [ctxRes, msgsRes, docsRes, githubFiles] = await Promise.all([
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
    loadGithubFiles()
  ])

  const ctx = ctxRes.data
  const msgs = msgsRes.data || []
  const docs = docsRes.data || []

  let text = ''

  text += `[프로젝트]\n`
  text += `스택: ${ctx?.stack || ''}\n`
  text += `단계: ${ctx?.phase || ''}\n`
  text += `요약: ${ctx?.summary || ''}\n`
  text += `마지막작업: ${ctx?.last_task || ''}\n\n`

  if (ctx?.completed_tasks?.length) {
    text += `[완료]\n`
    ctx.completed_tasks.forEach((t: string) => text += `✅ ${t}\n`)
    text += '\n'
  }

  if (ctx?.next_tasks?.length) {
    text += `[다음]\n`
    ctx.next_tasks.forEach((t: string) => text += `- ${t}\n`)
    text += '\n'
  }

  if (ctx?.current_problems) {
    text += `[PROBLEMS]\n${normalizeProblems(ctx.current_problems)}\n\n`
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

// ─── GitHub ───────────────────────────────────────────
async function loadGithubFiles() {
  if (!GITHUB_REPO) return []

  const results: any[] = []

  await Promise.all(
    CORE_FILES.map(async (filePath) => {
      try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`
        const res = await fetch(url)
        if (!res.ok) return
        const content = await res.text()
        results.push({ path: filePath, content })
      } catch {}
    })
  )

  return results
}

// ─── 문제 상태 업데이트 🔥 ─────────────────────────────
async function updateProblemStatus(project_id: string, solution: string) {
  const { data: ctx } = await supabase
    .from('contexts')
    .select('current_problems')
    .eq('project_id', project_id)
    .single()

  if (!ctx?.current_problems) return

  const updated = ctx.current_problems
    .split('\n')
    .map(line => {
      if (line.includes('status: open')) {
        return line.replace('status: open', 'status: solved') + ` | solution: ${solution.slice(0, 100)}`
      }
      return line
    })
    .join('\n')

  await supabase
    .from('contexts')
    .update({ current_problems: updated })
    .eq('project_id', project_id)
}

// ─── last_task ───────────────────────────────────────
async function autoUpdateLastTask(project_id: string, userMsg: string, aiAns: string) {
  const summary = await askGroq(SUMMARIZE_PROMPT, userMsg + aiAns)
  if (!summary) return

  await supabase
    .from('contexts')
    .upsert({
      project_id,
      last_task: summary,
      updated_at: new Date()
    }, { onConflict: 'project_id' })
}

// ─── AI ─────────────────────────────────────────────
async function askGroq(sys: string, user: string) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
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
  } catch { return null }
}

async function askGemini(sys: string, user: string) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: sys }] },
        contents: [{ role: 'user', parts: [{ text: user }] }]
      })
    })
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null
  } catch { return null }
}