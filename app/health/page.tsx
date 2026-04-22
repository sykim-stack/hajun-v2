'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const PROJECTS = [
  { id: '82423554-fa71-42cc-a297-90a65747113b', name: 'HajunAI', emoji: '🧠' },
  { id: 'c38f5b9a-14ab-4a36-85e2-b58289a4e4e6', name: 'CoreRing', emoji: '🌐' },
  { id: '13196994-00d5-4d7f-9436-619f07f5bd45', name: 'CoreChat', emoji: '💬' },
  { id: '66666666-0000-0000-0000-000000000006', name: 'CoreNull', emoji: '🏘️' },
  { id: '0a385ad1-4735-4967-978c-3a9aa7588613', name: 'CoreRoad', emoji: '🛵' },
  { id: '8f7e37b0-a19b-448f-a568-5bd8fd6bb3ff', name: 'CoreHub', emoji: '🏊' },
  { id: '2a9aa9b2-6eaa-4386-a8af-8345e9c4a4d2', name: 'MindWorld', emoji: '🧩' },
]

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical'
  activity: number
  lastUpdate: string
  ideaCount: number
  nextAction: string
}

export default function HealthPage() {
  const [healthData, setHealthData] = useState<Record<string, HealthStatus>>({})

  useEffect(() => {
    // 각 프로젝트별 헬스 상태 계산
    const data: Record<string, HealthStatus> = {}

    PROJECTS.forEach(project => {
      try {
        // 아이디어 데이터 로드
        const ideasRaw = localStorage.getItem(`ideas_${project.id}`)
        const ideas = ideasRaw ? JSON.parse(ideasRaw) : []

        // 맥락 데이터 로드
        const contextsRaw = localStorage.getItem('contexts')
        const contexts = contextsRaw ? JSON.parse(contextsRaw) : {}
        const context = contexts[project.id]

        // 활성도 계산 (아이디어 수 기반)
        const activity = Math.min(ideas.length * 10, 100)

        // 상태 판단
        let status: 'healthy' | 'warning' | 'critical' = 'critical'
        if (activity >= 70) status = 'healthy'
        else if (activity >= 40) status = 'warning'

        data[project.id] = {
          status,
          activity,
          lastUpdate: context?.updatedAt || new Date().toISOString(),
          ideaCount: ideas.length,
          nextAction: context?.nextAction || '(없음)'
        }
      } catch {
        data[project.id] = {
          status: 'critical',
          activity: 0,
          lastUpdate: new Date().toISOString(),
          ideaCount: 0,
          nextAction: '(없음)'
        }
      }
    })

    setHealthData(data)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#00ff9d'
      case 'warning': return '#ffd700'
      case 'critical': return '#ff6b6b'
      default: return '#4a5568'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return '✅ 건강'
      case 'warning': return '⚠️ 주의'
      case 'critical': return '🔴 위험'
      default: return '❓ 미정'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0a0c10', color: '#e2e8f0' }}>
      
      {/* 헤더 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2530', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Link href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>← 홈</Link>
        <span>🏥 프로젝트 헬스 상태</span>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        
        <h3>BRAINPOOL 8개 프로젝트 상태</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {PROJECTS.map(project => {
            const health = healthData[project.id]
            if (!health) return null

            return (
              <div 
                key={project.id} 
                style={{ 
                  padding: '12px', 
                  background: '#1e2530', 
                  borderRadius: '8px',
                  borderLeft: `4px solid ${getStatusColor(health.status)}`
                }}
              >
                {/* 프로젝트명 및 상태 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 600 }}>
                    {project.emoji} {project.name}
                  </div>
                  <div style={{ fontSize: '12px', color: getStatusColor(health.status), fontWeight: 600 }}>
                    {getStatusText(health.status)}
                  </div>
                </div>

                {/* 활성도 바 */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                    <span>활성도</span>
                    <span>{health.activity}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#0a0c10', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${health.activity}%`,
                      height: '100%',
                      background: getStatusColor(health.status),
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* 상세 정보 */}
                <div style={{ fontSize: '11px', color: '#4a5568', display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>💡 아이디어</span>
                    <span>{health.ideaCount}개</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>🎯 다음 행동</span>
                    <span style={{ maxWidth: '120px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {health.nextAction}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>🕐 마지막 업데이트</span>
                    <span>
                      {new Date(health.lastUpdate).toLocaleDateString('ko-KR', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 범례 */}
        <div style={{ marginTop: '20px', padding: '12px', background: '#1e2530', borderRadius: '8px', fontSize: '12px', color: '#a0aec0' }}>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>📊 상태 범례</div>
          <div style={{ display: 'grid', gap: '6px' }}>
            <div>✅ <span style={{ color: '#00ff9d' }}>건강</span> - 활성도 70% 이상, 정기적인 업데이트</div>
            <div>⚠️ <span style={{ color: '#ffd700' }}>주의</span> - 활성도 40-70%, 개선 필요</div>
            <div>🔴 <span style={{ color: '#ff6b6b' }}>위험</span> - 활성도 40% 미만, 즉시 조치 필요</div>
          </div>
        </div>
      </div>
    </div>
  )
}
