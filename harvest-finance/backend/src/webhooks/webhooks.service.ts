import { Injectable } from '@nestjs/common';
import { VaultsService } from '../vaults/vaults.service';
import { SorobanIndexerService } from '../soroban/soroban-indexer.service';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { ChainEventWebhookDto } from './dto/chain-event-webhook.dto';
import { WebhookAcceptedResponseDto } from './dto/webhook-response.dto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly vaultsService: VaultsService,
    private readonly sorobanIndexer: SorobanIndexerService,
  ) {}

  async handlePaymentWebhook(
    dto: PaymentWebhookDto,
  ): Promise<WebhookAcceptedResponseDto> {
    const result = await this.vaultsService.applyExternalPaymentNotification({
      depositId: dto.depositId,
      eventType: dto.eventType,
      transactionHash: dto.transactionHash,
      stellarTransactionId: dto.stellarTransactionId ?? null,
      externalEventId: dto.eventId,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
    });

    return {
      accepted: true,
      eventId: dto.eventId,
      duplicate: result.duplicate,
    };
  }

  async handleChainEventWebhook(
    dto: ChainEventWebhookDto,
  ): Promise<WebhookAcceptedResponseDto> {
    const result = await this.sorobanIndexer.ingestExternalEvent(dto);

    return {
      accepted: true,
      eventId: dto.eventId,
      duplicate: !result.stored,
    };
  }
}
