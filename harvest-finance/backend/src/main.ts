import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Harvest Finance API')
    .setDescription(
      'Harvest Finance - Agricultural Marketplace API\n\n' +
        '## Features\n' +
        '- JWT Authentication with RBAC\n' +
        '- User roles: FARMER, BUYER, INSPECTOR, ADMIN\n' +
        '- Secure login and registration\n' +
        '- Token refresh and logout\n' +
        '- Password reset functionality\n' +
        '- Rate limiting\n' +
        '- Delivery verification with GPS coordinates\n' +
        '- IPFS image storage for proof of delivery\n' +
        '- Multi-signature approval workflow\n' +
        '- Automatic payment release on verification\n' +
        '- Real-time notifications\n' +
        '- Inspector assignment management',
    )
    .setVersion('1.0')
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
    .addTag('verifications', 'Delivery verification endpoints')
    .addTag('deliveries', 'Delivery management endpoints')
    .addTag('orders', 'Order management endpoints')
    .addTag('health', 'Health check endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 5000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
