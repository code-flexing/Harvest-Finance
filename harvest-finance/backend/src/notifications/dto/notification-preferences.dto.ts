import { IsObject, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChannelPreferencesDto {
  @ApiProperty({ description: 'Email notification enabled', type: Boolean })
  @IsBoolean()
  email?: boolean;

  @ApiProperty({ description: 'SMS notification enabled', type: Boolean })
  @IsBoolean()
  sms?: boolean;

  @ApiProperty({ description: 'Push notification enabled', type: Boolean })
  @IsBoolean()
  push?: boolean;

  @ApiProperty({ description: 'In-app notification enabled', type: Boolean })
  @IsBoolean()
  inApp?: boolean;
}

export class NotificationPreferencesDto {
  @ApiProperty({ type: ChannelPreferencesDto })
  @IsOptional()
  @IsObject()
  depositConfirmed?: ChannelPreferencesDto;

  @ApiProperty({ type: ChannelPreferencesDto })
  @IsOptional()
  @IsObject()
  withdrawalCompleted?: ChannelPreferencesDto;

  @ApiProperty({ type: ChannelPreferencesDto })
  @IsOptional()
  @IsObject()
  vaultPaused?: ChannelPreferencesDto;

  @ApiProperty({ type: ChannelPreferencesDto })
  @IsOptional()
  @IsObject()
  securityAlert?: ChannelPreferencesDto;

  @ApiProperty({ type: ChannelPreferencesDto })
  @IsOptional()
  @IsObject()
  yieldMilestone?: ChannelPreferencesDto;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ type: NotificationPreferencesDto })
  @IsObject()
  preferences: NotificationPreferencesDto;
}
