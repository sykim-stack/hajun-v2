'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const PROJECTS = [
  { id: '82423554-fa71-42cc-a297-90a65747113b', name: 'HajunAI' },
  { id: 'c38f5b9a-14ab-4a36-85e2-b58289a4e4e6', name: 'CoreRing' },
  { id: '13196994-00d5-4d7f-9436-619f07f5bd45', name: 'CoreChat' },
  { id: '66666666-0000-0000-0000-000000000006', name: 'CoreNull' },
  { id: '0a385ad1-4735-4967-978c-3a9aa7588613', name: 'CoreRoad' },
  { id: '8f7e37b0-a19b-448f-a568-5bd8fd6bb3ff', name: 'CoreHub' },
  { id: '2a9aa9b2-6eaa-4386-a8af-8345e9c4a4d2', name: 'MindWorld' },
]

interface KPIData {
  totalActions: number
  executedActions: number
  executionRate: number
  ideaCount: number
  confirmedIdeas: number
  scheduledCount: number
}

export default function KPIPage() {
  const [kpiData, setKpiData] = useState<Record<string, KPIData>>({})

  useEffect(() => {
    // 각 프로젝트별 KPI 계산
    const data: Record<string, KPIData> = {}

    PROJECTS.forEach(project => {
      try {
        // 아이디어 데이터 로드
        const ideasRaw = localStorage.getItem(`ideas_${project.id}`)
        const ideas = ideasRaw ? JSON.parse(ideasRaw) : []
        const confirmedIdeas = ideas.filter((i: any) => i.status === '반영확정').length

        // 일정 데이터 로드
        const schedulesRaw = localStorage.getItem(`schedules_${project.id}`)
        const schedules = schedulesRaw ? JSON.parse(schedulesRaw) : []

        // 맥락 데이터 로드
        const contextsRaw = localStorage.getItem('contexts')
        const contexts = contextsRaw ? JSON.parse(contextsRaw) : {}
        const context = contexts[project.id]

        // KPI 계산 (더미 데이터 기반)
        const totalActions = Math.max(ideas.length + schedules.length, 1)
        const executedActions = confirmedIdeas + Math.floor(schedules.length * 0.6)
        const executionRate = Math.round((executedActions / totalActions) * 100)

        data[project.id] = {
          totalActions,
          executedActions,
          executionRate,
          ideaCount: ideas.length,
          confirmedIdeas,
          scheduledCount: schedules.length
        }
      } catch {
        data[project.id] = {
          totalActions: 0,
          executedActions: 0,
          executionRate: 0,
          ideaCount: 0,
          confirmedIdeas: 0,
          scheduledCount: 0
        }
      }
    })

    setKpiData(data)
  }, [])

  const getColor = (rate: number) => {
    if (rate >= 80) return '#00ff9d' // 초록색
    if (rate >= 60) return '#ffd700' // 황색
    if (rate >= 40) return '#ff9d00' // 주황색
    return '#ff6b6b' // 빨강색
  }

  const totalRate = PROJECTS.length > 0
    ? Math.round(
        PROJECTS.reduce((sum, p) => sum + (kpiData[p.id]?.executionRate || 0), 0) / PROJECTS.length
      )
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0a0c10', color: '#e2e8f0' }}>
      
      {/* 헤더 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2530', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Link href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>← 홈</Link>
        <span>📈 Execution Rate KPI</span>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        
        {/* 전체 KPI */}
        <div style={{ marginBottom: '20px', padding: '16px', background: '#1e2530', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '8px' }}>전체 실행률</div>
          <div style={{ fontSize: '48px', fontWeight: 700, color: getColor(totalRate), marginBottom: '8px' }}>
            {totalRate}%
          </div>
          <div style={{ fontSize: '12px', color: '#4a5568' }}>
            {PROJECTS.length}개 프로젝트 평균
          </div>
        </div>

        {/* 프로젝트별 KPI */}
        <h3>프로젝트별 Execution Rate</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
          {PROJECTS.map(project => {
            const kpi = kpiData[project.id]
            if (!kpi) return null

            return (
              <div key={project.id} style={{ padding: '12px', background: '#1e2530', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, marginBottom: '12px' }}>{project.name}</div>

                {/* 진행률 바 */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                    <span>실행률</span>
                    <span style={{ color: getColor(kpi.executionRate), fontWeight: 600 }}>
                      {kpi.executionRate}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#0a0c10', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${kpi.executionRate}%`,
                      height: '100%',
                      background: getColor(kpi.executionRate),
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* 상세 정보 */}
                <div style={{ fontSize: '12px', color: '#4a5568', display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>💡 아이디어</span>
                    <span>{kpi.ideaCount} (확정: {kpi.confirmedIdeas})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>📅 일정</span>
                    <span>{kpi.scheduledCount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>✅ 실행</span>
                    <span>{kpi.executedActions} / {kpi.totalActions}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 해석 */}
        <div style={{ marginTop: '20px', padding: '12px', background: '#1e2530', borderRadius: '8px', fontSize: '12px', color: '#a0aec0' }}>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>📊 해석</div>
          <div>
            Execution Rate는 생성된 모든 행동(아이디어 + 일정) 대비 실제 실행된 행동의 비율입니다.
            이 수치는 UX 문제, AI 품질, 구조 문제를 한 번에 판단할 수 있는 핵심 지표입니다.
          </div>
        </div>
      </div>
    </div>
  )
}
