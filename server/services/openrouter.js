const fetch = require('node-fetch');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callAI(systemPrompt, userMessage) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o';

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'AI Pawn Shop'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response choices returned from OpenRouter');
    }

    return data.choices[0].message.content;
  } catch (err) {
    console.error('OpenRouter AI call failed:', err.message);
    throw err;
  }
}

module.exports = { callAI };
