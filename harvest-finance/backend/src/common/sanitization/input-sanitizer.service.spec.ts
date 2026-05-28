import { BadRequestException } from '@nestjs/common';

import { InputSanitizerService } from './input-sanitizer.service';

describe('InputSanitizerService', () => {
  let service: InputSanitizerService;
  const validStellarPublicKey =
    'GD3BFFX7DTNJAGDVVM5RYGGQQNURZTH4VSBLWF55YXY3L6T2WWZK57EI';
  const validContractId =
    'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';

  beforeEach(() => {
    service = new InputSanitizerService();
  });

  describe('validateUUID', () => {
    it('accepts valid lowercase v4 UUIDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';

      expect(service.validateUUID(uuid)).toBe(uuid);
    });

    it('trims and normalizes uppercase UUIDs', () => {
      expect(
        service.validateUUID('  6F9619FF-8B86-D011-B42D-00CF4FC964FF  '),
      ).toBe('6f9619ff-8b86-d011-b42d-00cf4fc964ff');
    });

    it.each([
      '',
      '   ',
      '550e8400e29b41d4a716446655440000',
      '550e8400-e29b-41d4-a716-44665544000',
      '550e8400-e29b-41d4-a716-4466554400000',
      '550e8400-e29b-41d4-a716-44665544zzzz',
      '550e8400-e29b-41d4-a716_446655440000',
      'not-a-uuid',
    ])('rejects invalid UUID value "%s"', (value) => {
      expect(() => service.validateUUID(value)).toThrow(BadRequestException);
    });

    it.each([null, undefined, 1234, {}, []])(
      'rejects non-string UUID value %p',
      (value) => {
        expect(() => service.validateUUID(value as unknown as string)).toThrow(
          BadRequestException,
        );
      },
    );
  });

  describe('validateEmail', () => {
    it('accepts and normalizes valid standard emails', () => {
      expect(service.validateEmail('user@domain.com')).toBe('user@domain.com');
      expect(service.validateEmail('  USER@domain.COM  ')).toBe(
        'user@domain.com',
      );
    });

    it('accepts valid internationalized and subdomain emails', () => {
      expect(service.validateEmail('user@domain.co.uk')).toBe(
        'user@domain.co.uk',
      );
      expect(service.validateEmail('user@sub.domain.company')).toBe(
        'user@sub.domain.company',
      );
    });

    it.each([
      '',
      '   ',
      'plain-text',
      '@domain.com',
      'user@',
      'user@domain',
      'user@domain.',
      'user @domain.com',
      'user@ domain.com',
      'user@domain. com',
    ])('rejects invalid email format "%s"', (value) => {
      expect(() => service.validateEmail(value)).toThrow(BadRequestException);
    });

    it.each([null, undefined, 1234, {}, []])(
      'rejects non-string email value %p',
      (value) => {
        expect(() => service.validateEmail(value as unknown as string)).toThrow(
          BadRequestException,
        );
      },
    );
  });

  describe('validateStellarPublicKey', () => {
    it('accepts valid Stellar G-addresses', () => {
      expect(
        service.validateStellarPublicKey(`  ${validStellarPublicKey}  `),
      ).toBe(validStellarPublicKey);
    });

    it('rejects malformed Stellar public keys with format guidance', () => {
      expect(() => service.validateStellarPublicKey('invalid')).toThrow(
        /G-address with a correct Stellar StrKey checksum/,
      );
    });
  });

  describe('validateContractId', () => {
    it('accepts a valid Stellar contract C-address', () => {
      expect(service.validateContractId(validContractId)).toBe(validContractId);
    });

    it('trims surrounding whitespace and returns the bare C-address', () => {
      expect(service.validateContractId(`  ${validContractId}  `)).toBe(
        validContractId,
      );
    });

    it('rejects a string of 56 repeated "a" characters (not a valid C-address)', () => {
      expect(() => service.validateContractId('a'.repeat(56))).toThrow(
        /contract C-address with a correct StrKey checksum/,
      );
    });

    it('rejects a G-address (public key) passed as a contract ID', () => {
      expect(() =>
        service.validateContractId(validStellarPublicKey),
      ).toThrow(BadRequestException);
    });

    it('rejects a 64-character hex string (not a Stellar C-address)', () => {
      expect(() =>
        service.validateContractId('a'.repeat(64)),
      ).toThrow(BadRequestException);
    });

    it('rejects an odd-length hex string', () => {
      expect(() =>
        service.validateContractId('abc'),
      ).toThrow(BadRequestException);
    });

    it('rejects a string with non-hex, non-base32 characters', () => {
      expect(() =>
        service.validateContractId('ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ'),
      ).toThrow(BadRequestException);
    });

    it('rejects an empty string', () => {
      expect(() => service.validateContractId('')).toThrow(BadRequestException);
    });

    it('rejects a whitespace-only string', () => {
      expect(() => service.validateContractId('   ')).toThrow(
        BadRequestException,
      );
    });

    it.each([null, undefined, 42, {}, []])(
      'rejects non-string value %p',
      (value) => {
        expect(() =>
          service.validateContractId(value as unknown as string),
        ).toThrow(BadRequestException);
      },
    );

    it('includes example C-address format in the empty-input error message', () => {
      expect(() => service.validateContractId('')).toThrow(
        /C-address format/,
      );
    });
  });

  describe('validateAmount', () => {
    it('rejects non-finite amounts with bounds guidance', () => {
      expect(() => service.validateAmount(Number.POSITIVE_INFINITY)).toThrow(
        /finite numeric value/,
      );
    });
  });

  describe('sanitizeString', () => {
    it('rejects oversized strings with max length guidance', () => {
      expect(() => service.sanitizeString('abcd', 3)).toThrow(
        /3 characters or fewer/,
      );
    });
  });
});
