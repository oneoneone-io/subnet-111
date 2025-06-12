import localhostOnly from './localhost-only.js';
import responseService from '#modules/response/index.js';

jest.mock('#modules/logger/index.js', () => ({
  warning: jest.fn()
}));

describe('modules/middlewares/localhost-only', () => {
  describe('.localhostOnly()', () => {
    let request;
    let response;
    let next;

    beforeEach(() => {
      next = jest.fn();
      response = jest.fn();
      request = {
        ip: '127.0.0.1',
        connection: {
          remoteAddress: '127.0.0.1'
        }
      };

      responseService.blockedRequest = jest.fn();
    });

    test('should call next() if the request is from 127.0.0.1', () => {
      localhostOnly(request, response, next);

      expect(next).toHaveBeenCalled();
    });

    test('should call next() if the request is from ::1', () => {
      delete request.ip;
      request.connection.remoteAddress = '::1';

      localhostOnly(request, response, next);

      expect(next).toHaveBeenCalled();
    });

    test('should call next() if the request is from ::ffff:127.0.0.1', () => {
      delete request.ip;
      request.connection.remoteAddress = '::ffff:127.0.0.1';

      localhostOnly(request, response, next);

      expect(next).toHaveBeenCalled();
    });

    test('should call next() if the request is from localhost', () => {
      delete request.ip;
      request.connection.remoteAddress = 'localhost';

      localhostOnly(request, response, next);

      expect(next).toHaveBeenCalled();
    });

    test('should call blockedRequest() if the request is from an unauthorized IP', () => {
      delete request.ip;
      request.connection.remoteAddress = '192.168.1.1';
      request.ip = '192.168.1.1';

      localhostOnly(request, response, next);

      expect(responseService.blockedRequest).toHaveBeenCalled();
    });
  });
});
