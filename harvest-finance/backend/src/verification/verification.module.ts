import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { VerificationController } from './verification.controller';
import { DeliveryController } from './delivery.controller';
import { VerificationService } from './services/verification.service';
import { DeliveryService } from './services/delivery.service';
import { IpfsService } from './services/ipfs.service';
import { PaymentService } from './services/payment.service';
import { NotificationService } from './services/notification.service';
import { GpsValidationService } from './services/gps-validation.service';
import { Verification } from './entities/verification.entity';
import { Delivery } from './entities/delivery.entity';
import { Approval } from './entities/approval.entity';
import { InspectorAssignment } from './entities/inspector-assignment.entity';
import { Notification } from './entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Verification,
      Delivery,
      Approval,
      InspectorAssignment,
      Notification,
    ]),
    EventEmitterModule.forRoot(),
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [VerificationController, DeliveryController],
  providers: [
    VerificationService,
    DeliveryService,
    IpfsService,
    PaymentService,
    NotificationService,
    GpsValidationService,
  ],
  exports: [
    VerificationService,
    DeliveryService,
    IpfsService,
    PaymentService,
    NotificationService,
    GpsValidationService,
  ],
})
export class VerificationModule {}
