# HajunAI V2 — BRAINPOOL 신규 기능 통합 TODO

## Phase 1: 기존 구조 분석 및 네비게이션 추가
- [ ] 라우팅 구조 설계 (app/page.tsx → app/(pages)/home, ideas, contexts 등)
- [ ] 네비게이션 컴포넌트 추가
- [ ] Supabase 클라이언트 초기화

## Phase 2: BRAINPOOL 기능 7가지 페이지 추가
- [ ] 💡 아이디어 뱅크 페이지 (app/(pages)/ideas/page.tsx)
- [ ] 📊 맥락 대시보드 페이지 (app/(pages)/contexts/page.tsx)
- [ ] 📅 스마트 캘린더 페이지 (app/(pages)/schedules/page.tsx)
- [ ] 🧠 MindWorld AI 페이지 (app/(pages)/ai/page.tsx)
- [ ] 📈 KPI 대시보드 페이지 (app/(pages)/kpi/page.tsx)
- [ ] 🏥 헬스 상태 페이지 (app/(pages)/health/page.tsx)
- [ ] ⚙️ Supabase 설정 페이지 (app/(pages)/settings/page.tsx)

## Phase 3: 핵심 기능 구현
- [ ] 아이디어 생성/조회/상태 변경 API (app/api/ideas/route.ts)
- [ ] 맥락 조회/업데이트 API (app/api/contexts/route.ts)
- [ ] 일정 생성/조회 API (app/api/schedules/route.ts)
- [ ] 아이디어 반영확정 → next_action 자동 등록 로직
- [ ] Supabase 동기화 로직

## Phase 4: 최종 검증
- [ ] 모든 페이지 라우팅 테스트
- [ ] 기존 채팅 기능 호환성 확인
- [ ] 배포 준비

## 핵심 데이터 구조 (Supabase)
- **ideas**: project_id, content, tags, status (검토중/반영확정/보류), created_at
- **contexts**: project_id, summary, last_task, next_action, updated_at
- **schedules**: project_id, title, description, scheduled_date, idea_id, created_at
- **supabase_config**: url, api_key, is_connected, last_sync
