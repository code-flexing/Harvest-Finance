import { CustomLoggerService } from './custom-logger.service';

type Captured = { level: string; obj: Record<string, unknown>; msg: string };

const captured: Captured[] = [];

const fakePino = {
  trace: (obj: Record<string, unknown>, msg: string) =>
    captured.push({ level: 'trace', obj, msg }),
  debug: (obj: Record<string, unknown>, msg: string) =>
    captured.push({ level: 'debug', obj, msg }),
  info: (obj: Record<string, unknown>, msg: string) =>
    captured.push({ level: 'info', obj, msg }),
  warn: (obj: Record<string, unknown>, msg: string) =>
    captured.push({ level: 'warn', obj, msg }),
  error: (obj: Record<string, unknown>, msg: string) =>
    captured.push({ level: 'error', obj, msg }),
};

const buildService = () => {
  const svc = new CustomLoggerService();
  // Replace the underlying pino instance with a capturing fake.
  Object.defineProperty(svc, 'pino', { value: fakePino, configurable: true });
  return svc;
};

describe('CustomLoggerService', () => {
  beforeEach(() => {
    captured.length = 0;
  });

  it('emits string messages with context as a structured field', () => {
    const svc = buildService();
    svc.log('app booted', 'Bootstrap');

    expect(captured).toHaveLength(1);
    expect(captured[0].level).toBe('info');
    expect(captured[0].msg).toBe('app booted');
    expect(captured[0].obj.context).toBe('Bootstrap');
  });

  it('flattens object payloads into structured fields and resolves msg', () => {
    const svc = buildService();
    svc.log(
      { msg: 'GET /vaults 200 12ms', method: 'GET', statusCode: 200 },
      'HTTP',
    );

    expect(captured[0].msg).toBe('GET /vaults 200 12ms');
    expect(captured[0].obj.method).toBe('GET');
    expect(captured[0].obj.statusCode).toBe(200);
    expect(captured[0].obj.context).toBe('HTTP');
  });

  it('treats an object trace as additional structured fields on error()', () => {
    const svc = buildService();
    svc.error(
      'GET /vaults 500 81ms',
      { method: 'GET', statusCode: 500, durationMs: 81 },
      'HTTP',
    );

    expect(captured[0].level).toBe('error');
    expect(captured[0].obj).toMatchObject({
      method: 'GET',
      statusCode: 500,
      durationMs: 81,
      context: 'HTTP',
    });
  });

  it('keeps a string trace under a `trace` field for back-compat', () => {
    const svc = buildService();
    svc.error('boom', 'Error: stacktrace…', 'Auth');

    expect(captured[0].obj.trace).toBe('Error: stacktrace…');
    expect(captured[0].obj.context).toBe('Auth');
  });

  it('emits a named error event via errorEvent()', () => {
    const svc = buildService();
    svc.errorEvent(
      'stellar_tx_failed',
      {
        context: 'createEscrow',
        status: 400,
        resultCodes: { tx: 'tx_failed' },
      },
      'StellarService',
    );

    expect(captured[0].level).toBe('error');
    expect(captured[0].msg).toBe('stellar_tx_failed');
    expect(captured[0].obj).toMatchObject({
      event: 'stellar_tx_failed',
      status: 400,
      context: 'StellarService',
    });
  });
});
