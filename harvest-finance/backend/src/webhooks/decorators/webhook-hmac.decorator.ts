import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import {
  WEBHOOK_HMAC_KEY,
  WebhookSecretKind,
} from '../constants';
import { WebhookSignatureGuard } from '../guards/webhook-signature.guard';

export const WebhookHmac = (kind: WebhookSecretKind) =>
  applyDecorators(
    SetMetadata(WEBHOOK_HMAC_KEY, kind),
    UseGuards(WebhookSignatureGuard),
  );
