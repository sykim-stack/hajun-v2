// scripts/backfill-brainpool.js
// 실행: node scripts/backfill-brainpool.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (또는 anon key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 헬퍼: 이미 해석된 이벤트가 있는지 확인 (중복 방지)
async function existsInterpretation(sourceType, sourceId, interpretationType) {
  const { data, error } = await supabase
    .from('brainpool_interpretations')
    .select('id')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .eq('interpretation_type', interpretationType)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

// 1) documents → memory 해석
async function backfillMemoryEvents() {
  console.log('📄 Processing documents...');
  let page = 0;
  const limit = 100;
  let inserted = 0, skipped = 0;

  while (true) {
    const { data: docs, error } = await supabase
      .from('documents')
      .select('id, project_id, title, content, doc_type, created_at')
      .range(page * limit, (page + 1) * limit - 1)
      .order('created_at', { ascending: true });
    if (error) throw error;
    if (!docs.length) break;

    for (const doc of docs) {
      const exists = await existsInterpretation('document', doc.id, 'memory');
      if (exists) { skipped++; continue; }

      const payload = {
        action: doc.doc_type === 'work_log' ? '작업 완료' : (doc.doc_type === 'decision' ? '결정' : '메모'),
        content_preview: (doc.content || '').slice(0, 200),
        project_id: doc.project_id,
        significance: (doc.content || '').length > 500 ? 'high' : 'low',
        timestamp: doc.created_at
      };

      const { error: insertError } = await supabase
        .from('brainpool_interpretations')
        .insert({
          source_type: 'document',
          source_id: doc.id,
          interpretation_type: 'memory',
          payload
        });
      if (insertError) console.error(`Failed doc ${doc.id}:`, insertError);
      else inserted++;
    }
    page++;
    console.log(`  Memory: page ${page}, inserted ${inserted}, skipped ${skipped}`);
  }
  console.log(`✅ Memory done: inserted ${inserted}, skipped ${skipped}`);
}

// 2) contexts → intent 해석
async function backfillIntentEvents() {
  console.log('🎯 Processing contexts...');
  const { data: contexts, error } = await supabase
    .from('contexts')
    .select('project_id, summary, last_task, next_action, updated_at');
  if (error) throw error;

  let inserted = 0, skipped = 0;
  for (const ctx of contexts) {
    const exists = await existsInterpretation('context', ctx.project_id, 'intent');
    if (exists) { skipped++; continue; }

    const payload = {
      current_intent: ctx.summary || '목표 없음',
      next_action: ctx.next_action || '없음',
      last_task: ctx.last_task,
      drift_detected: !!(ctx.last_task && ctx.next_action && !ctx.next_action.includes(ctx.last_task)),
      timestamp: ctx.updated_at
    };

    const { error: insertError } = await supabase
      .from('brainpool_interpretations')
      .insert({
        source_type: 'context',
        source_id: ctx.project_id,
        interpretation_type: 'intent',
        payload
      });
    if (insertError) console.error(`Failed context ${ctx.project_id}:`, insertError);
    else inserted++;
  }
  console.log(`✅ Intent done: inserted ${inserted}, skipped ${skipped}`);
}

// 3) hajunai_conversations → emotion 해석 (Gemini 사용, 선택)
//    간단히 규칙 기반으로 먼저 처리 (Gemini는 나중에)
async function backfillEmotionEvents() {
  console.log('💬 Processing conversations (rule-based emotion)...');
  const { data: convs, error } = await supabase
    .from('hajunai_conversations')
    .select('id, project_id, original_message, summary, created_at')
    .limit(500); // 너무 많으면 제한
  if (error) throw error;

  let inserted = 0, skipped = 0;
  for (const conv of convs) {
    const exists = await existsInterpretation('conversation', conv.id, 'emotion');
    if (exists) { skipped++; continue; }

    // 간단한 규칙: 긍정/부정 키워드
    const text = (conv.original_message + ' ' + (conv.summary || '')).toLowerCase();
    let emotion = 'neutral';
    if (text.match(/좋|잘|멋져|감사|고마워|최고|만족/)) emotion = 'positive';
    else if (text.match(/어렵|짜증|답답|에러|실패|못하|불안/)) emotion = 'negative';
    else if (text.match(/집중|해야|진행|계획|목표/)) emotion = 'focus';

    const payload = {
      emotion,
      intensity: emotion === 'neutral' ? 0.3 : 0.7,
      text_preview: (conv.original_message || '').slice(0, 200),
      timestamp: conv.created_at
    };

    const { error: insertError } = await supabase
      .from('brainpool_interpretations')
      .insert({
        source_type: 'conversation',
        source_id: conv.id,
        interpretation_type: 'emotion',
        payload
      });
    if (insertError) console.error(`Failed conv ${conv.id}:`, insertError);
    else inserted++;
  }
  console.log(`✅ Emotion done: inserted ${inserted}, skipped ${skipped}`);
}

// 메인 실행
async function main() {
  console.log('🚀 Starting BRAINPOOL backfill...');
  await backfillMemoryEvents();
  await backfillIntentEvents();
  await backfillEmotionEvents();
  console.log('🎉 Backfill completed.');
}

main().catch(console.error);