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

interface Schedule {
  id: string
  title: string
  description?: string
  scheduledDate: string
  createdAt: string
}

export default function SchedulesPage() {
  const [projectId, setProjectId] = useState(PROJECTS[0].id)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newDesc, setNewDesc] = useState('')

  // 로컬스토리지에서 일정 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`schedules_${projectId}`)
      if (stored) setSchedules(JSON.parse(stored))
      else setSchedules([])
    } catch {
      setSchedules([])
    }
  }, [projectId])

  const saveSchedules = (updated: Schedule[]) => {
    setSchedules(updated)
    localStorage.setItem(`schedules_${projectId}`, JSON.stringify(updated))
  }

  const addSchedule = () => {
    if (!newTitle.trim() || !newDate) return
    const schedule: Schedule = {
      id: `sch_${Date.now()}`,
      title: newTitle,
      description: newDesc,
      scheduledDate: newDate,
      createdAt: new Date().toISOString()
    }
    saveSchedules([...schedules, schedule].sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    ))
    setNewTitle('')
    setNewDate('')
    setNewDesc('')
  }

  const deleteSchedule = (id: string) => {
    saveSchedules(schedules.filter(s => s.id !== id))
  }

  const projectName = PROJECTS.find(p => p.id === projectId)?.name || ''
  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0a0c10', color: '#e2e8f0' }}>
      
      {/* 헤더 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2530', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Link href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>← 홈</Link>
        <span>📅 스마트 캘린더</span>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        
        {/* 프로젝트 선택 및 입력 */}
        <div style={{ marginBottom: '20px', padding: '12px', background: '#1e2530', borderRadius: '8px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', color: '#4a5568' }}>프로젝트</label>
            <select 
              value={projectId} 
              onChange={(e) => setProjectId(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '4px', background: '#0a0c10', color: '#e2e8f0', border: '1px solid #2d3748', borderRadius: '4px' }}
            >
              {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', color: '#4a5568' }}>제목</label>
            <input 
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="일정 제목..."
              style={{ width: '100%', padding: '8px', marginTop: '4px', background: '#0a0c10', color: '#e2e8f0', border: '1px solid #2d3748', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', color: '#4a5568' }}>날짜</label>
            <input 
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '4px', background: '#0a0c10', color: '#e2e8f0', border: '1px solid #2d3748', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', color: '#4a5568' }}>설명</label>
            <textarea 
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="선택사항..."
              style={{ width: '100%', padding: '8px', marginTop: '4px', background: '#0a0c10', color: '#e2e8f0', border: '1px solid #2d3748', borderRadius: '4px', minHeight: '60px' }}
            />
          </div>

          <button 
            onClick={addSchedule}
            style={{ width: '100%', padding: '8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            추가
          </button>
        </div>

        {/* 일정 목록 */}
        <h3>{projectName} 프로젝트의 일정 ({schedules.length})</h3>
        
        {schedules.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#4a5568' }}>
            일정이 없습니다. 새로운 일정을 추가해보세요!
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {schedules.map(schedule => {
              const isToday = schedule.scheduledDate === today
              const isPast = schedule.scheduledDate < today
              
              return (
                <div key={schedule.id} style={{ 
                  padding: '12px', 
                  background: '#1e2530', 
                  borderRadius: '8px', 
                  borderLeft: `4px solid ${isToday ? '#ffd700' : isPast ? '#ff6b6b' : '#2563eb'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{schedule.title}</div>
                      <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '4px' }}>
                        📅 {new Date(schedule.scheduledDate).toLocaleDateString('ko-KR')}
                        {isToday && ' (오늘)'}
                        {isPast && ' (지남)'}
                      </div>
                      {schedule.description && (
                        <div style={{ fontSize: '12px', marginTop: '4px', color: '#a0aec0' }}>
                          {schedule.description}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteSchedule(schedule.id)}
                      style={{ padding: '4px 8px', background: '#ff6b6b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
