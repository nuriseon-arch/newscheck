export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const prompt = `다음 뉴스 또는 정보의 신뢰도를 분석해주세요.

입력: "${text}"

반드시 아래 JSON 형식만 출력하세요. 다른 텍스트는 절대 포함하지 마세요.
{
  "score": (0~100 사이 정수, 신뢰도 종합점수),
  "source": (0~100, 출처 신뢰도),
  "fact": (0~100, 팩트체크 점수),
  "bias": (0~100, 언어 편향성 없음 점수. 높을수록 편향 없음),
  "logic": (0~100, 논리 일관성),
  "verdict": "real" | "fake" | "unclear",
  "summary": "2~3문장으로 판별 근거 요약 (한국어)"
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const raw = data.content.map(c => c.text || '').join('');
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.status(200).json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Analysis failed' });
  }
}
