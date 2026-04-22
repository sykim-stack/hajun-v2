// ─── localStorage 유틸리티 ─────────────────────────────

export interface Idea {
  id: string
  content: string
  tags: string[]
  status: '검토중' | '반영확정' | '보류'
  createdAt: string
}

export interface Context {
  projectId: string
  summary: string
  lastTask: string
  nextAction: string
  updatedAt: string
}

export interface Schedule {
  id: string
  projectId: string
  title: string
  scheduledDate: string
  description: string
  createdAt: string
}

// ─── 아이디어 ─────────────────────────────────────────
export function loadIdeas(projectId: string): Idea[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`ideas_${projectId}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveIdeas(projectId: string, ideas: Idea[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`ideas_${projectId}`, JSON.stringify(ideas))
  } catch {}
}

// ─── 맥락 ─────────────────────────────────────────────
export function loadContexts(): Record<string, Context> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem('contexts')
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function saveContexts(contexts: Record<string, Context>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('contexts', JSON.stringify(contexts))
  } catch {}
}

/**
 * 아이디어가 '반영확정'으로 변경될 때 해당 프로젝트의 nextAction을 자동 업데이트
 */
export function syncIdeaToNextAction(projectId: string, ideaContent: string): void {
  if (typeof window === 'undefined') return
  try {
    const contexts = loadContexts()
    const ctx = contexts[projectId]
    const updated: Context = {
      projectId,
      summary:    ctx?.summary    || '',
      lastTask:   ctx?.lastTask   || '',
      nextAction: ideaContent,   // 🔥 아이디어 내용을 next_action으로 자동 등록
      updatedAt:  new Date().toISOString(),
    }
    saveContexts({ ...contexts, [projectId]: updated })
    // 커스텀 이벤트로 다른 컴포넌트에 알림
    window.dispatchEvent(new CustomEvent('context-updated', { detail: { projectId } }))
  } catch {}
}

// ─── 일정 ─────────────────────────────────────────────
export function loadSchedules(projectId: string): Schedule[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`schedules_${projectId}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveSchedules(projectId: string, schedules: Schedule[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`schedules_${projectId}`, JSON.stringify(schedules))
    // 일정 변경 시 KPI 갱신 이벤트 발생
    window.dispatchEvent(new CustomEvent('schedule-updated', { detail: { projectId } }))
  } catch {}
}

// ─── KPI 계산 ─────────────────────────────────────────
export interface KPIData {
  totalActions:   number
  executedActions: number
  executionRate:  number
  ideaCount:      number
  confirmedIdeas: number
  scheduledCount: number
}

export function calcKPI(projectId: string): KPIData {
  const ideas     = loadIdeas(projectId)
  const schedules = loadSchedules(projectId)
  const confirmed = ideas.filter(i => i.status === '반영확정').length
  const total     = Math.max(ideas.length + schedules.length, 1)
  const executed  = confirmed + Math.floor(schedules.length * 0.6)
  return {
    totalActions:    total,
    executedActions: executed,
    executionRate:   Math.round((executed / total) * 100),
    ideaCount:       ideas.length,
    confirmedIdeas:  confirmed,
    scheduledCount:  schedules.length,
  }
}
