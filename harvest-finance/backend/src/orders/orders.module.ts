import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { StellarService } from './stellar.service';
import { AuthModule } from '../auth/auth.module';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [AuthModule, StellarModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, StellarService],
  exports: [OrdersService],
})
export class OrdersModule {}
