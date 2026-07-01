import { IsPhoneNumber, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPhoneNumberDto {
  @ApiProperty({
    description: 'Phone number in E.164 format',
    example: '+2348012345678',
  })
  @IsPhoneNumber()
  phoneNumber: string;
}

export class VerifyPhoneNumberDto {
  @ApiProperty({
    description: 'OTP code (6 digits)',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  otpCode: string;
}

export class SendSMSDto {
  @ApiProperty({
    description: 'SMS message to send',
    example: 'Your verification code is 123456',
  })
  @IsString()
  @Length(1, 500)
  message: string;

  @ApiProperty({
    description: 'Event type for tracking',
    example: 'withdrawal_alert',
  })
  @IsString()
  eventType: string;
}
