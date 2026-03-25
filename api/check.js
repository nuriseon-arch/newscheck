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

  const prompt = `오늘은 ${today}이고 현재 연도는 2026년입니다.

[현재 확인된 사실]
- 대한민국 대통령: 이재명 (2025년 취임)
- 전 대통령 윤석열은 2025년 탄핵 파면됨
- 현재 집권당: 더불어민주당

[판별 기준]
- 위 사실과 일치하면 real
- 확인 불가 최근 사건은 unclear
- 명백한 허위만 fake

분석 대상: ${text.replace(/[\r\n]+/g, ' ')}

아래 형식으로 정확히 출력하세요. 각 줄을 그대로 유지하고 콜론 뒤 값만 바꾸세요:
SCORE:75
SOURCE:80
FACT:70
BIAS:85
LOGIC:75
VERDICT:real
SUMMARY:여기에 판별 요약을 두 문장으로 작성
SOURCE_ANALYSIS:출처 신뢰도 분석 내용
FACT_ANALYSIS:팩트체크 내용
BIAS_ANALYSIS:편향성 분석 내용
LOGIC_ANALYSIS:논리 일관성 분석 내용
CONCLUSION:최종 판단 근거 내용`;

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

    const raw = data.content[0].text.trim();
    console.log('Raw response:', raw.slice(0, 300));

    // 줄 단위 파싱
    const lines = raw.split('\n');
    const get = (key) => {
      const line = lines.find(l => l.startsWith(key + ':'));
      return line ? line.slice(key.length + 1).trim() : '';
    };

    const result = {
      score:   parseInt(get('SCORE'))  || 50,
      source:  parseInt(get('SOURCE')) || 50,
      fact:    parseInt(get('FACT'))   || 50,
      bias:    parseInt(get('BIAS'))   || 50,
      logic:   parseInt(get('LOGIC'))  || 50,
      verdict: get('VERDICT') || 'unclear',
      summary: get('SUMMARY') || '분석 결과를 가져오지 못했습니다.',
      details: {
        source_analysis: get('SOURCE_ANALYSIS'),
        fact_analysis:   get('FACT_ANALYSIS'),
        bias_analysis:   get('BIAS_ANALYSIS'),
        logic_analysis:  get('LOGIC_ANALYSIS'),
        conclusion:      get('CONCLUSION')
      }
    };
    return res.status(200).json(result);
  } catch(e) {
    console.error('Handler error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
