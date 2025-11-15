import retryFetch from '#modules/retry-fetch/index.js';
import random from '#modules/random/index.js';
import config from '#config';

const KEYWORD_GENERATION_PROMPT_GENERAL = `Generate a list of 50 real, diverse, and unpredictable keywords suitable for tweet searches.

Rules:
1. All keywords must be real (from language, culture, or history) so they can actually appear in tweets.
2. Avoid extremely common or trending terms (e.g., "crypto", "love", "AI", "news", "music").
3. Include a balanced variety from many domains:
   - animals, plants, foods
   - science and technology
   - sports and games
   - art, film, and literature
   - geography (cities, rivers, regions)
   - politics and government (include global topics, political figures, parties, ideologies)
   - notable people (historical, cultural, or scientific figures; avoid current pop celebrities)
   - cultural and historical events
   - older slang or regional words
4. Keep all keywords safe: no profanity, hate, sexual, or personal-identifying content.
5. Keywords should be short (1–3 words).
6. Return as a JSON array of strings, nothing else, exactly 50 items.
7. YOU MUST USE THIS FORMAT. Example format:
[
  "permafrost",
  "yuzu",
  "glasnost",
  "fjord",
  "berlin wall",
  "hamilton",
  "senate hearing"
]`;

const KEYWORD_GENERATION_PROMPT_POLITICS = `Generate a list of 50 real, diverse political keywords suitable for tweet searches.

Rules:
1. All keywords must be real political topics, figures, or events that appear in tweets.
2. Include a balanced variety:
   - political figures (historical and contemporary)
   - political parties and ideologies
   - government institutions (senate, parliament, congress)
   - political events and movements
   - policy topics (healthcare, taxation, immigration)
   - international relations and diplomacy
   - elections and campaigns
3. Keep all keywords safe: no hate speech or inflammatory content.
4. Keywords should be short (1–3 words).
5. Return as a JSON array of strings, nothing else, exactly 50 items.
6. YOU MUST USE THIS FORMAT. Example format:
[
  "senate hearing",
  "diplomacy",
  "electoral college",
  "referendum",
  "bipartisan"
]`;

const KEYWORD_GENERATION_PROMPT_SCIENCE = `Generate a list of 50 real, diverse science keywords suitable for tweet searches.

Rules:
1. All keywords must be real scientific topics, concepts, or discoveries.
2. Include a balanced variety:
   - physics and astronomy
   - biology and medicine
   - chemistry and materials
   - earth sciences and climate
   - mathematics and computing
   - space exploration
   - scientific methods and tools
   - notable scientists and discoveries
3. Avoid extremely common terms (e.g., "DNA", "atom", "gravity").
4. Keywords should be short (1–3 words).
5. Return as a JSON array of strings, nothing else, exactly 50 items.
6. YOU MUST USE THIS FORMAT. Example format:
[
  "quantum entanglement",
  "crispr",
  "supernova",
  "mitochondria",
  "photosynthesis"
]`;

// Array of all prompts to randomly choose from
const KEYWORD_PROMPTS = [
  KEYWORD_GENERATION_PROMPT_GENERAL,
  KEYWORD_GENERATION_PROMPT_POLITICS,
  KEYWORD_GENERATION_PROMPT_SCIENCE
];

/**
 * Call Chutes API to generate keywords
 * @returns {Promise<Array<string>>} - Array of keywords
 */
async function generateKeywordsFromChutes() {
  const selectedPrompt = random.fromArray(KEYWORD_PROMPTS);
  const model = random.fromArray(config.VALIDATOR.X_TWEETS.CHUTES_MODELS);
  const response = await retryFetch(config.VALIDATOR.X_TWEETS.CHUTES_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CHUTES_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: selectedPrompt
        }
      ],
      stream: false,
      max_tokens: 1024,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Chutes API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Extract content from the response
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in Chutes API response');
  }

  return parseKeywordsFromResponse(content);
}

/**
 * Call OpenRouter API to generate keywords
 * @returns {Promise<Array<string>>} - Array of keywords
 */
async function generateKeywordsFromOpenRouter() {
  const selectedPrompt = random.fromArray(KEYWORD_PROMPTS);
  const model = random.fromArray(config.VALIDATOR.X_TWEETS.OPENROUTER_MODELS);

  const response = await retryFetch(config.VALIDATOR.X_TWEETS.OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: selectedPrompt
        }
      ],
      max_tokens: 1024,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  // Extract content from the response
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in OpenRouter API response');
  }

  return parseKeywordsFromResponse(content);
}

/**
 * Parse keywords from API response content
 * @param {string} content - The response content from the API
 * @returns {Array<string>} - Array of keywords
 */
function parseKeywordsFromResponse(content) {
  // Parse the JSON array from the content
  // The LLM might wrap it in markdown code blocks, so we need to extract it
  let jsonString = content.trim();

  // Remove markdown code blocks if present
  if (jsonString.startsWith('```json')) {
    jsonString = jsonString.replaceAll(/```json\s*/g, '').replaceAll(/```\s*$/g, '');
  } else if (jsonString.startsWith('```')) {
    jsonString = jsonString.replaceAll(/```\s*/g, '').replaceAll(/```\s*$/g, '');
  }

  const keywords = JSON.parse(jsonString);

  if (!Array.isArray(keywords) || keywords.length === 0) {
    throw new Error('Invalid keywords array from API response');
  }

  return keywords;
}

export {
  generateKeywordsFromChutes,
  generateKeywordsFromOpenRouter,
  parseKeywordsFromResponse,
};
