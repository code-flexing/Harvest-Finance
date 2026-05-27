"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
} from "@/components/ui";
import { Bot, Leaf, MapPin, Sprout, Waves } from "lucide-react";

interface CropRecommendation {
  topic: 'planting' | 'fertilization' | 'irrigation' | 'pest_management';
  title: string;
  advice: string;
  impact: string;
  priority: 'low' | 'medium' | 'high';
}

interface CropAdvisory {
  userId: string;
  recommendations: CropRecommendation[];
  generatedAt: string;
  context: {
    weatherSummary: string;
    marketTrend: string;
    soilHealth: string;
  };
}

interface CropRecommendationPanelProps {
  isOnline: boolean;
}

const seasons = [
  "Rainy season",
  "Dry season",
  "Early planting",
  "Harvest window",
];

export function CropRecommendationPanel({
  isOnline,
}: CropRecommendationPanelProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    location: "Kaduna",
    season: "Rainy season",
    preferredCrop: "",
    soilType: "Loamy",
    farmSize: "4 hectares",
  });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CropAdvisory | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleRecommend = async () => {
    if (!form.location.trim() || !form.season.trim()) {
      setError(
        "Location and season are required before requesting a recommendation.",
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/farm-intelligence/recommendations", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to generate a recommendation right now.",
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate a recommendation right now.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variant="default" className="overflow-hidden">
      <CardHeader
        title={t('dashboard.assistant_title')}
        subtitle={t('dashboard.assistant_subtitle')}
        action={
          <Badge variant={isOnline ? "success" : "warning"} size="sm" isPill>
            {isOnline ? t('common.success') : t('common.cached')}
          </Badge>
        }
      />
      <CardBody className="space-y-6 p-6">
        {/* Inputs removed as recommendations are now auto-generated based on user profile and real-time context */}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-gray-500">
            Recommendations reuse the same AI infrastructure as the assistant
            and cache the latest result for offline viewing.
          </p>
          <Button
            variant="primary"
            onClick={handleRecommend}
            isLoading={isLoading}
            leftIcon={<Bot className="h-4 w-4" />}
          >
            {t('dashboard.refresh')}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('dashboard.advisory_weather')}</p>
                <p className="text-sm font-medium">{result.context.weatherSummary}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('dashboard.advisory_market')}</p>
                <p className="text-sm font-medium">{result.context.marketTrend}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('dashboard.advisory_soil')}</p>
                <p className="text-sm font-medium">{result.context.soilHealth}</p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {result.recommendations.map((item, idx) => (
                <div
                  key={`${item.topic}-${idx}`}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                    <Badge variant={item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'primary'} size="sm">
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">{item.advice}</p>
                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <p>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {t('dashboard.advisory_impact')}:
                      </span>{" "}
                      {item.impact}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
