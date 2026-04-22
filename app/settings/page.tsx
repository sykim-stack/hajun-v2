'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { COLORS } from '@/lib/constants'

interface SupabaseConfig {
  url: string
  apiKey: string
  isConnected: boolean
  lastSync: string | null
}

export default function SettingsPage() {
  const [config, setConfig] = useState<SupabaseConfig>({ url: '', apiKey: '', isConnected: false, lastSync: null })
  const [message, setMessage] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('supabase_config')
      if (stored) setConfig(JSON.parse(stored))
    } catch {}
  }, [])

  const saveConfig = () => {
    try {
      localStorage.setItem('supabase_config', JSON.stringify(config))
      setMessage('✅ 설정이 저장되었습니다')
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setMessage('❌ 저장 실패')
    }
  }

  const testConnection = async () => {
    if (!config.url || !config.apiKey) {
      setMessage('❌ URL과 API Key를 입력해주세요')
      return
    }
    setTesting(true)
    try {
      const res = await fetch(`${config.url}/rest/v1/contexts?limit=1`, {
        headers: { apikey: config.apiKey, Authorization: `Bearer ${config.apiKey}` }
      })
      if (res.ok || res.status === 406) {
        const updated = { ...config, isConnected: true, lastSync: new Date().toISOString() }
        setConfig(updated)
        localStorage.setItem('supabase_config', JSON.stringify(updated))
        setMessage('✅ 연결 성공! Supabase와 정상 통신됩니다')
      } else {
        setConfig(prev => ({ ...prev, isConnected: false }))
        setMessage(`❌ 연결 실패 (${res.status})`)
      }
    } catch {
      setConfig(prev => ({ ...prev, isConnected: false }))
      setMessage('❌ 네트워크 오류 — URL을 확인해주세요')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <Link href="/" className="back-link">← 홈</Link>
        <span className="page-title">⚙️ 설정</span>
      </header>

      <div className="page-body">
        {/* 연결 상태 */}
        <div className={`status-card ${config.isConnected ? 'status-ok' : 'status-err'}`}>
          <div className="status-icon">{config.isConnected ? '✅' : '❌'}</div>
          <div>
            <div className="status-text">{config.isConnected ? 'Supabase 연결됨' : 'Supabase 연결 안 됨'}</div>
            {config.lastSync && (
              <div className="status-sub">마지막 동기화: {new Date(config.lastSync).toLocaleString('ko-KR')}</div>
            )}
          </div>
        </div>

        {/* 설정 폼 */}
        <div className="settings-panel">
          <h3 className="panel-title">Supabase 인증 정보</h3>
          <div className="form-group">
            <label className="form-label">Supabase URL</label>
            <input type="text" value={config.url} onChange={e => setConfig({ ...config, url: e.target.value })}
              placeholder="https://your-project.supabase.co" className="form-input" />
            <span className="form-hint">Supabase 프로젝트 설정 → API 탭에서 복사</span>
          </div>
          <div className="form-group">
            <label className="form-label">API Key (anon/public)</label>
            <input type="password" value={config.apiKey} onChange={e => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="eyJhbGc..." className="form-input" />
            <span className="form-hint">보안상 민감한 정보입니다. 절대 공개하지 마세요</span>
          </div>
          <div className="form-actions">
            <button onClick={saveConfig} className="btn-primary">저장</button>
            <button onClick={testConnection} disabled={testing} className={`btn-secondary ${testing ? 'btn-disabled' : ''}`}>
              {testing ? '테스트 중...' : '연결 테스트'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`message-box ${message.includes('✅') ? 'msg-ok' : 'msg-err'}`}>{message}</div>
        )}

        {/* 환경변수 안내 */}
        <div className="info-panel">
          <h3 className="panel-title">🔧 서버 환경변수 설정</h3>
          <p className="info-text">API 라우트는 서버 환경변수를 사용합니다. 배포 환경에 따라 설정하세요:</p>
          <div className="env-block">
            <div className="env-line"><span className="env-key">SUPABASE_URL</span><span className="env-val">= https://your-project.supabase.co</span></div>
            <div className="env-line"><span className="env-key">SUPABASE_ANON_KEY</span><span className="env-val">= eyJhbGc...</span></div>
            <div className="env-line"><span className="env-key">GROQ_API_KEY</span><span className="env-val">= gsk_... (선택)</span></div>
            <div className="env-line"><span className="env-key">GEMINI_API_KEY</span><span className="env-val">= AIza... (선택)</span></div>
          </div>
          <div className="info-steps">
            <div className="info-step"><span className="step-num">1</span><span>로컬: 프로젝트 루트에 <code>.env.local</code> 파일 생성</span></div>
            <div className="info-step"><span className="step-num">2</span><span>Vercel: Dashboard → Settings → Environment Variables</span></div>
          </div>
        </div>

        {/* 도움말 */}
        <div className="info-panel">
          <h3 className="panel-title">📚 Supabase 설정 방법</h3>
          <div className="info-steps">
            <div className="info-step"><span className="step-num">1</span><span><a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="info-link">supabase.com</a> 방문 후 프로젝트 생성</span></div>
            <div className="info-step"><span className="step-num">2</span><span>프로젝트 Settings → API 탭 이동</span></div>
            <div className="info-step"><span className="step-num">3</span><span>Project URL과 anon/public key 복사 후 위 폼에 입력</span></div>
            <div className="info-step"><span className="step-num">4</span><span>연결 테스트 버튼으로 확인</span></div>
          </div>
        </div>
      </div>

      <style>{`
        .page-shell { display: flex; flex-direction: column; min-height: 100dvh; background: ${COLORS.bg}; color: ${COLORS.text}; }
        .page-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid ${COLORS.border}; }
        .back-link { color: ${COLORS.accent}; text-decoration: none; font-size: 13px; }
        .page-title { font-size: 15px; font-weight: 700; }
        .page-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 16px; max-width: 640px; }
        .status-card { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 10px; }
        .status-ok  { background: #1a3a1a; border: 1px solid ${COLORS.success}44; }
        .status-err { background: #3a1a1a; border: 1px solid ${COLORS.danger}44; }
        .status-icon { font-size: 20px; }
        .status-text { font-size: 13px; font-weight: 700; }
        .status-sub { font-size: 11px; color: ${COLORS.muted}; margin-top: 2px; }
        .settings-panel, .info-panel { background: ${COLORS.surface}; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
        .panel-title { font-size: 13px; font-weight: 700; color: ${COLORS.text}; }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-label { font-size: 11px; color: ${COLORS.muted}; font-weight: 600; }
        .form-input { padding: 9px 12px; background: ${COLORS.bg}; color: ${COLORS.text}; border: 1px solid ${COLORS.border}; border-radius: 6px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; transition: border-color 0.15s; }
        .form-input:focus { border-color: ${COLORS.accent}; }
        .form-hint { font-size: 10px; color: ${COLORS.muted}; }
        .form-actions { display: flex; gap: 10px; }
        .btn-primary { flex: 1; padding: 10px; background: ${COLORS.accent}; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
        .btn-primary:hover { opacity: 0.85; }
        .btn-secondary { flex: 1; padding: 10px; background: ${COLORS.border}; color: ${COLORS.text}; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
        .btn-secondary:hover { background: ${COLORS.muted}; }
        .btn-disabled { opacity: 0.5; cursor: not-allowed; }
        .message-box { padding: 12px; border-radius: 8px; font-size: 13px; }
        .msg-ok  { background: #1a3a1a; color: ${COLORS.success}; border: 1px solid ${COLORS.success}44; }
        .msg-err { background: #3a1a1a; color: ${COLORS.danger}; border: 1px solid ${COLORS.danger}44; }
        .info-text { font-size: 12px; color: ${COLORS.textSub}; }
        .env-block { background: ${COLORS.bg}; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 4px; font-family: monospace; font-size: 11px; }
        .env-line { display: flex; gap: 4px; flex-wrap: wrap; }
        .env-key { color: ${COLORS.accent}; }
        .env-val { color: ${COLORS.textSub}; }
        .info-steps { display: flex; flex-direction: column; gap: 8px; }
        .info-step { display: flex; align-items: flex-start; gap: 10px; font-size: 12px; color: ${COLORS.textSub}; }
        .step-num { background: ${COLORS.accent}; color: #fff; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; }
        .info-link { color: ${COLORS.accent}; }
        code { background: ${COLORS.border}; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
        @media (max-width: 480px) { .page-body { padding: 12px; } .form-actions { flex-direction: column; } }
      `}</style>
    </div>
  )
}
