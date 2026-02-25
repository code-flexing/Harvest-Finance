import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import request from 'supertest';
import { VerificationModule } from '../src/verification/verification.module';
import { Verification } from '../src/verification/entities/verification.entity';
import { Delivery } from '../src/verification/entities/delivery.entity';
import { Approval } from '../src/verification/entities/approval.entity';
import { InspectorAssignment } from '../src/verification/entities/inspector-assignment.entity';
import { Notification } from '../src/verification/entities/notification.entity';
import { DeliveryStatus } from '../src/verification/enums/verification.enums';

describe('VerificationController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'password',
          database: 'test_harvest_finance',
          entities: [Verification, Delivery, Approval, InspectorAssignment, Notification],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([
          Verification,
          Delivery,
          Approval,
          InspectorAssignment,
          Notification,
        ]),
        EventEmitterModule.forRoot(),
        VerificationModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/deliveries (POST)', () => {
    it('should create a delivery', async () => {
      const response = await request(app.getHttpServer())
        .post('/deliveries')
        .send({
          orderId: 'order-123',
          destinationLat: 40.7128,
          destinationLng: -74.006,
          destinationAddress: '123 Main St',
          recipientName: 'John Doe',
          recipientPhone: '+1234567890',
          amount: 100,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.orderId).toBe('order-123');
    });
  });

  describe('/deliveries/:id (GET)', () => {
    it('should return 404 for non-existent delivery', async () => {
      await request(app.getHttpServer())
        .get('/deliveries/non-existent-id')
        .expect(404);
    });
  });

  describe('/verifications (POST)', () => {
    it('should return 404 when delivery not found', async () => {
      await request(app.getHttpServer())
        .post('/verifications')
        .send({
          deliveryId: 'non-existent-delivery',
          inspectorId: 'inspector-123',
          gpsLat: 40.7128,
          gpsLng: -74.006,
        })
        .expect(404);
    });
  });

  describe('/verifications (GET)', () => {
    it('should return list of verifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/verifications')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/verifications?status=PENDING')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('/verifications/:id/progress (GET)', () => {
    it('should return 404 for non-existent verification', async () => {
      await request(app.getHttpServer())
        .get('/verifications/non-existent-id/progress')
        .expect(404);
    });
  });
});
