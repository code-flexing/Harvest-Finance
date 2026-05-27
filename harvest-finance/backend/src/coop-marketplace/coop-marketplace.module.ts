import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoopMarketplaceController } from './coop-marketplace.controller';
import { CoopMarketplaceService } from './coop-marketplace.service';
import { CoopListing } from '../database/entities/coop-listing.entity';
import { CoopOrder } from '../database/entities/coop-order.entity';
import { CoopReview } from '../database/entities/coop-review.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CoopListing, CoopOrder, CoopReview]),
    AuthModule,
  ],
  controllers: [CoopMarketplaceController],
  providers: [CoopMarketplaceService],
  exports: [CoopMarketplaceService],
})
export class CoopMarketplaceModule {}
