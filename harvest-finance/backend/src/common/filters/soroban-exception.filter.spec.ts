import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ERROR_MAP,
  SorobanErrorCode,
  SorobanExceptionFilter,
} from './soroban-exception.filter';

function createMockHost(url = '/stellar/contract') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url }),
    }),
  } as unknown as ArgumentsHost;

  return { host, json, status };
}

describe('SorobanExceptionFilter', () => {
  let filter: SorobanExceptionFilter;
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    filter = new SorobanExceptionFilter();
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  it('defers existing HttpExceptions to standard Nest handling', () => {
    const { host, json, status } = createMockHost();
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(json).toHaveBeenCalledWith('Forbidden');
  });

  it('maps Horizon transaction result codes through ERROR_MAP', () => {
    const { host, json, status } = createMockHost();
    const exception = {
      response: {
        data: {
          extras: {
            result_codes: {
              transaction: 'tx_bad_auth',
            },
          },
        },
      },
    };

    filter.catch(exception, host);

    expect(ERROR_MAP[SorobanErrorCode.TX_BAD_AUTH]).toBe(
      HttpStatus.BAD_REQUEST,
    );
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'SorobanContractError',
        message:
          'Transaction authorization failed. Please check your signature.',
        path: '/stellar/contract',
      }),
    );
  });

  it('uses operation result codes when tx_failed has a Soroban operation error', () => {
    const { host, json, status } = createMockHost();
    const exception = {
      response: {
        data: {
          extras: {
            result_codes: {
              transaction: 'tx_failed',
              operations: ['INVOKE_HOST_FUNCTION_RESOURCE_LIMIT_EXCEEDED'],
            },
          },
        },
      },
    };

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'The smart contract exceeded allowed resource limits.',
      }),
    );
  });

  it('maps Stellar RPC sendTransaction statuses without message matching', () => {
    const { host, json, status } = createMockHost();

    filter.catch(
      {
        status: 'TRY_AGAIN_LATER',
        hash: 'a'.repeat(64),
        latestLedger: 123,
        latestLedgerCloseTime: 1710000000,
      },
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Stellar RPC is temporarily busy. Please try again shortly.',
      }),
    );
  });

  it('maps JSON-RPC numeric error codes', () => {
    const { host, json, status } = createMockHost();
    const exception = {
      response: {
        data: {
          error: {
            code: -32602,
          },
        },
      },
    };

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid parameters provided to Stellar RPC.',
      }),
    );
  });

  it('maps exact HostError diagnostics to typed host error codes', () => {
    const { host, json, status } = createMockHost();

    filter.catch(new Error('HostError(Auth, InvalidAction)'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Transaction authorization failed. Please check your signature.',
      }),
    );
  });

  it('keeps non-Soroban exceptions on the generic 500 path', () => {
    const { host, json, status } = createMockHost();

    filter.catch(new Error('database unavailable'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An unexpected internal server error occurred',
      }),
    );
  });
});
