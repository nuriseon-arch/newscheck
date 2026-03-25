export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let text = '';
  let today = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    text = body?.text || '';
    today = body?.today || `${new Date().getFullYear()}년 ${new Date().getMonth()+1}월 ${new Date().getDate()}일`;
  } catch(e) {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const prompt = `오늘은 ${today}입니다. 현재 연도는 2026년입니다.

중요: 당신의 학습 데이터는 2025년 8월까지입니다. 그 이후 발생한 사건은 모를 수 있으므로 확신이 없으면 "unclear"로 판정하세요.

판별 기준:
- 사실 여부를 확인할 수 없는 최근 사건은 "unclear"
- 명백한 허위·날조된 내용만 "fake"
- 출처가 명확하고 논리적으로 타당하면 "real"

다음 뉴스 또는 정보를 분석해주세요.
입력: "${text}"

순수 JSON만 출력하세요. 마크다운 없이:
{
  "score": 숫자,
  "source": 숫자,
  "fact": 숫자,
  "bias": 숫자,
  "logic": 숫자,
  "verdict": "real또는fake또는unclear",
  "summary": "2~3문장 종합 판단 요약",
  "details": {
    "source_analysis": "출처 신뢰도 분석: 관련 언론사·기관·출처를 구체적으로 언급하며 설명",
    "fact_analysis": "팩트체크: 핵심 주장의 사실 여부를 구체적 근거와 함께 설명. 관련 공식 자료·통계·발표 등 인용",
    "bias_analysis": "언어 편향성: 감정적·선동적 표현이 있는지 구체적 문구를 지적하며 설명",
    "logic_analysis": "논리 일관성: 주장의 인과관계·근거가 타당한지 설명",
    "conclusion": "최종 판단 근거: 위 분석을 종합해 판별 결과를 도출한 이유를 3~5문장으로 상세히 설명"
  }
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    console.log('Anthropic response:', JSON.stringify(data));

    if (data.type === 'error') {
      return res.status(500).json({ error: data.error?.message || 'API error' });
    }

    const raw = data.content[0].text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(raw);
    return res.status(200).json(result);
  } catch(e) {
    console.error('Handler error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
