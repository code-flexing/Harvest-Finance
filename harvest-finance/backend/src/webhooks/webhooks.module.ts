import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VaultsModule } from '../vaults/vaults.module';
import { SorobanModule } from '../soroban/soroban.module';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import { WebhookSignatureService } from './webhook-signature.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [ConfigModule, VaultsModule, SorobanModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookSignatureService, WebhookSignatureGuard],
  exports: [WebhookSignatureService],
})
export class WebhooksModule {}
