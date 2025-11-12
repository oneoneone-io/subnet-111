import logger from '#modules/logger/index.js';
import responseService from '#modules/response/index.js';

/**
 * Platform token authentication middleware
 * @param {import('express').Request} request - The request object
 * @param {import('express').Response} response - The response object
 * @param {import('express').NextFunction} next - The next function
 * @returns {void}
 */
const platformTokenAuth = (request, response, next) => {
  const authToken = request.headers.authorization;

  if (!authToken || authToken !== `Bearer ${process.env.PLATFORM_TOKEN}`) {
    logger.warning(`Unauthorized download request - invalid token`);
    return responseService.blockedRequest(response, { 
      error: 'Unauthorized', 
      message: 'Invalid or missing authorization token' 
    });
  }

  next();
};

export default platformTokenAuth;

