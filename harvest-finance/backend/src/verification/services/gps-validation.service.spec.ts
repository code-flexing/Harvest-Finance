import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GpsValidationService } from './gps-validation.service';

describe('GpsValidationService', () => {
  let service: GpsValidationService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: any) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GpsValidationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GpsValidationService>(GpsValidationService);
  });

  describe('validateCoordinates', () => {
    it('should return true for valid coordinates', () => {
      expect(service.validateCoordinates(40.7128, -74.006)).toBe(true);
      expect(service.validateCoordinates(0, 0)).toBe(true);
      expect(service.validateCoordinates(90, 180)).toBe(true);
      expect(service.validateCoordinates(-90, -180)).toBe(true);
    });

    it('should return false for invalid latitude', () => {
      expect(service.validateCoordinates(91, 0)).toBe(false);
      expect(service.validateCoordinates(-91, 0)).toBe(false);
    });

    it('should return false for invalid longitude', () => {
      expect(service.validateCoordinates(0, 181)).toBe(false);
      expect(service.validateCoordinates(0, -181)).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(service.validateCoordinates(NaN, 0)).toBe(false);
      expect(service.validateCoordinates(0, NaN)).toBe(false);
    });
  });

  describe('validateWithinRadius', () => {
    it('should return valid when coordinates are within radius', () => {
      // Same coordinates should have 0 distance
      const result = service.validateWithinRadius(40.7128, -74.006, 40.7128, -74.006);
      expect(result.valid).toBe(true);
      expect(result.distance).toBe(0);
    });

    it('should return invalid when coordinates are outside radius', () => {
      // These points are far apart (>100m)
      const result = service.validateWithinRadius(
        40.7128,
        -74.006,
        40.7200,
        -74.0100,
      );
      expect(result.valid).toBe(false);
      expect(result.distance).toBeGreaterThan(100);
    });

    it('should use custom radius when provided', () => {
      const result = service.validateWithinRadius(
        40.7128,
        -74.006,
        40.7128,
        -74.006,
        1000,
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('getValidationRadius', () => {
    it('should return default radius of 100 meters', () => {
      expect(service.getValidationRadius()).toBe(100);
    });
  });
});
