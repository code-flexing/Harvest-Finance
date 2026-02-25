import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: any) => {
      if (key === 'PAYMENT_AUTO_RELEASE') {
        return true; // Default enabled
      }
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    // Clear cache before each test
    service.clearCache();
  });

  describe('releasePayment', () => {
    it('should release payment successfully', async () => {
      const result = await service.releasePayment('delivery-123', 100, 'recipient-456');

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.amount).toBe(100);
    });

    it('should be idempotent - return same result for same request', async () => {
      const result1 = await service.releasePayment('delivery-123', 100, 'recipient-456');
      const result2 = await service.releasePayment('delivery-123', 100, 'recipient-456');

      expect(result1.transactionId).toBe(result2.transactionId);
    });

    it('should fail when auto-release is disabled', async () => {
      const disabledService = new PaymentService({
        get: (key: string) => {
          if (key === 'PAYMENT_AUTO_RELEASE') return false;
          return undefined;
        },
      } as any);
      
      const result = await disabledService.releasePayment('delivery-123', 100, 'recipient-456');

      expect(result.success).toBe(false);
      expect(result.message).toContain('disabled');
    });
  });

  describe('getPaymentStatus', () => {
    it('should return null for non-existent payment', async () => {
      const result = await service.getPaymentStatus('delivery-123', 'recipient-456');
      expect(result).toBeNull();
    });

    it('should return payment status for existing payment', async () => {
      await service.releasePayment('delivery-123', 100, 'recipient-456');
      const result = await service.getPaymentStatus('delivery-123', 'recipient-456');

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });
  });

  describe('isAutoReleaseEnabled', () => {
    it('should return true by default', () => {
      expect(service.isAutoReleaseEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      const disabledService = new PaymentService({
        get: (key: string) => {
          if (key === 'PAYMENT_AUTO_RELEASE') return false;
          return undefined;
        },
      } as any);
      expect(disabledService.isAutoReleaseEnabled()).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear transaction cache', async () => {
      await service.releasePayment('delivery-123', 100, 'recipient-456');
      service.clearCache();
      const result = await service.getPaymentStatus('delivery-123', 'recipient-456');
      expect(result).toBeNull();
    });
  });
});
