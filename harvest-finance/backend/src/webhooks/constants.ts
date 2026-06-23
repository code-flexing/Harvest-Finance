export const WEBHOOK_HMAC_KEY = 'webhook_hmac_secret';

export const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature';

export type WebhookSecretKind = 'payments' | 'chain-events' | 'withdrawals';

export const WEBHOOK_SECRET_ENV: Record<WebhookSecretKind, string> = {
  payments: 'WEBHOOK_PAYMENTS_HMAC_SECRET',
  'chain-events': 'WEBHOOK_CHAIN_EVENTS_HMAC_SECRET',
  withdrawals: 'WEBHOOK_WITHDRAWALS_HMAC_SECRET',
};
