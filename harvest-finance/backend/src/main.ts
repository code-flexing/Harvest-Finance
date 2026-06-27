import {
  ValidationPipe,
  VERSION_NEUTRAL,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { SorobanExceptionFilter } from './common/filters/soroban-exception.filter';
import { CustomLoggerService } from './logger/custom-logger.service';
import { VersioningInterceptor } from './common/interceptors/versioning.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  const customLogger = app.get(CustomLoggerService);
  app.useLogger(customLogger);

  const httpAdapterHost = app.get(HttpAdapterHost);

  // Register the global filters, including the new Soroban filter
  app.useGlobalFilters(
    new HttpExceptionFilter(customLogger, httpAdapterHost),
    new ThrottlerExceptionFilter(),
    new SorobanExceptionFilter(),
  );

  // Issue #448: Strict Request validation pipeline
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true, // Auto-coerces primitive type query/route params
      },
      errorHttpStatusCode: 422, // Overrides default 400 with 422 Unprocessable Entity
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());

  const ioAdapter = new IoAdapter(app);
  app.useWebSocketAdapter(ioAdapter);

  const configService = app.get(ConfigService);

  if (configService.get<string>('NODE_ENV') !== 'production') {
  const config = new DocumentBuilder()
    .setTitle('Harvest Finance API')
    .setDescription(
      'Harvest Finance — public API for third-party developers building on top of our vaults.\n\n' +
        '## Getting started\n' +
        '1. Create a developer account and obtain a JWT via `POST /auth/login`.\n' +
        '2. Send the token as `Authorization: Bearer <token>` on every authenticated request.\n' +
        '3. Explore the modules below; responses are JSON and paginated where applicable.\n\n' +
        '## Modules\n' +
        '- **Authentication** — login, refresh, password reset, RBAC.\n' +
        '- **Vaults** — deposit, withdraw and inspect yield vaults.\n' +
        '- **Portfolio** — aggregate balances across multiple Stellar accounts and vaults.\n' +
        '- **Stellar** — escrow, multi-sig, paginated transaction history on Stellar.\n' +
        '- **Soroban Events** — indexed ContractEvents for building real-time dashboards.\n' +
        '- **Orders / Verifications / Deliveries** — agricultural marketplace workflows.\n\n' +
        '## Conventions\n' +
        '- Collections expose `skip` / `limit` query parameters (limit is capped at 200).\n' +
        '- Monetary fields use 7-decimal strings to match Stellar precision.\n' +
        '- All timestamps are ISO 8601 UTC.\n\n' +
        '## Errors\n' +
        'All error responses return a consistent structure:\n' +
        '```json\n' +
        '{\n' +
        '  "statusCode": 400,\n' +
        '  "timestamp": "2026-05-27T11:17:55.000Z",\n' +
        '  "path": "/api/v1/stellar/escrow",\n' +
        '  "method": "POST",\n' +
        '  "message": "Invalid Stellar public key format"\n' +
        '}\n' +
        '```\n',
    )
    .setVersion('1.0')
    .setContact(
      'Harvest Finance',
      'https://github.com/code-flexing/Harvest-Finance',
      'dev@harvest.finance',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:5000', 'Local development')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Authentication endpoints')
    .addTag('Vaults', 'Vault deposits, withdrawals and lookups')
    .addTag(
      'Portfolio',
      'Aggregated balance reporting across Stellar accounts and vaults',
    )
    .addTag(
      'Stellar',
      'Stellar account, escrow and paginated transaction history endpoints',
    )
    .addTag('Soroban Events', 'Queryable Soroban ContractEvent index')
    .addTag('verifications', 'Delivery verification endpoints')
    .addTag('deliveries', 'Delivery management endpoints')
    .addTag('orders', 'Order management endpoints')
    .addTag(
      'Multi-chain',
      'Cross-chain yield aggregation across registered chain adapters',
    )
    .addTag('health', 'Health check endpoints')
    .addTag(
      'Webhooks',
      'HMAC-signed endpoints for external payment and chain event notifications',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
    },
    customSiteTitle: 'Harvest Finance API Docs',
  });
  }

  const port = configService.get<number>('PORT') || 5000;

  const server = await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);

  // Graceful shutdown handler for WebSocket connections
  const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}, closing WebSocket connections gracefully...`);

    try {
      // Get Socket.io server instance from the app
      const httpServer = app.getHttpServer();

      // Close Socket.io connections
      if (ioAdapter && (ioAdapter as any).server) {
        (ioAdapter as any).server.close();
      }

      // Close HTTP server
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Close NestJS app
      await app.close();

      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }

  };

  // Register shutdown signal handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
bootstrap();