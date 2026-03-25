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

중요: 당신의 학습 데이터는 2025년 8월까지입니다. 그 이후 발생한 사건(예: 선거 결과, 새 대통령, 정권 교체 등)은 당신이 모를 수 있습니다. 이런 경우 "알 수 없음"이 아니라 "불확실"로 판정하고, 학습 데이터 이후 사건일 수 있다고 summary에 언급하세요.

판별 기준:
- 사실 여부를 확인할 수 없는 최근 사건은 "unclear"로 판정
- 명백한 허위 정보나 날조된 내용만 "fake"로 판정
- 출처가 명확하고 논리적으로 타당하면 "real"로 판정
- 판별에 확신이 없으면 반드시 "unclear"로 판정

다음 뉴스 또는 정보의 신뢰도를 분석해주세요.
입력: "${text}"

순수 JSON만 출력하세요. 마크다운, 설명 없이:
{"score":숫자,"source":숫자,"fact":숫자,"bias":숫자,"logic":숫자,"verdict":"real또는fake또는unclear","summary":"한국어2~3문장. 학습데이터 이후 사건이면 그 점을 언급"}`;

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
