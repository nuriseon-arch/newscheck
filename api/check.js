export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = '';
  try {
    // body 파싱 처리
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }
  } catch(e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const text = body?.text;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const prompt = `다음 뉴스 또는 정보의 신뢰도를 분석해주세요.

입력: "${text}"

반드시 아래 JSON 형식만 출력하세요. 주석, 설명, 마크다운 없이 순수 JSON만 출력하세요.
{"score":숫자,"source":숫자,"fact":숫자,"bias":숫자,"logic":숫자,"verdict":"real또는fake또는unclear","summary":"한국어설명"}`;

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
    console.log('API response:', JSON.stringify(data));

    if (!data.content || !data.content[0]) {
      return res.status(500).json({ error: 'Empty API response', detail: data });
    }

    const raw = data.content[0].text.replace(/```json|```/g, '').trim();
    console.log('Raw text:', raw);

    const result = JSON.parse(raw);
    return res.status(200).json(result);
  } catch (e) {
    console.error('Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
