'use client';

import React from 'react';
import {
  AlertTriangle,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  MapPin,
  RefreshCcw,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWeather } from '@/hooks/useWeather';
import type { WeatherAlertSeverity } from '@/types/weather';

const iconMap = {
  sun: Sun,
  cloud: Cloud,
  'cloud-sun': CloudSun,
  'cloud-rain': CloudRain,
  'cloud-lightning': CloudLightning,
  'cloud-snow': CloudSnow,
};

const alertTone: Record<
  WeatherAlertSeverity,
  { bg: string; border: string; text: string }
> = {
  info: {
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    border: 'border-sky-100 dark:border-sky-900/40',
    text: 'text-sky-800 dark:text-sky-300',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-100 dark:border-amber-900/40',
    text: 'text-amber-900 dark:text-amber-300',
  },
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-100 dark:border-red-900/40',
    text: 'text-red-900 dark:text-red-300',
  },
};

export function WeatherWidget() {
  const { data, isLoading, error, refresh } = useWeather();

  if (isLoading) {
    return (
      <Card variant="default" className="overflow-hidden">
        <CardBody className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 rounded bg-gray-200 dark:bg-[#1a3020]" />
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl bg-gray-100 dark:bg-[#162a1a] p-5">
                <div className="h-12 w-24 rounded bg-gray-200 dark:bg-[#1a3020]" />
                <div className="mt-4 h-4 w-36 rounded bg-gray-200 dark:bg-[#1a3020]" />
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="h-20 rounded-xl bg-gray-200 dark:bg-[#1a3020]" />
                  <div className="h-20 rounded-xl bg-gray-200 dark:bg-[#1a3020]" />
                  <div className="h-20 rounded-xl bg-gray-200 dark:bg-[#1a3020]" />
                </div>
              </div>
              <div className="rounded-2xl bg-gray-100 dark:bg-[#162a1a] p-5">
                <div className="h-4 w-28 rounded bg-gray-200 dark:bg-[#1a3020]" />
                <div className="mt-3 space-y-3">
                  <div className="h-16 rounded-xl bg-gray-200 dark:bg-[#1a3020]" />
                  <div className="h-16 rounded-xl bg-gray-200 dark:bg-[#1a3020]" />
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card variant="default">
        <CardBody className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Farm weather</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {error || 'Weather data could not be loaded.'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCcw className="h-4 w-4" />}
              onClick={() => void refresh()}
            >
              Retry
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  const WeatherIcon =
    iconMap[data.current.icon as keyof typeof iconMap] || CloudSun;

  return (
    <Card variant="default" className="overflow-hidden border-harvest-green-100">
      <CardHeader
        className="border-b border-gray-100 px-6 py-5"
        title="Farm weather"
        subtitle="Current conditions, forecast, and field alerts for planning harvest and vault activity."
        action={
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCcw className="h-4 w-4" />}
            onClick={() => void refresh()}
          >
            Refresh
          </Button>
        }
      />

      <CardBody className="p-6">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-5">
            <div className="rounded-3xl bg-gradient-to-br from-harvest-green-600 to-emerald-700 p-5 text-white shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-harvest-green-50/90">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {data.location.name}
                      {data.location.region ? `, ${data.location.region}` : ''}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-harvest-green-100">
                    {data.location.country}
                  </p>
                  <div className="mt-5 flex items-end gap-3">
                    <span className="text-5xl font-bold leading-none">
                      {data.current.temperatureC}°C
                    </span>
                    <span className="pb-1 text-base text-harvest-green-100">
                      {data.current.condition}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/12 p-3 backdrop-blur-sm">
                  <WeatherIcon className="h-12 w-12 text-white" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MetricTile
                  icon={<Droplets className="h-4 w-4" />}
                  label="Humidity"
                  value={`${data.current.humidity}%`}
                />
                <MetricTile
                  icon={<CloudRain className="h-4 w-4" />}
                  label="Rainfall"
                  value={`${data.current.rainfallMm} mm`}
                />
                <MetricTile
                  icon={<Wind className="h-4 w-4" />}
                  label="Wind"
                  value={`${data.current.windSpeedKph} km/h`}
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-gray-100 dark:border-[rgba(141,187,85,0.15)] bg-gray-50 dark:bg-[#1a3020] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <Thermometer className="h-4 w-4 text-harvest-green-600 dark:text-harvest-green-400" />
                  Seasonal outlook
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {data.seasonalOutlook}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-[rgba(141,187,85,0.15)] bg-gray-50 dark:bg-[#1a3020] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  Planning recommendation
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {data.recommendation}
                </p>
                <p className="mt-3 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Source: {data.source}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">7-day forecast</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Forecast icons and rainfall estimates for the coming week.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {data.forecast.map((day) => {
                  const ForecastIcon =
                    iconMap[day.icon as keyof typeof iconMap] || CloudSun;

                  return (
                    <div
                      key={day.date}
                      className="rounded-2xl border border-gray-100 dark:border-[rgba(141,187,85,0.15)] bg-white dark:bg-[#1a3020] p-4 shadow-sm dark:shadow-none"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {day.dayLabel}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{day.condition}</p>
                        </div>
                        <ForecastIcon className="h-5 w-5 text-harvest-green-600 dark:text-harvest-green-400" />
                      </div>

                      <div className="mt-4 flex items-end justify-between">
                        <div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {day.maxTempC}°
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{day.minTempC}° low</p>
                        </div>
                        <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                          <p>{day.rainfallMm} mm rain</p>
                          <p>{day.precipitationChance}% chance</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl border border-gray-100 dark:border-[rgba(141,187,85,0.15)] bg-white dark:bg-[#162a1a] p-5 shadow-sm dark:shadow-none">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Weather alerts
                </h4>
              </div>

              <div className="mt-4 space-y-3">
                {data.alerts.length > 0 ? (
                  data.alerts.map((alert) => {
                    const tone = alertTone[alert.severity];

                    return (
                      <div
                        key={`${alert.title}-${alert.message}`}
                        className={`rounded-2xl border p-4 ${tone.bg} ${tone.border}`}
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`mt-0.5 h-4 w-4 ${tone.text}`} />
                          <div>
                            <p className={`text-sm font-semibold ${tone.text}`}>
                              {alert.title}
                            </p>
                            <p className={`mt-1 text-sm leading-6 ${tone.text}`}>
                              {alert.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-emerald-100 dark:border-[rgba(74,222,128,0.2)] bg-emerald-50 dark:bg-[rgba(74,222,128,0.08)] p-4 text-sm text-emerald-900 dark:text-emerald-300">
                    No severe weather alerts are active. Conditions are stable for regular farm operations.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-[rgba(141,187,85,0.15)] bg-gray-50 dark:bg-[#1a3020] p-5">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                This week at a glance
              </h4>
              <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center justify-between rounded-xl bg-white dark:bg-[#162a1a] px-4 py-3">
                  <span>Warmest day</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {
                      [...data.forecast].sort(
                        (left, right) => right.maxTempC - left.maxTempC,
                      )[0].dayLabel
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white dark:bg-[#162a1a] px-4 py-3">
                  <span>Wettest day</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {
                      [...data.forecast].sort(
                        (left, right) => right.rainfallMm - left.rainfallMm,
                      )[0].dayLabel
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white dark:bg-[#162a1a] px-4 py-3">
                  <span>Windiest day</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {
                      [...data.forecast].sort(
                        (left, right) => right.windSpeedKph - left.windSpeedKph,
                      )[0].dayLabel
                    }
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </CardBody>
    </Card>
  );
}

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-harvest-green-100">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
