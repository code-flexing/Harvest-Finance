import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Harvest Finance API')
    .setDescription(
      'Harvest Finance - Delivery Verification System API\n\n' +
        '## Features\n' +
        '- Delivery verification with GPS coordinates\n' +
        '- IPFS image storage for proof of delivery\n' +
        '- Multi-signature approval workflow\n' +
        '- Automatic payment release on verification\n' +
        '- Real-time notifications\n' +
        '- Inspector assignment management',
    )
    .setVersion('1.0')
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
