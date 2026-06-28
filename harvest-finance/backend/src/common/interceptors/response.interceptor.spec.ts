import { ExecutionContext, CallHandler } from '@nestjs/common';
import { ResponseInterceptor } from './response.interceptor';
import { of } from 'rxjs';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  function createMockContext(
    type: string = 'http',
    headersSent: boolean = false,
    statusCode: number = 200,
  ): Partial<ExecutionContext> {
    const mockResponse = {
      headersSent,
      statusCode,
    };
    return {
      getType: () => type as any,
      switchToHttp: () => ({
        getResponse: () => mockResponse as any,
        getRequest: () => ({}) as any,
        getNext: () => ({}) as any,
      }),
    };
  }

  function createMockCallHandler(returnValue: any): CallHandler {
    return {
      handle: () => of(returnValue),
    };
  }

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('REST (http) contexts', () => {
    it('should wrap primitive values in a { data, meta } envelope', (done) => {
      const context = createMockContext('http', false, 200) as ExecutionContext;
      const handler = createMockCallHandler('hello');

      interceptor.intercept(context, handler).subscribe((result) => {
        expect(result).toEqual({
          data: 'hello',
          meta: {},
        });
        done();
      });
    });

    it('should wrap array values in a { data, meta } envelope', (done) => {
      const context = createMockContext('http', false, 200) as ExecutionContext;
      const handler = createMockCallHandler([1, 2, 3]);

      interceptor.intercept(context, handler).subscribe((result) => {
        expect(result).toEqual({
          data: [1, 2, 3],
          meta: {},
        });
        done();
      });
    });

    it('should wrap plain objects in a { data, meta } envelope', (done) => {
      const context = createMockContext('http', false, 200) as ExecutionContext;
      const handler = createMockCallHandler({ id: 1, name: 'Test' });

      interceptor.intercept(context, handler).subscribe((result) => {
        expect(result).toEqual({
          data: { id: 1, name: 'Test' },
          meta: {},
        });
        done();
      });
    });

    it('should handle null and undefined by returning null data', (done) => {
      const context = createMockContext('http', false, 200) as ExecutionContext;
      const handler = createMockCallHandler(null);

      interceptor.intercept(context, handler).subscribe((result) => {
        expect(result).toEqual({
          data: null,
          meta: {},
        });
        done();
      });
    });

    it('should leave pre-existing { data, meta } envelopes unchanged', (done) => {
      const context = createMockContext('http', false, 200) as ExecutionContext;
      const original = { data: [1, 2], meta: { total: 10, page: 2 } };
      const handler = createMockCallHandler(original);

      interceptor.intercept(context, handler).subscribe((result) => {
        expect(result).toEqual(original);
        done();
      });
    });

    it('should ensure meta is an object if pre-existing { data, meta } envelope has non-object meta', (done) => {
      const context = createMockContext('http', false, 200) as ExecutionContext;
      const original = { data: [1, 2], meta: null };
      const handler = createMockCallHandler(original);

      interceptor.intercept(context, handler).subscribe((result) => {
        expect(result).toEqual({
          data: [1, 2],
          meta: {},
        });
        done();
      });
    });

    it('should convert objects with "data" but missing "meta" and shift extra fields to meta', (done) => {
      const context = createMockContext('http', false, 200) as ExecutionContext;
      const original = { data: [1, 2], total: 10, page: 1 };
      const handler = createMockCallHandler(original);

      interceptor.intercept(context, handler).subscribe((result) => {
        expect(result).toEqual({
          data: [1, 2],
          meta: { total: 10, page: 1 },
        });
        done();
      });
    });

    it('should convert objects with "items" and "total" to { data: items, meta: { total } }', (done) => {
      const context = createMockContext('http', false, 200) as ExecutionContext;
      const original = { items: [{ id: 1 }], total: 5, page: 2 };
      const handler = createMockCallHandler(original);

      interceptor.intercept(context, handler).subscribe((result) => {
        expect(result).toEqual({
          data: [{ id: 1 }],
          meta: { total: 5, page: 2 },
        });
        done();
      });
    });

    it('should bypass response wrapping if response headers are already sent', (done) => {
      const context = createMockContext('http', true, 200) as ExecutionContext;
      const handler = createMockCallHandler('raw stream or buffer');

      interceptor.intercept(context, handler).subscribe((result) => {
        expect(result).toBe('raw stream or buffer');
        done();
      });
    });

    it('should bypass response wrapping for 204 No Content status', (done) => {
      const context = createMockContext('http', false, 204) as ExecutionContext;
      const handler = createMockCallHandler(undefined);

      interceptor.intercept(context, handler).subscribe((result) => {
        expect(result).toBeUndefined();
        done();
      });
    });

    it('should bypass response wrapping for 304 Not Modified status', (done) => {
      const context = createMockContext('http', false, 304) as ExecutionContext;
      const handler = createMockCallHandler('not modified');

      interceptor.intercept(context, handler).subscribe((result) => {
        expect(result).toBe('not modified');
        done();
      });
    });

    it('should bypass response wrapping for Buffer payloads', (done) => {
      const context = createMockContext('http', false, 200) as ExecutionContext;
      const buffer = Buffer.from('hello');
      const handler = createMockCallHandler(buffer);

      interceptor.intercept(context, handler).subscribe((result) => {
        expect(result).toBe(buffer);
        done();
      });
    });

    it('should bypass response wrapping for StreamableFile payloads', (done) => {
      const context = createMockContext('http', false, 200) as ExecutionContext;
      const streamableFileMock = {
        getStream: () => ({}),
        constructor: { name: 'StreamableFile' },
      };
      const handler = createMockCallHandler(streamableFileMock);

      interceptor.intercept(context, handler).subscribe((result) => {
        expect(result).toBe(streamableFileMock);
        done();
      });
    });
  });

  describe('Non-REST contexts', () => {
    it('should bypass interceptor for graphql contexts', (done) => {
      const context = createMockContext('graphql') as ExecutionContext;
      const handler = createMockCallHandler({ id: 1 });

      interceptor.intercept(context, handler).subscribe((result) => {
        expect(result).toEqual({ id: 1 });
        done();
      });
    });

    it('should bypass interceptor for websockets (ws) contexts', (done) => {
      const context = createMockContext('ws') as ExecutionContext;
      const handler = createMockCallHandler({ event: 'ping' });

      interceptor.intercept(context, handler).subscribe((result) => {
        expect(result).toEqual({ event: 'ping' });
        done();
      });
    });
  });
});
