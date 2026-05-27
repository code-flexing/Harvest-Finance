import { Injectable, LoggerService, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import pino, {
  DestinationStream,
  Logger as PinoLogger,
  TransportTargetOptions,
} from 'pino';

type LogPayload = unknown;
type ContextOrMeta = string | Record<string, unknown> | undefined;

@Injectable()
export class CustomLoggerService implements LoggerService {
  private readonly pino: PinoLogger;

  constructor(@Optional() private readonly config?: ConfigService) {
    this.pino = createPinoLogger(this.config);
  }

  log(message: LogPayload, context?: string): void {
    const { fields, msg } = unpack(message, context);
    this.pino.info(fields, msg);
  }

  error(
    message: LogPayload,
    traceOrMeta?: ContextOrMeta,
    context?: string,
  ): void {
    const meta = mergeMeta(traceOrMeta, context);
    const { fields, msg } = unpack(message, meta.context);
    this.pino.error({ ...fields, ...meta.fields }, msg);
  }

  warn(message: LogPayload, context?: string): void {
    const { fields, msg } = unpack(message, context);
    this.pino.warn(fields, msg);
  }

  debug?(message: LogPayload, context?: string): void {
    const { fields, msg } = unpack(message, context);
    this.pino.debug(fields, msg);
  }

  verbose?(message: LogPayload, context?: string): void {
    const { fields, msg } = unpack(message, context);
    this.pino.trace(fields, msg);
  }

  /**
   * Emit a structured event log at error level (e.g. `stellar_tx_failed`).
   * Use this for known failure modes that telemetry should be able to filter on.
   */
  errorEvent(
    event: string,
    fields: Record<string, unknown>,
    context?: string,
  ): void {
    this.pino.error({ event, ...fields, context }, event);
  }
}

function unpack(
  message: LogPayload,
  context?: string,
): { fields: Record<string, unknown>; msg: string } {
  if (message instanceof Error) {
    return {
      fields: { context, err: message },
      msg: message.message,
    };
  }
  if (message && typeof message === 'object') {
    const obj = message as Record<string, unknown>;
    const { msg, message: msgAlt, ...rest } = obj;
    return {
      fields: { context, ...rest },
      msg:
        typeof msg === 'string'
          ? msg
          : typeof msgAlt === 'string'
            ? msgAlt
            : '',
    };
  }
  if (message == null) return { fields: { context }, msg: '' };
  if (typeof message === 'string') return { fields: { context }, msg: message };
  return { fields: { context }, msg: safeStringify(message) };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return '[unserialisable value]';
  }
}

function mergeMeta(
  traceOrMeta: ContextOrMeta,
  context?: string,
): { fields: Record<string, unknown>; context?: string } {
  if (traceOrMeta == null) return { fields: {}, context };
  if (typeof traceOrMeta === 'string') {
    return { fields: { trace: traceOrMeta }, context };
  }
  const { context: ctxFromMeta, ...rest } = traceOrMeta;
  return {
    fields: rest,
    context:
      context ?? (typeof ctxFromMeta === 'string' ? ctxFromMeta : undefined),
  };
}

function createPinoLogger(config?: ConfigService): PinoLogger {
  const level =
    config?.get<string>('LOG_LEVEL') ?? process.env.LOG_LEVEL ?? 'info';
  const isProduction = (process.env.NODE_ENV ?? 'development') === 'production';
  const logDirectory = path.join(process.cwd(), 'logs');

  const targets: TransportTargetOptions[] = [
    isProduction
      ? {
          target: 'pino/file',
          options: { destination: 1 },
          level: 'trace',
        }
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
          level: 'trace',
        },
    {
      target: 'pino/file',
      options: {
        destination: path.join(logDirectory, 'application.log'),
        mkdir: true,
      },
      level: 'trace',
    },
    {
      target: 'pino/file',
      options: {
        destination: path.join(logDirectory, 'error.log'),
        mkdir: true,
      },
      level: 'error',
    },
  ];

  const transport = pino.transport({ targets }) as DestinationStream;
  return pino({ level, base: { pid: process.pid } }, transport);
}
