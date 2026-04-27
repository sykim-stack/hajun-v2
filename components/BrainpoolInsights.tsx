'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase'; // 기존 supabase 클라이언트

interface Insight {
  interpretation_type: string;
  payload: any;
  created_at: string;
}

export function BrainpoolInsights({ projectId }: { projectId: string }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    async function fetchInsights() {
      setLoading(true);
      const supabase = createClient();
      // 프로젝트와 관련된 해석 이벤트 조회: documents, contexts, conversations
      // 복잡한 쿼리: source_id가 project_id인 contexts, 그리고 documents의 project_id 필드는 payload 내부에 있음.
      // 간단히: contexts(project_id = 직접), documents(project_id는 payload.project_id)
      // 여기서는 간단히 최근 10개만 가져오는 예시
      const { data: contextInsights, error: ctxErr } = await supabase
        .from('brainpool_interpretations')
        .select('*')
        .eq('source_type', 'context')
        .eq('source_id', projectId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      const { data: docInsights, error: docErr } = await supabase
        .from('brainpool_interpretations')
        .select('*')
        .eq('source_type', 'document')
        .contains('payload', { project_id: projectId }) // JSONB contains
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (ctxErr || docErr) {
        setError('인사이트를 불러오지 못했습니다.');
      } else {
        const combined = [...(contextInsights || []), ...(docInsights || [])];
        combined.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setInsights(combined.slice(0, 10));
      }
      setLoading(false);
    }
    fetchInsights();
  }, [projectId]);

  if (loading) return <div className="brainpool-loading">🧠 인사이트 로딩 중...</div>;
  if (error) return <div className="brainpool-error">{error}</div>;
  if (insights.length === 0) return <div className="brainpool-empty">아직 BRAINPOOL 해석이 없습니다. 백필을 실행하세요.</div>;

  return (
    <div className="brainpool-panel" style={{ marginTop: '20px', padding: '16px', background: '#1e2530', borderRadius: '12px' }}>
      <h3 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🧠 BRAINPOOL 해석</span>
        <span style={{ fontSize: '12px', background: '#3fb950', padding: '2px 8px', borderRadius: '20px' }}>Phase 0</span>
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {insights.map(insight => (
          <div key={insight.id} style={{ borderLeft: `3px solid ${insight.interpretation_type === 'memory' ? '#58a6ff' : insight.interpretation_type === 'intent' ? '#f0b429' : '#3fb950'}`, paddingLeft: '12px' }}>
            <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '4px' }}>
              {insight.interpretation_type === 'memory' && '📝 기억'}
              {insight.interpretation_type === 'intent' && '🎯 의도'}
              {insight.interpretation_type === 'emotion' && '💬 감정'}
              {' · '}{new Date(insight.created_at).toLocaleString()}
            </div>
            <div style={{ fontSize: '13px' }}>
              {insight.interpretation_type === 'memory' && (
                <>✍️ {insight.payload.action}: {insight.payload.content_preview}…</>
              )}
              {insight.interpretation_type === 'intent' && (
                <>🎯 현재 의도: {insight.payload.current_intent} → 다음: {insight.payload.next_action}</>
              )}
              {insight.interpretation_type === 'emotion' && (
                <>😌 감정: {insight.payload.emotion} (강도 {insight.payload.intensity})</>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}