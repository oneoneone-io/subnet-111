import healthRoute from './health.js';
import responseService from '#modules/response/index.js';

jest.mock('#modules/response/index.js', () => ({
  success: jest.fn(),
}));

describe('routes/validator/health.js', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('.output()', () => {
    test('should output the result properly', () => {
      const result = healthRoute.output();
      expect(result).toEqual({
        status: 'healthy',
        node: 'validator',
        endpoints: ['/create-synthetic-task', '/score-responses', '/health']
      });
    });
  });

  describe('.execute()', () => {
    let response;
    let request;

    beforeEach(() => {
      response = {
        status: jest.fn(),
        json: jest.fn(),
      };
      request = {};
    });

    test('should return response properly', async () => {
      const output = healthRoute.output();
      await healthRoute.execute(request, response);
      expect(responseService.success).toHaveBeenCalledWith(response, output);
    });
  });
});
