// ─── 공통 상수 ─────────────────────────────────────────
export const PROJECTS = [
  { id: '82423554-fa71-42cc-a297-90a65747113b', name: 'HajunAI',   emoji: '🧠', color: '#ff9d00' },
  { id: 'c38f5b9a-14ab-4a36-85e2-b58289a4e4e6', name: 'CoreRing',  emoji: '🌐', color: '#00ff9d' },
  { id: '13196994-00d5-4d7f-9436-619f07f5bd45', name: 'CoreChat',  emoji: '💬', color: '#ff6b9d' },
  { id: '66666666-0000-0000-0000-000000000006', name: 'CoreNull',  emoji: '🏘️', color: '#f0b429' },
  { id: '0a385ad1-4735-4967-978c-3a9aa7588613', name: 'CoreRoad',  emoji: '🛵', color: '#00c8ff' },
  { id: '8f7e37b0-a19b-448f-a568-5bd8fd6bb3ff', name: 'CoreHub',   emoji: '🏊', color: '#ffd700' },
  { id: '2a9aa9b2-6eaa-4386-a8af-8345e9c4a4d2', name: 'MindWorld', emoji: '🧩', color: '#bf7fff' },
]

export type Project = typeof PROJECTS[number]

export const COLORS = {
  bg:        '#0a0c10',
  surface:   '#1e2530',
  border:    '#2d3748',
  muted:     '#4a5568',
  text:      '#e2e8f0',
  textSub:   '#a0aec0',
  accent:    '#2563eb',
  success:   '#00ff9d',
  warning:   '#ffd700',
  danger:    '#ff6b6b',
} as const

// Dev 모드: 개발자용 (로그, 디버깅, 상태)
// Control 모드: 사용자용 (아이디어, 맥락, 일정, AI, KPI, 헬스)
export type AppMode = 'dev' | 'control'

// Control 모드 전용 네비게이션
export const CONTROL_NAV = [
  { href: '/ideas',     label: '아이디어', icon: '💡' },
  { href: '/contexts',  label: '맥락',     icon: '📊' },
  { href: '/schedules', label: '일정',     icon: '📅' },
  { href: '/ai',        label: 'AI',       icon: '🧠' },
  { href: '/kpi',       label: 'KPI',      icon: '📈' },
  { href: '/health',    label: '헬스',     icon: '🏥' },
]

// Dev 모드 전용 네비게이션
export const DEV_NAV = [
  { href: '/settings',  label: '설정',     icon: '⚙️' },
]
