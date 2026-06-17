export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(501, { error: 'Gemini OCR is not configured. Browser OCR will be used.' });
  }

  try {
    const { image, mimeType = 'image/png' } = JSON.parse(event.body || '{}');
    if (!image) return json(400, { error: 'Missing image data.' });

    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            {
              text: [
                'Extract only visible trade history text from this screenshot.',
                'Keep trade IDs, asset names, direction, payout percent, stake/amount, result/income, prices, open time, close time, close reason, commission, swap, and equity.',
                'If this is not a Quotex FTT or CFD trade history screenshot, answer exactly: NOT_TRADE_HISTORY',
              ].join(' '),
            },
            { inlineData: { mimeType, data: image } },
          ],
        }],
        generationConfig: { temperature: 0 },
      }),
    });

    if (!response.ok) {
      return json(response.status, { error: 'Gemini OCR request failed.' });
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim() || '';
    if (!text || text === 'NOT_TRADE_HISTORY') {
      return json(422, { error: 'No trade history found.' });
    }
    return json(200, { text });
  } catch (error) {
    return json(500, { error: error.message || 'OCR failed.' });
  }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
