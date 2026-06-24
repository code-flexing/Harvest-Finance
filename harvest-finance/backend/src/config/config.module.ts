import { Module } from '@nestjs/config';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation';
import databaseConfig from './database.config';
import stellarConfig from './stellar.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available everywhere without re-importing
      validationSchema: envValidationSchema,
      load: [databaseConfig, stellarConfig],
      validationOptions: {
        allowUnknown: true, // Allows other standard env vars to pass through
        abortEarly: false,  // Returns ALL validation errors at once, not just the first one
      },
    }),
  ],
})
export class AppConfigModule {
  constructor() {
    this.logSanitizedConfig();
  }

  private logSanitizedConfig() {
    // Basic startup log masking for sensitive keys
    const sensitiveKeys = ['SECRET', 'PASSWORD', 'KEY', 'TOKEN', 'URL'];
    const sanitizedEnv: Record<string, any> = {};

    for (const key of Object.keys(envValidationSchema.describe().keys)) {
      const val = process.env[key];
      const isSensitive = sensitiveKeys.some(s => key.toUpperCase().includes(s));
      
      sanitizedEnv[key] = isSensitive && val ? '********' : val;
    }

    console.log('🚀 App Config initialized successfully:', sanitizedEnv);
  }
}