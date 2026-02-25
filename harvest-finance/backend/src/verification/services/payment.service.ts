import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  amount?: number;
  message?: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly autoReleaseEnabled: boolean;
  // In-memory store for idempotency (in production, use a database)
  private readonly processedTransactions = new Map<string, PaymentResult>();

  constructor(private readonly configService: ConfigService) {
    this.autoReleaseEnabled = this.configService.get<boolean>('PAYMENT_AUTO_RELEASE', true);
  }

  /**
   * Release payment for a verified delivery
   * Implements idempotency - same request won't be processed twice
   * @param deliveryId The delivery ID
   * @param amount Payment amount
   * @param recipientId Recipient wallet/account ID
   */
  async releasePayment(
    deliveryId: string,
    amount: number,
    recipientId: string,
  ): Promise<PaymentResult> {
    const idempotencyKey = `payment_${deliveryId}_${recipientId}`;

    // Check for idempotency - if already processed, return previous result
    if (this.processedTransactions.has(idempotencyKey)) {
      const cachedResult = this.processedTransactions.get(idempotencyKey);
      this.logger.log(
        `Payment for delivery ${deliveryId} already processed, returning cached result`,
      );
      return cachedResult!;
    }

    // Check if auto-release is enabled
    if (!this.autoReleaseEnabled) {
      const result: PaymentResult = {
        success: false,
        message: 'Automatic payment release is disabled',
      };
      this.processedTransactions.set(idempotencyKey, result);
      return result;
    }

    try {
      this.logger.log(
        `Initiating payment release for delivery ${deliveryId}: ${amount} to ${recipientId}`,
      );

      // Mock payment processing - in production, integrate with actual payment gateway
      const transactionId = await this.processMockPayment(deliveryId, amount, recipientId);

      const result: PaymentResult = {
        success: true,
        transactionId,
        amount,
        message: 'Payment released successfully',
      };

      // Cache the result for idempotency
      this.processedTransactions.set(idempotencyKey, result);

      this.logger.log(
        `Payment released successfully for delivery ${deliveryId}, transaction: ${transactionId}`,
      );

      return result;
    } catch (error) {
      const result: PaymentResult = {
        success: false,
        message: `Payment failed: ${error.message}`,
      };

      this.processedTransactions.set(idempotencyKey, result);

      this.logger.error(
        `Payment failed for delivery ${deliveryId}: ${error.message}`,
      );

      return result;
    }
  }

  /**
   * Process mock payment - simulates actual payment gateway
   */
  private async processMockPayment(
    deliveryId: string,
    amount: number,
    recipientId: string,
  ): Promise<string> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate mock transaction ID
    const transactionId = `txn_${Date.now()}_${deliveryId.substring(0, 8)}_${Math.random().toString(36).substring(7)}`;

    // Log the mock payment details
    this.logger.debug(`Mock payment: ${amount} to ${recipientId}, txn: ${transactionId}`);

    // In production, this would call actual payment APIs (Stripe, Stellar, etc.)
    return transactionId;
  }

  /**
   * Check payment status for a delivery
   */
  async getPaymentStatus(deliveryId: string, recipientId: string): Promise<PaymentResult | null> {
    const idempotencyKey = `payment_${deliveryId}_${recipientId}`;
    return this.processedTransactions.get(idempotencyKey) || null;
  }

  /**
   * Check if auto-release is enabled
   */
  isAutoReleaseEnabled(): boolean {
    return this.autoReleaseEnabled;
  }

  /**
   * Clear transaction cache (for testing)
   */
  clearCache(): void {
    this.processedTransactions.clear();
  }
}
