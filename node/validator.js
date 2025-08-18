import dotenv from 'dotenv';
import express from 'express';
import config from '#config';
import healthRoute from '#routes/validator/health.js';
import scoreRoute from '#routes/validator/score.js';
import localhostOnly from '#modules/middlewares/localhost-only.js';
import logger from '#modules/logger/index.js';
import createSyntheticRoute from '#routes/validator/create-synthetic.js';

dotenv.config();

const app = express();
const PORT = process.env.VALIDATOR_NODE_PORT || 3002;

// Middleware
app.use(express.json({ limit: '1gb' }));
app.use(localhostOnly);

// Create synthetic validation tasks with place data
app.post('/create-synthetic-task', createSyntheticRoute.execute);

// Score miner responses using spot check validation
app.post('/score-responses', scoreRoute.execute);

// Health check endpoint
app.get('/health', healthRoute.execute);

// Start server and log configuration
app.listen(PORT, () => {
  logger.info('='.repeat(50));
  logger.info(`Node running on port ${PORT}`);
  logger.info(`Synthetic task endpoint: POST /create-synthetic-task`);
  logger.info(`Scoring endpoint: POST /score-responses`);
  logger.info(`Configuration:`);
  logger.info(`  - Spot check validation: ${config.VALIDATOR.SPOT_CHECK_COUNT} reviews per validation`);
  logger.info(`  - Synapse timeout: ${config.VALIDATOR.SYNAPSE_TIMEOUT} seconds`);
  logger.info(`  - Google Reviews synapse parameters:`);
  logger.info(`    * Count: dynamically generated`);
  logger.info(`    * Language: ${config.VALIDATOR.GOOGLE_MAPS_REVIEWS.REVIEWS_SYNAPSE_PARAMS.language}`);
  logger.info(`    * Sort: ${config.VALIDATOR.GOOGLE_MAPS_REVIEWS.REVIEWS_SYNAPSE_PARAMS.sort}`);
  logger.info(`  - Apify token configured: ${Boolean(process.env.APIFY_TOKEN)}`);
  logger.info('='.repeat(50));
});
