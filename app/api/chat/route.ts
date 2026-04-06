// hajunai-v3 — 8명의 Claude가 공유하는 단일 기억저장소
// 변경사항:
//   1. loadContext() 강화 (대화 20개, 문서 500자)
//   2. GitHub API 연동 (핵심 파일 자동 로드)
//   3. HANDOFF 포맷 개선 (어떤 Claude도 바로 이어받기)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// ─── GitHub 설정 ────────────────────────────────────────────────
const GITHUB_TOKEN = process.env.GITHUB_TOKEN  // optional, rate limit용
const GITHUB_REPO  = process.env.GITHUB_REPO   // 예: 'sykim-stack/corenull'

// 항상 로드할 핵심 파일 목록 (프로젝트에 맞게 수정)
const CORE_FILES = [
  'api/rooms.js',
  'house.html',
  // 필요한 파일 추가
]

// ─── 시스템 프롬프트 ─────────────────────────────────────────────
const SYSTEM_PROMPT = `너는 하준AI다. 1인 개발자 김상열의 개발 맥락을 유지해주는 보조 AI다.
현재 8명의 Claude가 함께 프로젝트를 만들고 있으며, 너는 그 공유 기억저장소다.

규칙:
- 불필요한 서두, 칭찬 금지
- 답변은 짧고 명확하게
- 코드는 요청할 때만 완성형으로
- [USER CONTEXT]가 유일한 기억이다
- GitHub 코드가 있으면 반드시 참고해서 답변

사용자가 "맥락 이어줘" / "이어줘" / "handoff" 입력 시:
[USER CONTEXT]를 읽고 아래 형식으로만 출력. 다른 말 붙이지 말 것.

=== HANDOFF ===
프로젝트: {name}
스택: {stack}
마지막 작업: {last_task}

[완료]
{completed_tasks 목록}

[미완료]
{pending_tasks 목록}

[현재 문제]
{current_problems}

[핵심 파일]
{key_files — 파일명 + 한줄 설명}

[다음 할 것]
{next_tasks}

[최근 대화 요약]
{recent_messages 핵심만 3~5줄}
==============`

const SUMMARIZE_PROMPT = `아래 대화에서 완료한 작업을 50자 이내로 요약. 형식: 동사+목적어. 예: "CoreNull 사진 그리드 수정". 요약문만 출력.`

interface ChatRequest {
  message: string
  project_id: string
}

// ─── 메인 핸들러 ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { message, project_id }: ChatRequest = await req.json()
    if (!message || !project_id) {
      return NextResponse.json({ error: '필수값 누락' }, { status: 400 })
    }

    // 맥락 로드 + 메시지 저장 병렬
    const [context] = await Promise.all([
      loadContext(project_id),
      supabase.from('messages').insert({ project_id, role: 'user', content: message })
    ])

    const systemPrompt = `${SYSTEM_PROMPT}\n\n[USER CONTEXT]\n${context}`

    // AI 호출 (Groq → Gemini 폴백)
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

    // 응답 저장 + last_task 자동 업데이트 (병렬)
    await Promise.all([
      supabase.from('messages').insert({ project_id, role: 'assistant', content: answer, ai_source: source }),
      autoUpdateLastTask(project_id, message, answer)
    ])

    return NextResponse.json({ answer, source })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// ─── loadContext: 풍부한 맥락 로드 ──────────────────────────────
