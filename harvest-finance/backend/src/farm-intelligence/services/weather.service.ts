import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import axios from 'axios';
import type {
  ForecastDayDto,
  WeatherAlertDto,
  WeatherLocationDto,
  WeatherSummaryDto,
} from '../dto/weather.dto';

type WeatherLookupParams = {
  latitude?: number;
  longitude?: number;
  location?: string;
};

type ResolvedLocation = WeatherLocationDto & {
  source: 'live' | 'fallback';
};

type OpenMeteoForecastResponse = {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    precipitation_probability_max: number[];
  };
};

const FALLBACK_LOCATION = {
  name: 'Kaduna',
  region: 'Kaduna State',
  country: 'Nigeria',
  latitude: 10.5105,
  longitude: 7.4165,
  timezone: 'Africa/Lagos',
};

const WEATHER_CACHE_TTL_MS = 1000 * 60 * 20;

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async getWeatherSummary(
    params: WeatherLookupParams,
  ): Promise<WeatherSummaryDto> {
    const resolvedLocation = await this.resolveLocation(params);
    const cacheKey = this.buildCacheKey(resolvedLocation);
    const cached = await this.cacheManager.get<WeatherSummaryDto>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get<OpenMeteoForecastResponse>(
        'https://api.open-meteo.com/v1/forecast',
        {
          params: {
            latitude: resolvedLocation.latitude,
            longitude: resolvedLocation.longitude,
            current: [
              'temperature_2m',
              'relative_humidity_2m',
              'precipitation',
              'wind_speed_10m',
              'weather_code',
            ].join(','),
            daily: [
              'weather_code',
              'temperature_2m_max',
              'temperature_2m_min',
              'precipitation_sum',
              'wind_speed_10m_max',
              'precipitation_probability_max',
            ].join(','),
            timezone: 'auto',
            forecast_days: 7,
            temperature_unit: 'celsius',
            wind_speed_unit: 'kmh',
            precipitation_unit: 'mm',
          },
          timeout: 12000,
        },
      );

      const summary = this.buildSummary(
        resolvedLocation,
        response.data,
        'open-meteo',
      );
      await this.cacheManager.set(cacheKey, summary, WEATHER_CACHE_TTL_MS);
      return summary;
    } catch (error) {
      this.logger.warn(
        `Weather provider unavailable for ${resolvedLocation.name}; serving fallback data.`,
      );
      const fallback = this.buildFallbackSummary(resolvedLocation);
      await this.cacheManager.set(cacheKey, fallback, WEATHER_CACHE_TTL_MS);
      return fallback;
    }
  }

  private async resolveLocation(
    params: WeatherLookupParams,
  ): Promise<ResolvedLocation> {
    const { latitude, longitude, location } = params;

    if (
      typeof latitude === 'number' &&
      Number.isFinite(latitude) &&
      typeof longitude === 'number' &&
      Number.isFinite(longitude)
    ) {
      return {
        name: 'Current farm location',
        region: null,
        country: 'Detected from coordinates',
        latitude,
        longitude,
        timezone: 'auto',
        source: 'live',
      };
    }

    const locationQuery = location?.trim();
    if (!locationQuery) {
      return {
        ...FALLBACK_LOCATION,
        source: 'fallback',
      };
    }

    try {
      const response = await axios.get<{
        results?: Array<{
          name: string;
          admin1?: string;
          country?: string;
          latitude: number;
          longitude: number;
          timezone?: string;
        }>;
      }>('https://geocoding-api.open-meteo.com/v1/search', {
        params: {
          name: locationQuery,
          count: 1,
          language: 'en',
          format: 'json',
        },
        timeout: 10000,
      });

      const match = response.data.results?.[0];
      if (!match) {
        return {
          ...FALLBACK_LOCATION,
          source: 'fallback',
        };
      }

      return {
        name: match.name,
        region: match.admin1 || null,
        country: match.country || 'Unknown',
        latitude: match.latitude,
        longitude: match.longitude,
        timezone: match.timezone || 'auto',
        source: 'live',
      };
    } catch {
      return {
        ...FALLBACK_LOCATION,
        source: 'fallback',
      };
    }
  }

  private buildSummary(
    location: WeatherLocationDto,
    response: OpenMeteoForecastResponse,
    source: string,
  ): WeatherSummaryDto {
    const forecast: ForecastDayDto[] = response.daily.time.map(
      (date, index) => {
        const weatherCode = response.daily.weather_code[index];
        const descriptor = this.getWeatherDescriptor(weatherCode);

        return {
          date,
          dayLabel: this.getDayLabel(date),
          minTempC: Math.round(response.daily.temperature_2m_min[index]),
          maxTempC: Math.round(response.daily.temperature_2m_max[index]),
          rainfallMm: this.roundValue(response.daily.precipitation_sum[index]),
          windSpeedKph: this.roundValue(
            response.daily.wind_speed_10m_max[index],
          ),
          precipitationChance: Math.round(
            response.daily.precipitation_probability_max[index] || 0,
          ),
          condition: descriptor.label,
          icon: descriptor.icon,
        };
      },
    );

    const currentDescriptor = this.getWeatherDescriptor(
      response.current.weather_code,
    );
    const alerts = this.buildAlerts(response, forecast);
    const recommendation = this.buildRecommendation(response, alerts);

    return {
      location: {
        ...location,
        timezone: response.timezone || location.timezone,
      },
      current: {
        temperatureC: Math.round(response.current.temperature_2m),
        humidity: Math.round(response.current.relative_humidity_2m),
        rainfallMm: this.roundValue(response.current.precipitation),
        windSpeedKph: this.roundValue(response.current.wind_speed_10m),
        condition: currentDescriptor.label,
        icon: currentDescriptor.icon,
        observedAt: response.current.time,
      },
      forecast,
      alerts,
      seasonalOutlook: this.buildSeasonalOutlook(location.latitude, forecast),
      recommendation,
      source,
    };
  }

  private buildFallbackSummary(
    location: WeatherLocationDto,
  ): WeatherSummaryDto {
    const today = new Date();
    const forecast: ForecastDayDto[] = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const temperatures = [33, 34, 32, 31, 29, 30, 31];
      const minimums = [24, 24, 23, 23, 22, 22, 23];
      const rainfall = [0, 0.8, 3.2, 5.4, 1.1, 0, 0];
      const wind = [14, 16, 21, 26, 20, 15, 14];
      const icons = [
        'sun',
        'cloud-sun',
        'cloud-rain',
        'cloud-rain',
        'cloud',
        'sun',
        'sun',
      ];
      const conditions = [
        'Sunny',
        'Mostly clear',
        'Light showers',
        'Rain showers',
        'Partly cloudy',
        'Sunny',
        'Sunny',
      ];

      return {
        date: date.toISOString().slice(0, 10),
        dayLabel: this.getDayLabel(date.toISOString()),
        minTempC: minimums[index],
        maxTempC: temperatures[index],
        rainfallMm: rainfall[index],
        windSpeedKph: wind[index],
        precipitationChance: rainfall[index] > 0 ? 55 + index * 5 : 15,
        condition: conditions[index],
        icon: icons[index],
      };
    });

    const alerts: WeatherAlertDto[] = [
      {
        title: 'Heat-aware irrigation planning',
        message:
          'Warm afternoon temperatures are expected this week. Schedule irrigation and field checks earlier in the day.',
        severity: 'info',
      },
    ];

    return {
      location,
      current: {
        temperatureC: 32,
        humidity: 61,
        rainfallMm: 0,
        windSpeedKph: 18,
        condition: 'Partly cloudy',
        icon: 'cloud-sun',
        observedAt: new Date().toISOString(),
      },
      forecast,
      alerts,
      seasonalOutlook: this.buildSeasonalOutlook(location.latitude, forecast),
      recommendation:
        'Weather provider data is temporarily unavailable, so the dashboard is showing a cached planning forecast.',
      source: 'fallback',
    };
  }

  private buildAlerts(
    response: OpenMeteoForecastResponse,
    forecast: ForecastDayDto[],
  ): WeatherAlertDto[] {
    const alerts: WeatherAlertDto[] = [];
    const severeCodes = new Set([65, 67, 75, 82, 86, 95, 96, 99]);

    if (severeCodes.has(response.current.weather_code)) {
      alerts.push({
        title: 'Severe weather risk today',
        message:
          'Current conditions indicate heavy rain, storms, or hail risk. Delay sensitive field operations and review vault logistics.',
        severity: 'critical',
      });
    }

    const wettestDay = forecast.reduce((currentMax, day) =>
      day.rainfallMm > currentMax.rainfallMm ? day : currentMax,
    );
    if (wettestDay.rainfallMm >= 20 || wettestDay.precipitationChance >= 80) {
      alerts.push({
        title: `Rain alert for ${wettestDay.dayLabel}`,
        message: `Expect up to ${wettestDay.rainfallMm} mm of rainfall. Plan harvest movement and storage access ahead of time.`,
        severity: wettestDay.rainfallMm >= 35 ? 'critical' : 'warning',
      });
    }

    const windiestDay = forecast.reduce((currentMax, day) =>
      day.windSpeedKph > currentMax.windSpeedKph ? day : currentMax,
    );
    if (windiestDay.windSpeedKph >= 35) {
      alerts.push({
        title: `High wind on ${windiestDay.dayLabel}`,
        message: `Forecast wind speed may reach ${windiestDay.windSpeedKph} km/h. Secure drying materials and inspect temporary structures.`,
        severity: windiestDay.windSpeedKph >= 45 ? 'critical' : 'warning',
      });
    }

    const hottestDay = forecast.reduce((currentMax, day) =>
      day.maxTempC > currentMax.maxTempC ? day : currentMax,
    );
    if (hottestDay.maxTempC >= 36) {
      alerts.push({
        title: `Heat stress risk on ${hottestDay.dayLabel}`,
        message: `Temperatures may reach ${hottestDay.maxTempC}°C. Move labour-intensive work to early hours and monitor irrigation closely.`,
        severity: hottestDay.maxTempC >= 39 ? 'critical' : 'warning',
      });
    }

    return alerts.slice(0, 3);
  }

  private buildSeasonalOutlook(
    latitude: number,
    forecast: ForecastDayDto[],
  ): string {
    const month = new Date().getUTCMonth();
    const isNorthernHemisphere = latitude >= 0;
    const season = isNorthernHemisphere
      ? this.getNorthernSeason(month)
      : this.getSouthernSeason(month);
    const avgRainfall =
      forecast.reduce((total, day) => total + day.rainfallMm, 0) /
      forecast.length;

    if (avgRainfall >= 8) {
      return `${season} conditions are trending wetter than normal this week. Prioritize drainage access, harvest timing, and dry storage checks.`;
    }

    if (avgRainfall <= 1.5) {
      return `${season} conditions are relatively dry this week. This is a good window for field access, but irrigation demand may increase.`;
    }

    return `${season} conditions look balanced this week, with enough moisture for planning without sustained disruption to field movement.`;
  }

  private buildRecommendation(
    response: OpenMeteoForecastResponse,
    alerts: WeatherAlertDto[],
  ): string {
    if (alerts.some((alert) => alert.severity === 'critical')) {
      return 'Review harvest logistics, pause nonessential outdoor work during peak weather risk, and protect produce before the alert window.';
    }

    if (
      response.current.precipitation > 0 ||
      alerts.some((alert) => alert.severity === 'warning')
    ) {
      return 'Keep transport and storage plans flexible this week, and align field tasks with the drier parts of the forecast.';
    }

    return 'Conditions are stable enough for routine planting, vault visits, and harvest planning over the next seven days.';
  }

  private getWeatherDescriptor(code: number): { label: string; icon: string } {
    if (code === 0) {
      return { label: 'Clear sky', icon: 'sun' };
    }

    if ([1, 2].includes(code)) {
      return { label: 'Partly cloudy', icon: 'cloud-sun' };
    }

    if (code === 3 || code === 45 || code === 48) {
      return { label: 'Cloudy', icon: 'cloud' };
    }

    if ([51, 53, 55, 56, 57, 61, 63, 80, 81].includes(code)) {
      return { label: 'Rain showers', icon: 'cloud-rain' };
    }

    if ([65, 66, 67, 82].includes(code)) {
      return { label: 'Heavy rain', icon: 'cloud-rain' };
    }

    if ([71, 73, 75, 77, 85, 86].includes(code)) {
      return { label: 'Snow or hail', icon: 'cloud-snow' };
    }

    if ([95, 96, 99].includes(code)) {
      return { label: 'Thunderstorm', icon: 'cloud-lightning' };
    }

    return { label: 'Variable conditions', icon: 'cloud' };
  }

  private getDayLabel(input: string): string {
    const date = new Date(input);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  private getNorthernSeason(month: number): string {
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Autumn';
    return 'Winter';
  }

  private getSouthernSeason(month: number): string {
    if (month >= 2 && month <= 4) return 'Autumn';
    if (month >= 5 && month <= 7) return 'Winter';
    if (month >= 8 && month <= 10) return 'Spring';
    return 'Summer';
  }

  private buildCacheKey(location: WeatherLocationDto): string {
    return `weather:${location.latitude.toFixed(3)}:${location.longitude.toFixed(3)}`;
  }

  private roundValue(value: number): number {
    return Math.round(value * 10) / 10;
  }
}
