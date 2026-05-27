import { BadRequestException } from '@nestjs/common';

import { InputSanitizerService } from './input-sanitizer.service';

describe('InputSanitizerService', () => {
  let service: InputSanitizerService;

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
});
