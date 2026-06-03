import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { WEBHOOK_SIGNATURE_HEADER } from './constants';
import { WebhookHmac } from './decorators/webhook-hmac.decorator';
import { ChainEventWebhookDto } from './dto/chain-event-webhook.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { WebhookAcceptedResponseDto } from './dto/webhook-response.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@SkipThrottle()
@Controller({
  path: 'webhooks',
  version: '1',
})
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('payments')
  @WebhookHmac('payments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive external payment confirmation webhooks',
    description:
      'Processes payment confirmations from external providers. ' +
      'Requires an HMAC-SHA256 signature of the raw JSON body in the ' +
      `${WEBHOOK_SIGNATURE_HEADER} header (format: sha256=<hex>).`,
  })
  @ApiHeader({
    name: WEBHOOK_SIGNATURE_HEADER,
    required: true,
    description: 'HMAC-SHA256 signature of the raw request body',
  })
  @ApiResponse({ status: 200, type: WebhookAcceptedResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or missing signature' })
  async receivePayment(
    @Body() body: PaymentWebhookDto,
  ): Promise<WebhookAcceptedResponseDto> {
    return this.webhooksService.handlePaymentWebhook(body);
  }

  @Post('chain-events')
  @WebhookHmac('chain-events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive external chain event webhooks',
    description:
      'Ingests Soroban or other chain events pushed by an external indexer. ' +
      'Requires an HMAC-SHA256 signature of the raw JSON body.',
  })
  @ApiHeader({
    name: WEBHOOK_SIGNATURE_HEADER,
    required: true,
    description: 'HMAC-SHA256 signature of the raw request body',
  })
  @ApiResponse({ status: 200, type: WebhookAcceptedResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or missing signature' })
  async receiveChainEvent(
    @Body() body: ChainEventWebhookDto,
  ): Promise<WebhookAcceptedResponseDto> {
    return this.webhooksService.handleChainEventWebhook(body);
  }
}
