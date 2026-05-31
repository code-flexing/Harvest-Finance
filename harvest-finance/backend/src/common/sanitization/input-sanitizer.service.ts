import { Injectable, BadRequestException } from '@nestjs/common';
import { StrKey } from '@stellar/stellar-sdk';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_MIN_AMOUNT = 0;
const DEFAULT_MAX_AMOUNT = 1e30;
const DEFAULT_MAX_STRING_LENGTH = 1000;
const DEFAULT_MAX_PAGE_LIMIT = 100;
const EXAMPLE_STELLAR_PUBLIC_KEY =
  'GD3BFFX7DTNJAGDVVM5RYGGQQNURZTH4VSBLWF55YXY3L6T2WWZK57EI';
const EXAMPLE_STELLAR_CONTRACT_ID =
  'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';

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
      throw new BadRequestException(
        `Stellar public key must be a non-empty string in G-address format, for example ${EXAMPLE_STELLAR_PUBLIC_KEY}.`,
      );
    }

    const sanitized = key.trim();

    if (!StrKey.isValidEd25519PublicKey(sanitized)) {
      throw new BadRequestException(
        'Stellar public key must be a valid 56-character G-address with a correct Stellar StrKey checksum.',
      );
    }

    return sanitized;
  }

  /**
   * Validate and sanitize a contract ID.
   *
   * @param id - The contract ID to validate.
   * @returns The trimmed contract ID if valid.
   * @throws {BadRequestException} When the ID is missing, not a string, or is not a 56-character Stellar contract C-address.
   */
  validateContractId(id: string): string {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException(
        `Contract ID must be a non-empty string in Stellar contract C-address format, for example ${EXAMPLE_STELLAR_CONTRACT_ID}.`,
      );
    }

    const sanitized = id.trim();

    if (!StrKey.isValidContract(sanitized)) {
      throw new BadRequestException(
        'Contract ID must be a valid 56-character Stellar contract C-address with a correct StrKey checksum.',
      );
    }

    return sanitized;
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
      throw new BadRequestException(
        'UUID must be a non-empty string in 8-4-4-4-12 hexadecimal format, for example 550e8400-e29b-41d4-a716-446655440000.',
      );
    }

    const sanitized = id.trim();

    if (!UUID_PATTERN.test(sanitized)) {
      throw new BadRequestException(
        'UUID must use the 8-4-4-4-12 hexadecimal format, for example 550e8400-e29b-41d4-a716-446655440000.',
      );
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
      throw new BadRequestException(
        'Email must be a non-empty string in local@domain format, for example farmer@example.com.',
      );
    }

    const sanitized = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(sanitized)) {
      throw new BadRequestException(
        'Email must include one @ symbol, a local part, and a domain with a dot, for example farmer@example.com.',
      );
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
  validateAmount(
    amount: any,
    min: number = DEFAULT_MIN_AMOUNT,
    max: number = DEFAULT_MAX_AMOUNT,
  ): number {
    const num = Number(amount);

    if (isNaN(num) || !isFinite(num)) {
      throw new BadRequestException(
        `Amount must be a finite numeric value between ${min} and ${max}, for example 100.5.`,
      );
    }

    if (num < min || num > max) {
      throw new BadRequestException(
        `Amount must be between ${min} and ${max}, inclusive.`,
      );
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
  sanitizeString(
    input: string,
    maxLength: number = DEFAULT_MAX_STRING_LENGTH,
  ): string {
    if (typeof input !== 'string') {
      throw new BadRequestException(
        `Input must be a string with no more than ${maxLength} characters.`,
      );
    }

    let sanitized = input.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Enforce max length
    if (sanitized.length > maxLength) {
      throw new BadRequestException(
        `Input must be ${maxLength} characters or fewer after trimming and null-byte removal.`,
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
    maxLimit: number = DEFAULT_MAX_PAGE_LIMIT,
  ): { skip: number; limit: number } {
    const safeSkip = Math.max(0, Math.floor(skip || 0));
    const safeLimit = Math.min(Math.max(1, Math.floor(limit || 20)), maxLimit);

    return { skip: safeSkip, limit: safeLimit };
  }
}
