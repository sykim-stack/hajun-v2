// hajunai-v2 — 개발 맥락 유지 보조 AI
// 목적: 토큰 끊겨도 맥락 이어주기

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const SYSTEM_PROMPT = `너는 하준AI다. 1인 개발자 김상열의 개발 맥락을 유지해주는 보조 AI다.
규칙:
- 불필요한 서두, 칭찬 금지
- 답변은 짧고 명확하게
- 코드는 요청할 때만 완성형으로
- [USER CONTEXT]가 유일한 기억이다

사용자가 "맥락 이어줘" / "이어줘" / "handoff" 입력 시:
[USER CONTEXT]를 읽고 아래 형식으로만 출력. 다른 말 붙이지 말 것.

=== HANDOFF ===
프로젝트: {name}
마지막 작업: {last_task}
요약: {summary}
최근 작업: {Recent Work Logs 핵심만 2~3줄 요약}
다음 할 것: {next_tasks}
==============`

const SUMMARIZE_PROMPT = `아래 대화에서 완료한 작업을 50자 이내로 요약. 형식: 동사+목적어. 예: "CoreNull 사진 그리드 수정". 요약문만 출력.`

interface ChatRequest {
  message: string
  project_id: string
}

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

async function loadContext(project_id: string): Promise<string> {
  const [ctxRes, msgsRes, docsRes] = await Promise.all([
    supabase.from('contexts').select('summary,last_task,next_tasks,current_problems,phase').eq('project_id', project_id).single(),
    supabase.from('messages').select('role,content').eq('project_id', project_id).order('created_at', { ascending: false }).limit(6),
    supabase.from('documents').select('title,content,created_at').eq('project_id', project_id).order('created_at', { ascending: false }).limit(3)
  ])

  const ctx  = ctxRes.data
  const msgs = msgsRes.data || []
  const docs = docsRes.data || []

  let text = `요약: ${ctx?.summary || '없음'}\n`
  text += `마지막작업: ${ctx?.last_task || '없음'}\n`
  text += `다음할것: ${JSON.stringify(ctx?.next_tasks || [])}\n`
  text += `현재문제: ${ctx?.current_problems || '없음'}\n\n`

  if (docs.length > 0) {
    text += `[최근 작업 기록]\n`
    docs.forEach(d => { text += `- ${d.title}: ${d.content.slice(0, 150)}\n` })
    text += '\n'
  }

  if (msgs.length > 0) {
    text += `[최근 대화]\n`
    text += msgs.reverse().map(m => `${m.role}: ${m.content.slice(0, 120)}`).join('\n')
  }

  return text
}

async function autoUpdateLastTask(project_id: string, userMsg: string, aiAns: string) {
  try {
    const summary = await askGroq(SUMMARIZE_PROMPT, `사용자: ${userMsg}\nAI: ${aiAns}`)
    if (summary) {
      await supabase.from('contexts')
        .upsert({ project_id, last_task: summary, updated_at: new Date() }, { onConflict: 'project_id' })
    }
  } catch {}
}

async function askGroq(sys: string, user: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
        temperature: 0.5,
        max_tokens: 1024
      })
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content || null
  } catch { return null }
}

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