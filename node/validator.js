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

// Middleware
app.use(express.json({ limit: '1gb' }));

/**
 * Validator Public API endpoints
 */
// Download synapse data endpoint
app.get('/download-synapse-data', platformTokenAuth, downloadSynapseDataRoute.execute);

/**
 * Validator localhost-only API endpoints
 */
// Apply localhost-only middleware to remaining routes
app.use(localhostOnly);

// Validator localhost-only API endpoints (uses localhost-only middleware)
// Create synthetic validation tasks with place data
app.get('/create-synthetic-task', createSyntheticRoute.execute);

// Score miner responses using spot check validation
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
  logger.info(`  - Spot check validation: ${config.VALIDATOR.SPOT_CHECK_COUNT} reviews per validation`);
  logger.info(`  - Google Reviews synapse parameters:`);
  logger.info(`    * Count: dynamically generated`);
  logger.info(`    * Language: ${config.VALIDATOR.GOOGLE_MAPS_REVIEWS.REVIEWS_SYNAPSE_PARAMS.language}`);
  logger.info(`    * Sort: ${config.VALIDATOR.GOOGLE_MAPS_REVIEWS.REVIEWS_SYNAPSE_PARAMS.sort}`);
  logger.info(`  - X-Tweets synapse parameters:`);
  logger.info(`    * Count: dynamically generated`);
  logger.info(`    * Chutes model: ${config.VALIDATOR.X_TWEETS.CHUTES_MODELS}`);
  logger.info(`    * Timeout: ${config.VALIDATOR.X_TWEETS.TWEETS_SYNAPSE_PARAMS.timeout} seconds`);
  logger.info(`  - Apify token configured: ${Boolean(process.env.APIFY_TOKEN)}`);
  logger.info('='.repeat(50));
});
