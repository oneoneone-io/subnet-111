import dotenv from 'dotenv';
import express from 'express';
import config from '#config';
import healthRoute from '#routes/validator/health.js';
import scoreRoute from '#routes/validator/score.js';
import localhostOnly from '#modules/middlewares/localhost-only.js';
import platformTokenAuth from '#modules/middlewares/platform-token-auth.js';
import logger from '#modules/logger/index.js';
import createSyntheticRoute from '#routes/validator/create-synthetic.js';
import downloadSynapseDataRoute from '#routes/validator/download-synapse-data.js';

dotenv.config();

const app = express();
const PORT = process.env.VALIDATOR_NODE_PORT || 3002;

/**
 * Validator Public API endpoints
 */
app.get('/download-synapse-data', platformTokenAuth, downloadSynapseDataRoute.execute);

/**
 * Validator localhost-only API endpoints
 */
app.use(localhostOnly);

app.get('/create-synthetic-task', createSyntheticRoute.execute);

// Use streaming for large payloads - don't buffer the entire body
app.post('/score-responses', scoreRoute.execute);

// Health check endpoint
app.get('/health', healthRoute.execute);

// Start server and log configuration
app.listen(PORT, () => {
  logger.info('='.repeat(50));
  logger.info(`Node running on port ${PORT}`);
  logger.info(`Synthetic task endpoint: GET /create-synthetic-task`);
  logger.info(`Scoring endpoint: POST /score-responses`);
  logger.info(`Download synapse data: GET /download-synapse-data?date=YYYY-MM-DD`);
  logger.info(`Configuration:`);
  logger.info(`  - Google Reviews synapse parameters:`);
  logger.info(`    * Spot check count: ${config.VALIDATOR.GOOGLE_MAPS_REVIEWS.SPOT_CHECK_COUNT}`);
  logger.info(`    * Count: dynamically generated`);
  logger.info(`    * Language: ${config.VALIDATOR.GOOGLE_MAPS_REVIEWS.REVIEWS_SYNAPSE_PARAMS.language}`);
  logger.info(`    * Sort: ${config.VALIDATOR.GOOGLE_MAPS_REVIEWS.REVIEWS_SYNAPSE_PARAMS.sort}`);
  logger.info(`  - X-Tweets synapse parameters:`);
  logger.info(`    * Spot check count: ${config.VALIDATOR.X_TWEETS.SPOT_CHECK_COUNT}`);
  logger.info(`    * Count: dynamically generated`);
  logger.info(`    * Chutes model: ${config.VALIDATOR.X_TWEETS.CHUTES_MODELS}`);
  logger.info(`    * Timeout: ${config.VALIDATOR.X_TWEETS.TWEETS_SYNAPSE_PARAMS.timeout} seconds`);
  logger.info(`  - Apify token configured: ${Boolean(process.env.APIFY_TOKEN)}`);
  logger.info(`  - Chutes API token configured: ${Boolean(process.env.CHUTES_API_TOKEN)}`);
  logger.info(`  - Desearch API token configured: ${Boolean(process.env.DESEARCH_API_TOKEN)}`);
  logger.info(`  - Platform token configured: ${Boolean(process.env.PLATFORM_TOKEN)}`);
  logger.info(`  - OpenRouter API key configured: ${Boolean(process.env.OPENROUTER_API_KEY)}`);
  logger.info('='.repeat(50));
});
