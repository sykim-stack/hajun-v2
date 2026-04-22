'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SupabaseConfig {
  url: string
  apiKey: string
  isConnected: boolean
  lastSync: string
}

export default function SettingsPage() {
  const [config, setConfig] = useState<SupabaseConfig>({
    url: '',
    apiKey: '',
    isConnected: false,
    lastSync: ''
  })
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState('')

  // 로컬스토리지에서 설정 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem('supabase_config')
      if (stored) {
        const parsed = JSON.parse(stored)
        setConfig(parsed)
      }
    } catch {}
  }, [])

  const saveConfig = () => {
    localStorage.setItem('supabase_config', JSON.stringify(config))
    setMessage('✅ 설정이 저장되었습니다')
    setTimeout(() => setMessage(''), 3000)
  }

  const testConnection = async () => {
    if (!config.url || !config.apiKey) {
      setMessage('❌ URL과 API Key를 입력해주세요')
      return
    }

    setTesting(true)
    setMessage('🔄 연결 테스트 중...')

    try {
      // 간단한 Supabase 연결 테스트
      const response = await fetch(`${config.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'apikey': config.apiKey
        }
      })

      if (response.ok) {
        setConfig(prev => ({
          ...prev,
          isConnected: true,
          lastSync: new Date().toISOString()
        }))
        setMessage('✅ Supabase 연결 성공!')
        localStorage.setItem('supabase_config', JSON.stringify({
          ...config,
          isConnected: true,
          lastSync: new Date().toISOString()
        }))
      } else {
        setMessage('❌ 연결 실패: 인증 정보를 확인해주세요')
      }
    } catch (e) {
      setMessage(`❌ 오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0a0c10', color: '#e2e8f0' }}>
      
      {/* 헤더 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2530', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Link href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>← 홈</Link>
        <span>⚙️ Supabase 설정</span>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', maxWidth: '600px' }}>
        
        {/* 상태 표시 */}
        <div style={{ marginBottom: '20px', padding: '12px', background: config.isConnected ? '#1e3a1e' : '#3a1e1e', borderRadius: '8px', borderLeft: `4px solid ${config.isConnected ? '#00ff9d' : '#ff6b6b'}` }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            {config.isConnected ? '✅ 연결됨' : '❌ 연결 안 됨'}
          </div>
          {config.lastSync && (
            <div style={{ fontSize: '12px', color: '#4a5568' }}>
              마지막 동기화: {new Date(config.lastSync).toLocaleString('ko-KR')}
            </div>
          )}
        </div>

        {/* 설정 폼 */}
        <div style={{ padding: '16px', background: '#1e2530', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Supabase 인증 정보</h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#4a5568', marginBottom: '6px' }}>
              Supabase URL
            </label>
            <input 
              type="text"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="https://your-project.supabase.co"
              style={{ 
                width: '100%', 
                padding: '8px', 
                background: '#0a0c10', 
                color: '#e2e8f0', 
                border: '1px solid #2d3748', 
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '4px' }}>
              Supabase 프로젝트 설정에서 복사할 수 있습니다
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#4a5568', marginBottom: '6px' }}>
              API Key (anon/public)
            </label>
            <input 
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="eyJhbGc..."
              style={{ 
                width: '100%', 
                padding: '8px', 
                background: '#0a0c10', 
                color: '#e2e8f0', 
                border: '1px solid #2d3748', 
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '4px' }}>
              보안상 민감한 정보입니다. 절대 공개하지 마세요
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={saveConfig}
              style={{ 
                flex: 1, 
                padding: '8px', 
                background: '#2563eb', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer'
              }}
            >
              저장
            </button>
            <button 
              onClick={testConnection}
              disabled={testing}
              style={{ 
                flex: 1, 
                padding: '8px', 
                background: testing ? '#4a5568' : '#2d3748', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: testing ? 'not-allowed' : 'pointer'
              }}
            >
              {testing ? '테스트 중...' : '연결 테스트'}
            </button>
          </div>
        </div>

        {/* 메시지 */}
        {message && (
          <div style={{ 
            padding: '12px', 
            background: message.includes('✅') ? '#1e3a1e' : '#3a1e1e', 
            borderRadius: '8px', 
            marginBottom: '20px',
            fontSize: '12px'
          }}>
            {message}
          </div>
        )}

        {/* 정보 */}
        <div style={{ padding: '16px', background: '#1e2530', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>ℹ️ 정보</h3>
          
          <div style={{ fontSize: '12px', color: '#a0aec0', display: 'grid', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>🔐 보안</div>
              <div>
                Supabase 설정은 브라우저 로컬스토리지에 저장됩니다. 
                공유 컴퓨터에서는 사용하지 않는 것을 권장합니다.
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>🔄 동기화</div>
              <div>
                설정을 저장한 후 연결 테스트를 통해 Supabase와의 연결을 확인할 수 있습니다.
                연결이 성공하면 아이디어, 맥락, 일정 데이터가 자동으로 동기화됩니다.
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>📚 도움말</div>
              <div>
                Supabase 프로젝트 생성 및 API Key 발급 방법:
                <br />1. <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>supabase.com</a> 방문
                <br />2. 새 프로젝트 생성
                <br />3. 프로젝트 설정에서 URL과 API Key 복사
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
