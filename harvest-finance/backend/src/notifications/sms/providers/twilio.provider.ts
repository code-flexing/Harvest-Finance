import { SMSProvider } from '../sms.provider';

/**
 * Twilio SMS Provider implementation
 * In production, integrate with actual Twilio SDK
 */
export class TwilioSMSProvider implements SMSProvider {
  constructor() {
    // In production:
    // this.twilioClient = require('twilio')(
    //   process.env.TWILIO_ACCOUNT_SID,
    //   process.env.TWILIO_AUTH_TOKEN,
    // );
  }

  async send(phoneNumber: string, message: string): Promise<{ messageId: string }> {
    // Mock implementation for now
    // In production, use:
    // const result = await this.twilioClient.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phoneNumber,
    // });
    // return { messageId: result.sid };

    return {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  async sendOTP(phoneNumber: string): Promise<{ otpId: string; expiresIn: number }> {
    // Mock implementation for now
    // In production, use Twilio Verify Service:
    // const verification = await this.twilioClient.verify.v2
    //   .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    //   .verifications.create({
    //     to: phoneNumber,
    //     channel: 'sms',
    //   });
    // return { otpId: verification.sid, expiresIn: 600 };

    return {
      otpId: `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      expiresIn: 600, // 10 minutes
    };
  }

  async verifyOTP(otpId: string, code: string): Promise<boolean> {
    // Mock implementation for now
    // In production, use Twilio Verify Service:
    // const verificationCheck = await this.twilioClient.verify.v2
    //   .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    //   .verificationChecks.create({
    //     to: phoneNumber,
    //     code: code,
    //   });
    // return verificationCheck.status === 'approved';

    return code.length === 6 && /^\d+$/.test(code);
  }
}
