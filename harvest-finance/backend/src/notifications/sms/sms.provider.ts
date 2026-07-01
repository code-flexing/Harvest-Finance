/**
 * Abstract interface for SMS providers
 * Allows switching between Twilio, Africa's Talking, or other vendors
 */
export interface SMSProvider {
  /**
   * Send SMS to a phone number
   */
  send(phoneNumber: string, message: string): Promise<{ messageId: string }>;

  /**
   * Send OTP code for phone verification
   */
  sendOTP(phoneNumber: string): Promise<{ otpId: string; expiresIn: number }>;

  /**
   * Verify OTP code
   */
  verifyOTP(otpId: string, code: string): Promise<boolean>;
}
