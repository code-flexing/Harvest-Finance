import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Service for sanitizing and validating user inputs
 * Prevents common injection attacks and malformed data
 */
@Injectable()
export class InputSanitizerService {
  /**
   * Validate and sanitize Stellar public key
   */
  validateStellarPublicKey(key: string): string {
    if (!key || typeof key !== 'string') {
      throw new BadRequestException('Invalid Stellar public key format');
    }

    const sanitized = key.trim();

    // Stellar public keys start with 'G' and are 56 characters
    if (!/^G[A-Z2-7]{55}$/.test(sanitized)) {
      throw new BadRequestException('Invalid Stellar public key format');
    }

    return sanitized;
  }

  /**
   * Validate and sanitize contract ID
   */
  validateContractId(id: string): string {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid contract ID format');
    }

    const sanitized = id.trim();

    // Contract IDs are hex strings, typically 56 characters
    if (!/^[a-f0-9]{56}$/i.test(sanitized)) {
      throw new BadRequestException('Invalid contract ID format');
    }

    return sanitized.toLowerCase();
  }

  /**
   * Validate and sanitize UUID
   */
  validateUUID(id: string): string {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid UUID format');
    }

    const sanitized = id.trim();
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(sanitized)) {
      throw new BadRequestException('Invalid UUID format');
    }

    return sanitized.toLowerCase();
  }

  /**
   * Validate and sanitize email
   */
  validateEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      throw new BadRequestException('Invalid email format');
    }

    const sanitized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(sanitized)) {
      throw new BadRequestException('Invalid email format');
    }

    return sanitized;
  }

  /**
   * Validate numeric amount (prevents overflow/underflow)
   */
  validateAmount(amount: any, min: number = 0, max: number = 1e30): number {
    const num = Number(amount);

    if (isNaN(num) || !isFinite(num)) {
      throw new BadRequestException('Invalid amount format');
    }

    if (num < min || num > max) {
      throw new BadRequestException(
        `Amount must be between ${min} and ${max}`,
      );
    }

    return num;
  }

  /**
   * Sanitize string input (remove dangerous characters)
   */
  sanitizeString(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') {
      throw new BadRequestException('Input must be a string');
    }

    let sanitized = input.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Enforce max length
    if (sanitized.length > maxLength) {
      throw new BadRequestException(
        `Input exceeds maximum length of ${maxLength} characters`,
      );
    }

    return sanitized;
  }

  /**
   * Validate pagination parameters
   */
  validatePagination(
    skip?: number,
    limit?: number,
    maxLimit: number = 100,
  ): { skip: number; limit: number } {
    const safeSkip = Math.max(0, Math.floor(skip || 0));
    const safeLimit = Math.min(
      Math.max(1, Math.floor(limit || 20)),
      maxLimit,
    );

    return { skip: safeSkip, limit: safeLimit };
  }
}
