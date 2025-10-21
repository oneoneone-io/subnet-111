import config from '#config';
import logger from '#modules/logger/index.js';
import time from '#modules/time/index.js';
import random from '#modules/random/index.js';
import retryFetch from '#modules/retry-fetch/index.js';

const KEYWORD_GENERATION_PROMPT = `Generate a list of 50 real, diverse, and unpredictable keywords suitable for tweet searches.

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
7. Example format:
[
  "permafrost",
  "yuzu",
  "glasnost",
  "fjord",
  "berlin wall",
  "hamilton",
  "senate hearing"
]`;

/**
 * Call Chutes API to generate keywords
 * @returns {Promise<Array<string>>} - Array of keywords
 */
async function generateKeywordsFromChutes() {
  const response = await retryFetch(config.VALIDATOR.X_TWEETS.CHUTES_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CHUTES_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.VALIDATOR.X_TWEETS.CHUTES_MODEL,
      messages: [
        {
          role: 'user',
          content: KEYWORD_GENERATION_PROMPT
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
    throw new Error('Invalid keywords array from Chutes API');
  }

  return keywords;
}

/**
 * Create a synthetic task for X/Twitter tweets
 * It calls the Chutes API to get a keyword
 * It returns the keyword as the synthetic task metadata
 * If the API call fails after all retries, it throws an error
 * @returns {Promise<Object>} - The synthetic task with keyword
 */
const createSyntheticTask = async () => {
  const startTime = Date.now();

  logger.info(`X Tweets - Creating synthetic task`);

  try {
    // Check if API token is configured
    if (!process.env.CHUTES_API_TOKEN) {
      throw new Error('CHUTES_API_TOKEN not configured');
    }

    // Call Chutes API to generate keywords
    logger.info('X Tweets - Calling Chutes API to generate keywords');
    const keywords = await generateKeywordsFromChutes();
    logger.info(`X Tweets - Generated ${keywords.length} keywords from Chutes API`);

    // Pick a random keyword and wrap it in quotes
    const keyword = random.fromArray(keywords);
    const quotedKeyword = `"${keyword}"`;

    const duration = time.getDuration(startTime);
    logger.info(`X Tweets - Selected keyword: ${quotedKeyword} (took ${duration.toFixed(2)}s)`);

    // Return the synthetic task metadata with quoted keyword
    const metadata = {
      keyword: quotedKeyword
    }

    return {
      metadata,
      timeout: config.VALIDATOR.X_TWEETS.TWEETS_SYNAPSE_PARAMS.timeout
    };
  } catch (error) {
    const duration = time.getDuration(startTime);
    logger.error(`X Tweets - Error creating synthetic task (took ${duration.toFixed(2)}s):`, error);
    throw error;
  }
}

export default createSyntheticTask;

