const fetch = require('node-fetch');

/**
 * Call AI with optional vision support.
 * @param {string} systemPrompt
 * @param {string|Array} userMessage - string or array of content blocks for vision
 */
async function callAI(systemPrompt, userMessage) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const model = process.env.OPENROUTER_MODEL;
  const baseUrl = process.env.OPENROUTER_BASE_URL;
  if (!model || !baseUrl) {
    throw new Error('OPENROUTER_MODEL and OPENROUTER_BASE_URL are required');
  }

  // userMessage can be a string or an array of content blocks (for vision)
  const userContent = Array.isArray(userMessage) ? userMessage : userMessage;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
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
          { role: 'user', content: userContent }
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
