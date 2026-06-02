import { ApiProperty } from '@nestjs/swagger';

export class WebhookAcceptedResponseDto {
  @ApiProperty({ example: true })
  accepted: boolean;

  @ApiProperty({ example: 'evt_123' })
  eventId: string;

  @ApiProperty({
    description: 'True when the event was already processed (idempotent replay)',
    example: false,
  })
  duplicate: boolean;
}
