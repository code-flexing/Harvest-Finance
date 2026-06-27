import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FIAT_ON_RAMP_PROVIDER,
  OnRampSessionStatus,
} from './interfaces/fiat-on-ramp-provider.interface';
import { PaymentService } from './payment.service';
import { MockFiatOnRampProvider } from './providers/mock-fiat-on-ramp.provider';

describe('PaymentService (fiat on-ramp)', () => {
  let service: PaymentService;
  let provider: MockFiatOnRampProvider;

  const baseRequest = {
    fiatAmount: 100,
    fiatCurrency: 'USD',
    cryptoAsset: 'XLM',
    destinationAddress: 'GABC1234567890',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockFiatOnRampProvider,
        {
          provide: FIAT_ON_RAMP_PROVIDER,
          useExisting: MockFiatOnRampProvider,
        },
        PaymentService,
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    provider = module.get<MockFiatOnRampProvider>(MockFiatOnRampProvider);
  });

  it('returns the configured provider name', () => {
    expect(service.getProviderName()).toBe('mock');
  });

  it('fetches an on-ramp quote', async () => {
    const quote = await service.getOnRampQuote(baseRequest);

    expect(quote.quoteId).toBeDefined();
    expect(quote.fiatAmount).toBe(100);
    expect(quote.cryptoAsset).toBe('XLM');
    expect(Number(quote.cryptoAmount)).toBeGreaterThan(0);
  });

  it('creates an on-ramp session', async () => {
    const session = await service.createOnRampSession({
      ...baseRequest,
      userId: 'user-1',
    });

    expect(session.sessionId).toBeDefined();
    expect(session.checkoutUrl).toContain(session.sessionId);
    expect(session.status).toBe(OnRampSessionStatus.PENDING);
  });

  it('returns session status for an existing session', async () => {
    const session = await service.createOnRampSession({
      ...baseRequest,
      userId: 'user-1',
    });

    const status = await service.getOnRampSessionStatus(session.sessionId);
    expect(status.sessionId).toBe(session.sessionId);
  });

  it('rejects invalid fiat amounts', async () => {
    await expect(
      service.getOnRampQuote({ ...baseRequest, fiatAmount: 0 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects missing destination address', async () => {
    await expect(
      service.createOnRampSession({
        ...baseRequest,
        destinationAddress: '',
        userId: 'user-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('propagates unknown session errors from the provider', async () => {
    await expect(service.getOnRampSessionStatus('missing-session')).rejects.toThrow(
      'On-ramp session not found',
    );
  });

  it('allows the mock provider to advance session status', async () => {
    const session = await service.createOnRampSession({
      ...baseRequest,
      userId: 'user-1',
    });

    provider.updateSessionStatus(
      session.sessionId,
      OnRampSessionStatus.COMPLETED,
    );

    const updated = await service.getOnRampSessionStatus(session.sessionId);
    expect(updated.status).toBe(OnRampSessionStatus.COMPLETED);
  });
});
