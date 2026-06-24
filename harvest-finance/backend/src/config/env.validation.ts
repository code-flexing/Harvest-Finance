import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(3000),
  
  // Database Config
  DATABASE_URL: Joi.string().required(),
  
  // Stellar Config (Example based on hints)
  STELLAR_NETWORK: Joi.string().valid('public', 'testnet').required(),
  STELLAR_SECRET_KEY: Joi.string().required(),
});