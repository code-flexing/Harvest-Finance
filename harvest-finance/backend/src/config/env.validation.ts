import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().default(5000),
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .default('info'),
  LOG_PRETTY: Joi.boolean().default(false),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Redis
  REDIS_URL: Joi.string().uri().default('redis://localhost:6379'),

  // Throttling
  THROTTLE_SHORT_TTL: Joi.number().default(1000),
  THROTTLE_SHORT_LIMIT: Joi.number().default(5),
  THROTTLE_MEDIUM_TTL: Joi.number().default(10000),
  THROTTLE_MEDIUM_LIMIT: Joi.number().default(30),
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),

  // Stellar
  STELLAR_NETWORK: Joi.string().valid('public', 'testnet').required(),
  STELLAR_NETWORK_PASSPHRASE: Joi.string().required(),
  STELLAR_SERVER_SECRET: Joi.string().required(),
  STELLAR_PLATFORM_PUBLIC_KEY: Joi.string().required(),
  STELLAR_HORIZON_URL: Joi.string().uri().optional(),

  // OAuth — Google
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().optional(),

  // OAuth — GitHub
  GITHUB_CLIENT_ID: Joi.string().optional(),
  GITHUB_CLIENT_SECRET: Joi.string().optional(),
  GITHUB_CALLBACK_URL: Joi.string().uri().optional(),

  // Secrets provider
  SECRETS_PROVIDER: Joi.string()
    .valid('env', 'aws', 'vault')
    .default('env'),
  AWS_REGION: Joi.string().when('SECRETS_PROVIDER', {
    is: 'aws',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  VAULT_URL: Joi.string().uri().when('SECRETS_PROVIDER', {
    is: 'vault',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  VAULT_TOKEN: Joi.string().when('SECRETS_PROVIDER', {
    is: 'vault',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),

  // Webhooks
  WEBHOOK_PAYMENTS_HMAC_SECRET: Joi.string().required(),
  WEBHOOK_CHAIN_EVENTS_HMAC_SECRET: Joi.string().required(),

  // Blockchain / Harvest
  BLOCKCHAIN_RPC_URL: Joi.string().uri().optional(),
  HARVEST_PRIVATE_KEY: Joi.string().optional(),
  HARVEST_CRON_EXPRESSION: Joi.string().optional(),

  // Soroban
  SOROBAN_RPC_URL: Joi.string().uri().optional(),
  SOROBAN_INDEXER_ENABLED: Joi.boolean().default(false),

  // IPFS
  IPFS_HOST: Joi.string().optional(),
  IPFS_PORT: Joi.number().optional(),
  IPFS_PROTOCOL: Joi.string().valid('http', 'https').optional(),
});
