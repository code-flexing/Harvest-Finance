import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class WebhookSignatureService {
  /**
   * Verifies an HMAC-SHA256 signature over the raw request body.
   * Accepts `sha256=<hex>` or a bare hex digest in the signature header.
   */
  verify(secret: string, rawBody: Buffer | string, signatureHeader?: string): boolean {
    if (!secret || !signatureHeader) {
      return false;
    }

    const provided = this.normalizeSignature(signatureHeader);
    if (!provided || !/^[a-f0-9]{64}$/i.test(provided)) {
      return false;
    }

    const expected = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    try {
      return timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(provided, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /** Builds a signature header value for outbound tests and integrations. */
  sign(secret: string, rawBody: Buffer | string): string {
    const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
    return `sha256=${digest}`;
  }

  private normalizeSignature(signatureHeader: string): string {
    const trimmed = signatureHeader.trim();
    if (trimmed.startsWith('sha256=')) {
      return trimmed.slice('sha256='.length);
    }
    return trimmed;
  }
}
