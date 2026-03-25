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

중요: 학습 데이터는 2025년 8월까지입니다. 그 이후 사건은 "unclear"로 판정하세요.
판별 기준: 확인 불가 최근 사건→unclear, 명백한 허위→fake, 출처 명확·논리적→real

다음을 분석하세요: "${text.replace(/"/g, "'")}"

아래 JSON을 그대로 복사해서 숫자와 텍스트만 채워 출력하세요.
줄바꿈 없이 한 줄로, 따옴표 안에 따옴표 사용 금지, 특수문자 금지:
{"score":0,"source":0,"fact":0,"bias":0,"logic":0,"verdict":"unclear","summary":"여기에 2문장 요약","details":{"source_analysis":"출처 분석 내용","fact_analysis":"팩트체크 내용","bias_analysis":"편향성 분석 내용","logic_analysis":"논리 분석 내용","conclusion":"최종 판단 근거"}}`;

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

    const raw = data.content[0].text
      .replace(/```json|```/g, '')
      .replace(/[\u0000-\u001F\u007F]/g, ' ')  // 제어문자 제거
      .trim();

    let result;
    try {
      result = JSON.parse(raw);
    } catch(parseErr) {
      // JSON 파싱 실패 시 간단한 응답 반환
      console.error('JSON parse error:', parseErr.message, 'Raw:', raw.slice(0, 200));
      result = {
        score: 50, source: 50, fact: 50, bias: 50, logic: 50,
        verdict: 'unclear',
        summary: 'AI 응답 파싱에 실패했습니다. 다시 시도해주세요.',
        details: null
      };
    }
    return res.status(200).json(result);
  } catch(e) {
    console.error('Handler error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
