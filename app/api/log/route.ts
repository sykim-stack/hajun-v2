// hajunai-v2/app/api/log/route.ts

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { service, error_type, message, url, env } = body

    if (!service || !error_type) {
      return NextResponse.json({ error: '필수값 누락' }, { status: 400 })
    }

    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/error_logs`,
      {
        method: 'POST',
        headers: {
          'apikey':          process.env.SUPABASE_ANON_KEY!,
          'Authorization':   `Bearer ${process.env.SUPABASE_ANON_KEY!}`,
          'Content-Type':    'application/json',
          'Prefer':          'return=minimal',
        },
        body: JSON.stringify({
          service,
          error_type,
          message:    (message || '').slice(0, 500),
          url:        (url     || '').slice(0, 200),
          env:        env || 'unknown',
        })
      }
    )

    if (!res.ok) {
      const detail = await res.text()
      return NextResponse.json({ error: 'DB 저장 실패', detail }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}