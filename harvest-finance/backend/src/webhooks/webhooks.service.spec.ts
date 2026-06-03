import { Test, TestingModule } from '@nestjs/testing';
import { ExternalPaymentEventType } from '../vaults/dto/external-payment-notification.dto';
import { VaultsService } from '../vaults/vaults.service';
import { SorobanIndexerService } from '../soroban/soroban-indexer.service';
import { WebhooksService } from './webhooks.service';
import { PaymentWebhookEventType } from './dto/payment-webhook.dto';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let vaultsService: { applyExternalPaymentNotification: jest.Mock };
  let sorobanIndexer: { ingestExternalEvent: jest.Mock };

  beforeEach(async () => {
    vaultsService = {
      applyExternalPaymentNotification: jest.fn().mockResolvedValue({
        deposit: { id: 'dep-1' },
        status: 'CONFIRMED',
        duplicate: false,
      }),
    };
    sorobanIndexer = {
      ingestExternalEvent: jest.fn().mockResolvedValue({ stored: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: VaultsService, useValue: vaultsService },
        { provide: SorobanIndexerService, useValue: sorobanIndexer },
      ],
    }).compile();

    service = module.get(WebhooksService);
  });

  it('delegates payment webhooks to VaultsService', async () => {
    const response = await service.handlePaymentWebhook({
      eventId: 'evt_pay_1',
      eventType: PaymentWebhookEventType.PAYMENT_CONFIRMED,
      depositId: '550e8400-e29b-41d4-a716-446655440000',
      transactionHash: 'tx_abc',
    });

    expect(vaultsService.applyExternalPaymentNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: ExternalPaymentEventType.PAYMENT_CONFIRMED,
        externalEventId: 'evt_pay_1',
      }),
    );
    expect(response).toEqual({
      accepted: true,
      eventId: 'evt_pay_1',
      duplicate: false,
    });
  });

  it('delegates chain event webhooks to SorobanIndexerService', async () => {
    const response = await service.handleChainEventWebhook({
      eventId: 'evt_chain_1',
      type: 'contract' as any,
      ledger: 100,
      ledgerClosedAt: '2026-06-02T10:00:00.000Z',
      pagingToken: 'token_1',
    });

    expect(sorobanIndexer.ingestExternalEvent).toHaveBeenCalled();
    expect(response.duplicate).toBe(false);
  });

  it('marks duplicate chain events when nothing was stored', async () => {
    sorobanIndexer.ingestExternalEvent.mockResolvedValue({ stored: false });

    const response = await service.handleChainEventWebhook({
      eventId: 'evt_chain_dup',
      type: 'contract' as any,
      ledger: 100,
      ledgerClosedAt: '2026-06-02T10:00:00.000Z',
      pagingToken: 'token_dup',
    });

    expect(response.duplicate).toBe(true);
  });
});
