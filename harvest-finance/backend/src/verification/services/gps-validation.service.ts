import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * GPS Coordinate validation result
 */
export interface GpsValidationResult {
  valid: boolean;
  distance?: number;
  message?: string;
}

@Injectable()
export class GpsValidationService {
  private readonly logger = new Logger(GpsValidationService.name);
  private readonly validationRadiusMeters: number;

  constructor(private readonly configService: ConfigService) {
    this.validationRadiusMeters = this.configService.get<number>('GPS_VALIDATION_RADIUS_METERS', 100);
  }

  /**
   * Validate GPS coordinates format
   */
  validateCoordinates(lat: number, lng: number): boolean {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return false;
    }

    if (isNaN(lat) || isNaN(lng)) {
      return false;
    }

    if (lat < -90 || lat > 90) {
      return false;
    }

    if (lng < -180 || lng > 180) {
      return false;
    }

    return true;
  }

  /**
   * Validate GPS coordinates within expected delivery radius
   */
  validateWithinRadius(
    gpsLat: number,
    gpsLng: number,
    destLat: number,
    destLng: number,
    radiusMeters?: number,
  ): GpsValidationResult {
    const radius = radiusMeters || this.validationRadiusMeters;

    // First validate the format
    if (!this.validateCoordinates(gpsLat, gpsLng)) {
      return {
        valid: false,
        message: 'Invalid GPS coordinate format',
      };
    }

    if (!this.validateCoordinates(destLat, destLng)) {
      return {
        valid: false,
        message: 'Invalid destination coordinate format',
      };
    }

    // Calculate distance using Haversine formula
    const distance = this.calculateHaversineDistance(
      gpsLat,
      gpsLng,
      destLat,
      destLng,
    );

    const isWithinRadius = distance <= radius;

    this.logger.debug(
      `GPS validation: distance=${distance.toFixed(2)}m, radius=${radius}m, within=${isWithinRadius}`,
    );

    return {
      valid: isWithinRadius,
      distance,
      message: isWithinRadius
        ? `Coordinates are within ${radius}m radius`
        : `Coordinates are ${distance.toFixed(2)}m away (max: ${radius}m)`,
    };
  }

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * Returns distance in meters
   */
  private calculateHaversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const earthRadiusMeters = 6371000; // Earth's radius in meters

    const toRadians = (degrees: number) => degrees * (Math.PI / 180);

    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusMeters * c;
  }

  /**
   * Get validation radius setting
   */
  getValidationRadius(): number {
    return this.validationRadiusMeters;
  }
}
