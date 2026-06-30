import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { SMSProvider } from './sms.provider';
import { TwilioSMSProvider } from './providers/twilio.provider';

export interface SendSMSDto {
  userId: string;
  message: string;
  eventType: string;
}

@Injectable()
export class SMSService {
  private smsProvider: SMSProvider;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.smsProvider = new TwilioSMSProvider();
  }

  /**
   * Send SMS notification to user's verified phone number
   */
  async sendSMS(dto: SendSMSDto): Promise<{ success: boolean; messageId?: string }> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.phoneNumber) {
      throw new BadRequestException(
        'User has not provided a phone number',
      );
    }

    if (!user.phoneVerifiedAt) {
      throw new BadRequestException(
        'User phone number is not verified',
      );
    }

    try {
      const result = await this.smsProvider.send(
        user.phoneNumber,
        dto.message,
      );

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to send SMS: ${error.message}`,
      );
    }
  }

  /**
   * Request OTP for phone number verification
   */
  async requestPhoneVerification(
    userId: string,
  ): Promise<{ expiresIn: number }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.phoneNumber) {
      throw new BadRequestException(
        'Phone number not set on user account',
      );
    }

    try {
      const result = await this.smsProvider.sendOTP(user.phoneNumber);
      return { expiresIn: result.expiresIn };
    } catch (error) {
      throw new BadRequestException(
        `Failed to send OTP: ${error.message}`,
      );
    }
  }

  /**
   * Verify phone number with OTP code
   */
  async verifyPhoneNumber(
    userId: string,
    otpCode: string,
  ): Promise<{ verified: boolean }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.phoneNumber) {
      throw new BadRequestException(
        'Phone number not set on user account',
      );
    }

    try {
      // Note: In production, store OTP session ID and verify against it
      // For now, we'll assume OTP verification is mocked
      const verified = await this.smsProvider.verifyOTP('session-id', otpCode);

      if (verified) {
        await this.userRepository.update(
          { id: userId },
          { phoneVerifiedAt: new Date() },
        );
      }

      return { verified };
    } catch (error) {
      throw new BadRequestException(
        `Failed to verify OTP: ${error.message}`,
      );
    }
  }

  /**
   * Set phone number for user
   */
  async setPhoneNumber(userId: string, phoneNumber: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(
      { id: userId },
      {
        phoneNumber,
        phoneVerifiedAt: null, // Reset verification status
      },
    );
  }
}
