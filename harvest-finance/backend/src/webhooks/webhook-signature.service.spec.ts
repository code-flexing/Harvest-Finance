import { WebhookSignatureService } from './webhook-signature.service';

describe('WebhookSignatureService', () => {
  const service = new WebhookSignatureService();
  const secret = 'test-secret';
  const body = Buffer.from(JSON.stringify({ eventId: 'evt_1' }));

  it('accepts a valid sha256= signature', () => {
    const signature = service.sign(secret, body);
    expect(service.verify(secret, body, signature)).toBe(true);
  });

  it('accepts a bare hex digest', () => {
    const signature = service.sign(secret, body).replace('sha256=', '');
    expect(service.verify(secret, body, signature)).toBe(true);
  });

  it('rejects an invalid signature', () => {
    expect(service.verify(secret, body, 'sha256=' + 'a'.repeat(64))).toBe(
      false,
    );
  });

  it('rejects a tampered body', () => {
    const signature = service.sign(secret, body);
    const tampered = Buffer.from(JSON.stringify({ eventId: 'evt_2' }));
    expect(service.verify(secret, tampered, signature)).toBe(false);
  });
});
