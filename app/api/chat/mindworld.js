import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { project_id, content } = req.body;

  try {
    // 1. 이전 요약(최신 1건) 가져오기
    const { data: prevLogs } = await supabase
      .from('mind_logs')
      .select('summary')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(1);

    const prevSummary = prevLogs?.[0]?.summary || "없음";

    // 2. Gemini AI에게 해석 요청 (설계서 4대 필드 고정)
    const prompt = `
      당신은 하준 AI의 'MindWorld' 엔진입니다. 
      원본 데이터를 보존하며 현재 상황의 '해석 레이어'만 생성합니다.
      
      [이전 요약]: ${prevSummary}
      [현재 입력]: ${content}
      
      반드시 다음 JSON 형식으로만 응답하세요:
      {
        "summary": "전체 맥락 요약 (1문장)",
        "state": "현재 대화의 상태나 온도",
        "issue": "감지된 문제점 (없으면 'None')",
        "next_action": "다음에 제안할 행동"
      }`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const result = await response.json();
    const mindData = JSON.parse(result.candidates[0].content.parts[0].text);

    // 3. mind_logs 테이블에 저장 (사실과 해석의 분리)
    await supabase.from('mind_logs').insert([{
      project_id,
      ...mindData
    }]);

    return res.status(200).json(mindData);
  } catch (err) {
    console.error("MindWorld Error:", err);
    return res.status(500).json({ summary: "해석 실패", state: "Error", next_action: "시스템 재시작" });
  }
}