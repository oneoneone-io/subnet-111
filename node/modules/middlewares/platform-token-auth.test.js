import platformTokenAuth from './platform-token-auth.js';
import responseService from '#modules/response/index.js';

jest.mock('#modules/logger/index.js', () => ({
  warning: jest.fn()
}));

describe('modules/middlewares/platform-token-auth', () => {
  describe('.platformTokenAuth()', () => {
    let request;
    let response;
    let next;
    const originalEnvironment = process.env.PLATFORM_TOKEN;

    beforeEach(() => {
      next = jest.fn();
      response = jest.fn();
      request = {
        headers: {}
      };

      responseService.blockedRequest = jest.fn();
      process.env.PLATFORM_TOKEN = 'test-token-123';
    });

    afterEach(() => {
      process.env.PLATFORM_TOKEN = originalEnvironment;
    });

    test('should call next() if the request has valid authorization token', () => {
      request.headers.authorization = 'Bearer test-token-123';

      platformTokenAuth(request, response, next);

      expect(next).toHaveBeenCalled();
      expect(responseService.blockedRequest).not.toHaveBeenCalled();
    });

    test('should call blockedRequest() if authorization token is missing', () => {
      platformTokenAuth(request, response, next);

      expect(responseService.blockedRequest).toHaveBeenCalledWith(response, {
        error: 'Unauthorized',
        message: 'Invalid or missing authorization token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call blockedRequest() if authorization token is invalid', () => {
      request.headers.authorization = 'Bearer wrong-token';

      platformTokenAuth(request, response, next);

      expect(responseService.blockedRequest).toHaveBeenCalledWith(response, {
        error: 'Unauthorized',
        message: 'Invalid or missing authorization token'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});

