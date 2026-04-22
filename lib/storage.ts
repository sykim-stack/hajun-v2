// ─── localStorage + Supabase 양방향 동기화 ─────────────────────────

import { createClient, SupabaseClient } from '@supabase/supabase-js'

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

// ─── Supabase 클라이언트 ─────────────────────────────────────────
let supabaseClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  if (supabaseClient) return supabaseClient

  try {
    const config = localStorage.getItem('supabase_config')
    if (!config) return null

    const { url, apiKey } = JSON.parse(config)
    if (!url || !apiKey) return null

    supabaseClient = createClient(url, apiKey)
    return supabaseClient
  } catch {
    return null
  }
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
    // Supabase에도 동기화
    syncIdeasToSupabase(projectId, ideas)
  } catch {}
}

async function syncIdeasToSupabase(projectId: string, ideas: Idea[]): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return
  try {
    await sb
      .from('ideas')
      .upsert(
        ideas.map(i => ({
          id: i.id,
          project_id: projectId,
          content: i.content,
          tags: i.tags,
          status: i.status,
          created_at: i.createdAt,
        })),
        { onConflict: 'id' }
      )
  } catch (err) {
    console.warn('Failed to sync ideas to Supabase:', err)
  }
}

export async function loadIdeasFromSupabase(projectId: string): Promise<Idea[]> {
  const sb = getSupabaseClient()
  if (!sb) return loadIdeas(projectId)
  try {
    const { data } = await sb
      .from('ideas')
      .select('*')
      .eq('project_id', projectId)
    if (!data) return loadIdeas(projectId)
    const ideas = data.map(d => ({
      id: d.id,
      content: d.content,
      tags: d.tags || [],
      status: d.status,
      createdAt: d.created_at,
    }))
    // localStorage에도 저장
    saveIdeas(projectId, ideas)
    return ideas
  } catch {
    return loadIdeas(projectId)
  }
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
    // Supabase에도 동기화
    syncContextsToSupabase(contexts)
  } catch {}
}

async function syncContextsToSupabase(contexts: Record<string, Context>): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return
  try {
    const rows = Object.values(contexts).map(c => ({
      project_id: c.projectId,
      summary: c.summary,
      last_task: c.lastTask,
      next_action: c.nextAction,
      updated_at: c.updatedAt,
    }))
    await sb
      .from('contexts')
      .upsert(rows, { onConflict: 'project_id' })
  } catch (err) {
    console.warn('Failed to sync contexts to Supabase:', err)
  }
}

export async function loadContextsFromSupabase(): Promise<Record<string, Context>> {
  const sb = getSupabaseClient()
  if (!sb) return loadContexts()
  try {
    const { data } = await sb.from('contexts').select('*')
    if (!data) return loadContexts()
    const contexts: Record<string, Context> = {}
    data.forEach(d => {
      contexts[d.project_id] = {
        projectId: d.project_id,
        summary: d.summary || '',
        lastTask: d.last_task || '',
        nextAction: d.next_action || '',
        updatedAt: d.updated_at,
      }
    })
    // localStorage에도 저장
    saveContexts(contexts)
    return contexts
  } catch {
    return loadContexts()
  }
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
      nextAction: ideaContent,
      updatedAt:  new Date().toISOString(),
    }
    saveContexts({ ...contexts, [projectId]: updated })
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
    // Supabase에도 동기화
    syncSchedulesToSupabase(projectId, schedules)
    window.dispatchEvent(new CustomEvent('schedule-updated', { detail: { projectId } }))
  } catch {}
}

async function syncSchedulesToSupabase(projectId: string, schedules: Schedule[]): Promise<void> {
  const sb = getSupabaseClient()
  if (!sb) return
  try {
    await sb
      .from('schedules')
      .upsert(
        schedules.map(s => ({
          id: s.id,
          project_id: projectId,
          title: s.title,
          scheduled_date: s.scheduledDate,
          description: s.description,
          created_at: s.createdAt,
        })),
        { onConflict: 'id' }
      )
  } catch (err) {
    console.warn('Failed to sync schedules to Supabase:', err)
  }
}

export async function loadSchedulesFromSupabase(projectId: string): Promise<Schedule[]> {
  const sb = getSupabaseClient()
  if (!sb) return loadSchedules(projectId)
  try {
    const { data } = await sb
      .from('schedules')
      .select('*')
      .eq('project_id', projectId)
    if (!data) return loadSchedules(projectId)
    const schedules = data.map(d => ({
      id: d.id,
      projectId: d.project_id,
      title: d.title,
      scheduledDate: d.scheduled_date,
      description: d.description,
      createdAt: d.created_at,
    }))
    // localStorage에도 저장
    schedules.forEach(s => {
      const existing = loadSchedules(projectId)
      saveSchedules(projectId, [...existing.filter(x => x.id !== s.id), s])
    })
    return schedules
  } catch {
    return loadSchedules(projectId)
  }
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

export async function calcKPIFromSupabase(projectId: string): Promise<KPIData> {
  const ideas     = await loadIdeasFromSupabase(projectId)
  const schedules = await loadSchedulesFromSupabase(projectId)
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