async function loadContext(project_id: string): Promise<string> {
  const [ctxRes, msgsRes, docsRes, githubFiles] = await Promise.all([
    supabase
      .from('contexts')
      .select('summary,last_task,next_tasks,current_problems,phase,completed_tasks,key_files,stack')
      .eq('project_id', project_id)
      .single(),
    supabase
      .from('messages')
      .select('role,content,created_at')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(20),                          // v2: 6 → v3: 20
    supabase
      .from('documents')
      .select('title,content,created_at')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(5),                           // v2: 3 → v3: 5
    loadGithubFiles()                      // v3 신규: GitHub 파일 로드
  ])

  const ctx  = ctxRes.data
  const msgs = msgsRes.data || []
  const docs = docsRes.data || []

  let text = ''

  // ── 프로젝트 기본 정보
  text += `[프로젝트 정보]\n`
  text += `스택: ${ctx?.stack || 'Vercel + Supabase + Vanilla JS'}\n`
  text += `단계: ${ctx?.phase || '개발 중'}\n`
  text += `요약: ${ctx?.summary || '없음'}\n`
  text += `마지막작업: ${ctx?.last_task || '없음'}\n\n`

  // ── 완료/미완료 작업
  if (ctx?.completed_tasks?.length) {
    text += `[완료된 작업]\n`
    ctx.completed_tasks.forEach((t: string) => { text += `✅ ${t}\n` })
    text += '\n'
  }

  if (ctx?.next_tasks?.length) {
    text += `[다음 할 것]\n`
    ctx.next_tasks.forEach((t: string) => { text += `- ${t}\n` })
    text += '\n'
  }

  if (ctx?.current_problems) {
    text += `[현재 문제]\n${ctx.current_problems}\n\n`
  }

  // ── 최근 작업 문서 (v2: 150자 → v3: 500자)
  if (docs.length > 0) {
    text += `[최근 작업 기록]\n`
    docs.forEach(d => {
      text += `- ${d.title}:\n  ${d.content.slice(0, 500)}\n`
    })
    text += '\n'
  }

  // ── GitHub 핵심 파일 (v3 신규)
  if (githubFiles.length > 0) {
    text += `[GitHub 핵심 파일]\n`
    githubFiles.forEach(f => {
      text += `\n### ${f.path}\n${f.content.slice(0, 800)}\n`
    })
    text += '\n'
  }

  // ── 최근 대화 (v2: 6개 → v3: 20개, 역순 복원)
  if (msgs.length > 0) {
    text += `[최근 대화]\n`
    text += msgs
      .reverse()
      .map(m => `${m.role === 'user' ? '👤' : '🤖'} ${m.content.slice(0, 300)}`)
      .join('\n')
  }

  return text
}

// ─── GitHub 파일 로드 ────────────────────────────────────────────
async function loadGithubFiles(): Promise<{ path: string; content: string }[]> {
  if (!GITHUB_REPO) return []

  const results: { path: string; content: string }[] = []

  await Promise.all(
    CORE_FILES.map(async (filePath) => {
      try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`
        const headers: Record<string, string> = {
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'HajunAI'
        }
        if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`

        const res = await fetch(url, { headers })
        if (!res.ok) return

        const content = await res.text()
        results.push({ path: filePath, content })
      } catch {
        // 파일 로드 실패 시 조용히 스킵
      }
    })
  )

  return results
}

// ─── last_task 자동 업데이트 ─────────────────────────────────────
async function autoUpdateLastTask(project_id: string, userMsg: string, aiAns: string) {
  try {
    const summary = await askGroq(SUMMARIZE_PROMPT, `사용자: ${userMsg}\nAI: ${aiAns}`)
    if (summary) {
      await supabase
        .from('contexts')
        .upsert(
          { project_id, last_task: summary, updated_at: new Date() },
          { onConflict: 'project_id' }
        )
    }
  } catch {}
}

// ─── Groq 호출 ──────────────────────────────────────────────────
async function askGroq(sys: string, user: string): Promise<string | null> {
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
          { role: 'user',   content: user }
        ],
        temperature: 0.5,
        max_tokens: 2048    // v2: 1024 → v3: 2048
      })
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content || null
  } catch { return null }
}

// ─── Gemini 폴백 ─────────────────────────────────────────────────
async function askGemini(sys: string, user: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: sys }] },
          contents: [{ role: 'user', parts: [{ text: user }] }]
        })
      }
    )
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null
  } catch { return null }
}

// ─── 작업 완료 push API (Claude가 작업 끝나면 호출) ─────────────
// POST /api/hajunai/complete
// body: { project_id, task, files_changed? }
export async function PUT(req: NextRequest) {
  try {
    const { project_id, task, files_changed } = await req.json()
    if (!project_id || !task) {
      return NextResponse.json({ error: '필수값 누락' }, { status: 400 })
    }

    // completed_tasks 배열에 추가
    const { data: ctx } = await supabase
      .from('contexts')
      .select('completed_tasks,next_tasks')
      .eq('project_id', project_id)
      .single()

    const completed = [...(ctx?.completed_tasks || []), task]
    const next = (ctx?.next_tasks || []).filter((t: string) => t !== task)

    await supabase
      .from('contexts')
      .upsert({
        project_id,
        completed_tasks: completed,
        next_tasks: next,
        last_task: task,
        updated_at: new Date()
      }, { onConflict: 'project_id' })

    // 변경된 파일 문서로 저장
    if (files_changed?.length) {
      await supabase.from('documents').insert({
        project_id,
        title: task,
        content: `변경 파일: ${files_changed.join(', ')}`
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}