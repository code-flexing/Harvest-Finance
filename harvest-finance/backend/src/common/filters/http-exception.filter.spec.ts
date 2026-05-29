import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { CustomLoggerService } from '../../logger/custom-logger.service';

const mockJson = jest.fn();
const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
const mockGetRequest = jest
  .fn()
  .mockReturnValue({ url: '/test', method: 'GET' });

const mockHost = {
  switchToHttp: () => ({
    getResponse: mockGetResponse,
    getRequest: mockGetRequest,
  }),
} as unknown as ArgumentsHost;

const mockLogger = {
  error: jest.fn(),
} as unknown as CustomLoggerService;

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new HttpExceptionFilter(mockLogger);
  });

  it('maps HttpException to its status code and string message', () => {
    filter.catch(
      new HttpException('Not found', HttpStatus.NOT_FOUND),
      mockHost,
    );

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Not found',
        path: '/test',
        method: 'GET',
      }),
    );
  });

  it('maps HttpException with object response to message field', () => {
    filter.catch(
      new HttpException(
        { message: 'Validation failed', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      ),
      mockHost,
    );

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
      }),
    );
  });

  it('maps generic Error to 500 with "Internal server error"', () => {
    filter.catch(new Error('Something broke'), mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }),
    );
  });

  it('maps non-Error unknown throws to 500', () => {
    filter.catch('unexpected string throw', mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR }),
    );
  });

  it('includes timestamp, path, and method in every response', () => {
    filter.catch(
      new HttpException('Forbidden', HttpStatus.FORBIDDEN),
      mockHost,
    );

    const payload = mockJson.mock.calls[0][0];
    expect(payload.timestamp).toBeDefined();
    expect(payload.path).toBe('/test');
    expect(payload.method).toBe('GET');
  });
});
