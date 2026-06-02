import {
  bool,
  cleanEnv,
  num,
  port,
  str,
  testOnly,
  url,
} from 'envalid';

const logLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
const nodeEnvironments = [
  'development',
  'production',
  'test',
  'staging',
] as const;

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  return cleanEnv(
    config,
    {
      NODE_ENV: str({
        choices: nodeEnvironments,
        default: 'development',
        devDefault: testOnly('test'),
      }),
      PORT: port({ default: 5000 }),
      DB_HOST: str(),
      DB_PORT: port(),
      DB_USER: str(),
      DB_PASSWORD: str(),
      DB_NAME: str(),
      JWT_SECRET: str(),
      JWT_EXPIRES_IN: str({ default: '1h' }),
      JWT_REFRESH_SECRET: str(),
      JWT_REFRESH_EXPIRES_IN: str({ default: '7d' }),
      REDIS_URL: url({ default: 'redis://localhost:6379' }),
      THROTTLE_SHORT_TTL: num({ default: 1000 }),
      THROTTLE_SHORT_LIMIT: num({ default: 5 }),
      THROTTLE_MEDIUM_TTL: num({ default: 10_000 }),
      THROTTLE_MEDIUM_LIMIT: num({ default: 30 }),
      THROTTLE_TTL: num({ default: 60_000 }),
      THROTTLE_LIMIT: num({ default: 100 }),
      LOG_LEVEL: str({ choices: logLevels, default: 'info' }),
      LOG_PRETTY: bool({ default: false, devDefault: true }),
    },
    {
      reporter: ({ errors }) => {
        const messages = Object.entries(errors);

        if (messages.length === 0) return;

        throw new Error(
          [
            'Invalid environment configuration:',
            ...messages.map(
              ([name, error]) => `- ${name}: ${error?.message ?? 'is invalid'}`,
            ),
          ].join('\n'),
        );
      },
    },
  );
}
