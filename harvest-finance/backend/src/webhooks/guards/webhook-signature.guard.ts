import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import {
  WEBHOOK_HMAC_KEY,
  WEBHOOK_SECRET_ENV,
  WEBHOOK_SIGNATURE_HEADER,
  WebhookSecretKind,
} from '../constants';
import { WebhookSignatureService } from '../webhook-signature.service';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly signatureService: WebhookSignatureService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const kind = this.reflector.get<WebhookSecretKind>(
      WEBHOOK_HMAC_KEY,
      context.getHandler(),
    );

    if (!kind) {
      throw new UnauthorizedException('Webhook authentication is not configured');
    }

    const envKey = WEBHOOK_SECRET_ENV[kind];
    const secret = this.config.get<string>(envKey);
    if (!secret) {
      throw new UnauthorizedException('Webhook signing secret is not configured');
    }

    const request = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();
    const signature = request.headers[WEBHOOK_SIGNATURE_HEADER];

    const rawBody =
      request.rawBody ??
      Buffer.from(
        typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body ?? {}),
      );

    if (
      !this.signatureService.verify(
        secret,
        rawBody,
        Array.isArray(signature) ? signature[0] : signature,
      )
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
