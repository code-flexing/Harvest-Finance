import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Service for sanitizing and validating user inputs
 * Prevents common injection attacks and malformed data
 */
@Injectable()
export class InputSanitizerService {
  /**
   * Validate and sanitize a Stellar public key.
   *
   * @param key - The Stellar public key to validate.
   * @returns The trimmed Stellar public key if valid.
   * @throws {BadRequestException} When the key is missing, not a string, or does not match the expected Stellar public key format.
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
   * Validate and sanitize a contract ID.
   *
   * @param id - The contract ID to validate.
   * @returns The trimmed, lowercased contract ID if valid.
   * @throws {BadRequestException} When the ID is missing, not a string, or is not a 56-character hex string.
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
   * Validate and sanitize a UUID.
   *
   * @param id - The UUID string to validate.
   * @returns The trimmed, lowercased UUID if valid.
   * @throws {BadRequestException} When the UUID is missing, not a string, or does not match UUID format.
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
   * Validate and sanitize an email address.
   *
   * @param email - The email address to validate.
   * @returns The trimmed, lowercased email address if valid.
   * @throws {BadRequestException} When the email is missing, not a string, or fails basic email validation.
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
   * Validate a numeric amount and ensure it falls within bounds.
   *
   * @param amount - The amount to validate and convert to a number.
   * @param min - The minimum allowed value (inclusive). Defaults to 0.
   * @param max - The maximum allowed value (inclusive). Defaults to 1e30.
   * @returns The validated numeric amount.
   * @throws {BadRequestException} When the amount is not a finite number or is outside the allowed range.
   */
  validateAmount(amount: any, min: number = 0, max: number = 1e30): number {
    const num = Number(amount);

    if (isNaN(num) || !isFinite(num)) {
      throw new BadRequestException('Invalid amount format');
    }

    if (num < min || num > max) {
      throw new BadRequestException(`Amount must be between ${min} and ${max}`);
    }

    return num;
  }

  /**
   * Sanitize a string input by trimming whitespace and removing dangerous characters.
   *
   * @param input - The string to sanitize.
   * @param maxLength - The maximum allowed length for the sanitized string. Defaults to 1000.
   * @returns The sanitized string.
   * @throws {BadRequestException} When the input is not a string or the sanitized value exceeds the maximum length.
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
   * Validate pagination parameters and enforce safe defaults.
   *
   * @param skip - Number of records to skip. Defaults to 0 when omitted or invalid.
   * @param limit - Number of records to return. Defaults to 20 when omitted and is bounded by maxLimit.
   * @param maxLimit - The maximum allowed page size. Defaults to 100.
   * @returns An object containing safe skip and limit values.
   */
  validatePagination(
    skip?: number,
    limit?: number,
    maxLimit: number = 100,
  ): { skip: number; limit: number } {
    const safeSkip = Math.max(0, Math.floor(skip || 0));
    const safeLimit = Math.min(Math.max(1, Math.floor(limit || 20)), maxLimit);

    return { skip: safeSkip, limit: safeLimit };
  }
}
