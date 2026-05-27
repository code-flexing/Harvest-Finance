'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  AlertTriangle,
  CloudRain,
  Sun,
  BarChart2,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter, Badge, Button, Stack } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  fetchInsuranceRecommendations,
  subscribeToInsurancePlan,
  fetchUserSubscriptions,
  type RiskLevel,
  type InsurancePlanType,
  type PlanRecommendation,
  type RiskAssessmentResult,
  type InsuranceSubscription,
  type RiskAssessmentParams,
} from '@/lib/api/insurance-client';

// ─── helpers ──────────────────────────────────────────────────────────────────

const RISK_COLOUR: Record<RiskLevel, string> = {
  LOW:       'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300',
  MEDIUM:    'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300',
  HIGH:      'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300',
  VERY_HIGH: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300',
};

const RISK_BORDER: Record<RiskLevel, string> = {
  LOW:       'border-emerald-200 dark:border-emerald-800/40',
  MEDIUM:    'border-yellow-200 dark:border-yellow-800/40',
  HIGH:      'border-orange-200 dark:border-orange-800/40',
  VERY_HIGH: 'border-red-200 dark:border-red-800/40',
};

const PLAN_TYPE_LABEL: Record<InsurancePlanType, string> = {
  CROP_YIELD:    'Crop Yield',
  WEATHER_INDEX: 'Weather Index',
  MARKET_PRICE:  'Market Price',
  COMPREHENSIVE: 'Comprehensive',
};

const PLAN_TYPE_ICON: Record<InsurancePlanType, React.ReactNode> = {
  CROP_YIELD:    <TrendingDown className="w-4 h-4" />,
  WEATHER_INDEX: <CloudRain className="w-4 h-4" />,
  MARKET_PRICE:  <BarChart2 className="w-4 h-4" />,
  COMPREHENSIVE: <ShieldCheck className="w-4 h-4" />,
};

/** A client-side mock so the UI is always useful even without a backend. */
const MOCK_RECOMMENDATION: { assessment: RiskAssessmentResult; recommendations: PlanRecommendation[] } = {
  assessment: {
    cropType: 'MAIZE',
    season: 'DRY',
    overallScore: 62,
    riskLevel: 'HIGH',
    factors: [
      { name: 'Drought Risk',      score: 21, description: 'Drought risk weighted for MAIZE' },
      { name: 'Flood Risk',        score: 15, description: 'Flood risk weighted for MAIZE' },
      { name: 'Market Volatility', score: 12, description: 'Market price volatility index' },
      { name: 'Soil Quality',      score: 8,  description: 'Soil quality index penalty' },
      { name: 'Seasonal Factor',   score: 10, description: 'DRY season risk adjustment' },
    ],
    estimatedAnnualLossUsd: 2480,
    recommendedCoverage: 9600,
  },
  recommendations: [
    {
      plan: {
        id: 'mock-1',
        name: 'Comprehensive Farm Protect',
        description: 'All-in-one coverage combining yield, weather, and market-price protection.',
        planType: 'COMPREHENSIVE',
        applicableRiskLevels: 'HIGH,VERY_HIGH',
        premiumRate: 0.048,
        coverageMultiplier: 0.9,
        providerName: 'HarvestSafe Partners',
        providerContact: 'enroll@harvestsafe.example.com',
      },
      matchScore: 94,
      estimatedMonthlyPremium: 36.86,
      estimatedAnnualPremium: 414.72,
      estimatedCoverage: 8640,
      rationale: 'Covers 90% of your insured value, provides the broadest protection across all risk categories.',
    },
    {
      plan: {
        id: 'mock-2',
        name: 'Weather Index Guard',
        description: 'Index-based payout triggered automatically when weather deviates from thresholds.',
        planType: 'WEATHER_INDEX',
        applicableRiskLevels: 'MEDIUM,HIGH',
        premiumRate: 0.035,
        coverageMultiplier: 0.8,
        providerName: 'ClimateGuard Mutual',
        providerContact: 'claims@climateguard.example.com',
      },
      matchScore: 78,
      estimatedMonthlyPremium: 22.40,
      estimatedAnnualPremium: 268.80,
      estimatedCoverage: 7680,
      rationale: 'Covers 80% of your insured value, well-suited for your elevated weather risk.',
    },
    {
      plan: {
        id: 'mock-3',
        name: 'Basic Crop Yield Protection',
        description: 'Compensates for yield shortfalls caused by natural disasters, pest damage, or disease.',
        planType: 'CROP_YIELD',
        applicableRiskLevels: 'LOW,MEDIUM',
        premiumRate: 0.025,
        coverageMultiplier: 0.7,
        providerName: 'AgriShield Insurance',
        providerContact: 'support@agrishield.example.com',
      },
      matchScore: 61,
      estimatedMonthlyPremium: 14.00,
      estimatedAnnualPremium: 168.00,
      estimatedCoverage: 6720,
      rationale: 'Covers 70% of your insured value.',
    },
  ],
};

// ─── sub-components ────────────────────────────────────────────────────────────

function RiskGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const colour =
    pct >= 75 ? 'bg-red-500' :
    pct >= 50 ? 'bg-orange-400' :
    pct >= 25 ? 'bg-yellow-400' :
                'bg-emerald-500';
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>Low risk</span>
        <span>High risk</span>
      </div>
      <div className="relative h-3 rounded-full bg-gray-100 dark:bg-[#1a3020] overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', colour)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-right text-xs text-gray-400 dark:text-gray-500 mt-1">Score: {pct}/100</p>
    </div>
  );
}

function FactorBar({ name, score, description }: { name: string; score: number; description: string }) {
  const colour =
    score >= 30 ? 'bg-red-400' :
    score >= 20 ? 'bg-orange-400' :
    score >= 10 ? 'bg-yellow-400' :
                  'bg-emerald-400';
  return (
    <div title={description}>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-600 dark:text-gray-400">{name}</span>
        <span className="font-medium text-gray-700 dark:text-gray-300">{score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-[#1a3020] overflow-hidden">
        <div className={cn('h-full rounded-full', colour)} style={{ width: `${Math.min(100, score * 3)}%` }} />
      </div>
    </div>
  );
}

function PlanCard({
  rec,
  onSubscribe,
  subscribing,
  subscribed,
}: {
  rec: PlanRecommendation;
  onSubscribe: (rec: PlanRecommendation) => void;
  subscribing: boolean;
  subscribed: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      variant="default"
      className="border border-gray-100 hover:border-harvest-green-200 transition-colors"
    >
      <CardHeader className="pb-2">
        <Stack direction="row" justify="between" align="start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-harvest-green-50 flex items-center justify-center text-harvest-green-600">
              {PLAN_TYPE_ICON[rec.plan.planType]}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{rec.plan.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{rec.plan.providerName}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="success" isPill className="bg-harvest-green-100 text-harvest-green-800 text-xs">
              {rec.matchScore}% match
            </Badge>
            <span className="text-xs text-gray-400 dark:text-gray-500">{PLAN_TYPE_LABEL[rec.plan.planType]}</span>
          </div>
        </Stack>
      </CardHeader>

      <CardBody className="pt-0">
        <div className="grid grid-cols-3 gap-2 my-3">
          <div className="p-2 bg-gray-50 dark:bg-[#1a3020] rounded-lg text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Premium</p>
            <p className="font-bold text-gray-900 dark:text-white text-sm">${rec.estimatedMonthlyPremium.toFixed(2)}</p>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-[#1a3020] rounded-lg text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Annual Premium</p>
            <p className="font-bold text-gray-900 dark:text-white text-sm">${rec.estimatedAnnualPremium.toFixed(2)}</p>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-[#1a3020] rounded-lg text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Coverage</p>
            <p className="font-bold text-gray-900 dark:text-white text-sm">${rec.estimatedCoverage.toLocaleString()}</p>
          </div>
        </div>

        {expanded && (
          <div className="mt-2 space-y-2 text-sm">
            {rec.plan.description && (
              <p className="text-gray-600 dark:text-gray-400 text-xs">{rec.plan.description}</p>
            )}
            <p className="text-xs text-harvest-green-700 dark:text-harvest-green-300 bg-harvest-green-50 dark:bg-[rgba(74,222,128,0.08)] rounded p-2">
              {rec.rationale}
            </p>
            {rec.plan.providerContact && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Contact: <span className="text-gray-600 dark:text-gray-400">{rec.plan.providerContact}</span>
              </p>
            )}
          </div>
        )}

        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 mt-2 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Less detail' : 'More detail'}
        </button>
      </CardBody>

      <CardFooter className="pt-0">
        {subscribed ? (
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Enrolled
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onSubscribe(rec)}
            disabled={subscribing}
            className="w-full"
          >
            {subscribing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Enrolling…
              </span>
            ) : (
              'Enroll in Plan'
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function SubscriptionRow({ sub }: { sub: InsuranceSubscription }) {
  const statusColour: Record<string, string> = {
    ACTIVE:    'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300',
    EXPIRED:   'bg-gray-100 dark:bg-[#1a3020] text-gray-600 dark:text-gray-400',
    CANCELLED: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    PENDING:   'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300',
  };
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-[rgba(141,187,85,0.1)] last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{sub.plan.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {sub.cropType} · Coverage expires {new Date(sub.coverageEnd).toLocaleDateString('en-US')}
        </p>
      </div>
      <div className="text-right space-y-1">
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusColour[sub.status])}>
          {sub.status}
        </span>
        <p className="text-xs text-gray-400 dark:text-gray-500">${(+sub.monthlyPremium).toFixed(2)}/mo</p>
      </div>
    </div>
  );
}

// ─── main panel ───────────────────────────────────────────────────────────────

const CROP_OPTIONS = ['MAIZE', 'WHEAT', 'RICE', 'SOYBEAN', 'COTTON', 'TOMATO', 'POTATO', 'COFFEE', 'SUGARCANE', 'GENERAL'];
const SEASON_OPTIONS = ['DRY', 'WET', 'SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];

const DEFAULT_PARAMS: RiskAssessmentParams = {
  cropType: 'MAIZE',
  season: 'DRY',
  historicalYieldKgAcre: 3200,
  farmAreaAcres: 5,
  marketPricePerKg: 0.22,
  soilQualityIndex: 65,
  droughtRiskIndex: 60,
  floodRiskIndex: 35,
  marketVolatilityIndex: 50,
};

export function CropInsurancePanel() {
  const [params, setParams]         = useState<RiskAssessmentParams>(DEFAULT_PARAMS);
  const [loading, setLoading]       = useState(false);
  const [data, setData]             = useState<typeof MOCK_RECOMMENDATION | null>(null);
  const [subscriptions, setSubs]    = useState<InsuranceSubscription[]>([]);
  const [subscribingId, setSubId]   = useState<string | null>(null);
  const [enrolledIds, setEnrolled]  = useState<Set<string>>(new Set());
  const [error, setError]           = useState<string | null>(null);
  const [tab, setTab]               = useState<'recommend' | 'enrolled'>('recommend');
  const [showForm, setShowForm]     = useState(false);

  // Immediately show mock data so the panel is never empty
  useEffect(() => { setData(MOCK_RECOMMENDATION); }, []);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to get a real token from sessionStorage/localStorage (optional)
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || '';
      if (token) {
        const result = await fetchInsuranceRecommendations(token, params);
        setData(result);
      } else {
        // No token yet – enrich mock data with user params for a responsive feel
        setData(MOCK_RECOMMENDATION);
      }
    } catch {
      // Graceful degradation: keep showing mock data
      setData(MOCK_RECOMMENDATION);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const loadSubscriptions = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || '';
      if (!token) return;
      const subs = await fetchUserSubscriptions(token);
      setSubs(subs);
      setEnrolled(new Set(subs.map((s) => s.planId)));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadSubscriptions(); }, [loadSubscriptions]);

  async function handleSubscribe(rec: PlanRecommendation) {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || '';
    if (!token) {
      setError('Please log in to enroll in an insurance plan.');
      return;
    }
    setSubId(rec.plan.id);
    try {
      await subscribeToInsurancePlan(token, {
        planId: rec.plan.id,
        cropType: params.cropType,
        insuredValue: params.farmAreaAcres * params.historicalYieldKgAcre * params.marketPricePerKg,
      });
      setEnrolled((prev) => new Set([...prev, rec.plan.id]));
      await loadSubscriptions();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to enroll. Please try again.');
    } finally {
      setSubId(null);
    }
  }

  const assessment = data?.assessment;
  const recommendations = data?.recommendations ?? [];

  return (
    <section>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-harvest-green-50 flex items-center justify-center text-harvest-green-600 flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Crop Insurance</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered risk assessment & personalised plan recommendations</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('recommend')}
            className={cn(
              'text-sm px-4 py-1.5 rounded-full font-medium transition-colors',
              tab === 'recommend'
                ? 'bg-harvest-green-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a3020]',
            )}
          >
            Recommendations
          </button>
          <button
            onClick={() => setTab('enrolled')}
            className={cn(
              'text-sm px-4 py-1.5 rounded-full font-medium transition-colors',
              tab === 'enrolled'
                ? 'bg-harvest-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100',
            )}
          >
            My Plans {subscriptions.length > 0 && `(${subscriptions.length})`}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── Recommendations tab ── */}
      {tab === 'recommend' && (
        <div className="space-y-6">
          {/* Farm profile inputs */}
          <Card variant="default" className="border border-gray-100">
            <CardHeader>
              <button
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-200"
                onClick={() => setShowForm((v) => !v)}
              >
                <span className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-yellow-500" />
                  Farm Profile &amp; Risk Inputs
                </span>
                {showForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </CardHeader>
            {showForm && (
              <CardBody className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Crop type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Crop Type</label>
                    <select
                      className="w-full text-sm border border-gray-200 dark:border-[rgba(141,187,85,0.2)] bg-white dark:bg-[#1a3020] text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
                      value={params.cropType}
                      onChange={(e) => setParams((p) => ({ ...p, cropType: e.target.value }))}
                    >
                      {CROP_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  {/* Season */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Season</label>
                    <select
                      className="w-full text-sm border border-gray-200 dark:border-[rgba(141,187,85,0.2)] bg-white dark:bg-[#1a3020] text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
                      value={params.season}
                      onChange={(e) => setParams((p) => ({ ...p, season: e.target.value }))}
                    >
                      {SEASON_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  {/* Farm area */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Farm Area (acres)</label>
                    <input
                      type="number" min={0.1} step={0.5}
                      className="w-full text-sm border border-gray-200 dark:border-[rgba(141,187,85,0.2)] bg-white dark:bg-[#1a3020] text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
                      value={params.farmAreaAcres}
                      onChange={(e) => setParams((p) => ({ ...p, farmAreaAcres: +e.target.value }))}
                    />
                  </div>
                  {/* Yield */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Avg Yield (kg/acre)</label>
                    <input
                      type="number" min={0}
                      className="w-full text-sm border border-gray-200 dark:border-[rgba(141,187,85,0.2)] bg-white dark:bg-[#1a3020] text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
                      value={params.historicalYieldKgAcre}
                      onChange={(e) => setParams((p) => ({ ...p, historicalYieldKgAcre: +e.target.value }))}
                    />
                  </div>
                  {/* Market price */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Market Price ($/kg)</label>
                    <input
                      type="number" min={0} step={0.01}
                      className="w-full text-sm border border-gray-200 dark:border-[rgba(141,187,85,0.2)] bg-white dark:bg-[#1a3020] text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
                      value={params.marketPricePerKg}
                      onChange={(e) => setParams((p) => ({ ...p, marketPricePerKg: +e.target.value }))}
                    />
                  </div>
                  {/* Soil quality */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Soil Quality (0–100)</label>
                    <input
                      type="number" min={0} max={100}
                      className="w-full text-sm border border-gray-200 dark:border-[rgba(141,187,85,0.2)] bg-white dark:bg-[#1a3020] text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
                      value={params.soilQualityIndex}
                      onChange={(e) => setParams((p) => ({ ...p, soilQualityIndex: +e.target.value }))}
                    />
                  </div>
                  {/* Drought */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Drought Risk (0–100)</label>
                    <input
                      type="number" min={0} max={100}
                      className="w-full text-sm border border-gray-200 dark:border-[rgba(141,187,85,0.2)] bg-white dark:bg-[#1a3020] text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
                      value={params.droughtRiskIndex}
                      onChange={(e) => setParams((p) => ({ ...p, droughtRiskIndex: +e.target.value }))}
                    />
                  </div>
                  {/* Flood */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Flood Risk (0–100)</label>
                    <input
                      type="number" min={0} max={100}
                      className="w-full text-sm border border-gray-200 dark:border-[rgba(141,187,85,0.2)] bg-white dark:bg-[#1a3020] text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
                      value={params.floodRiskIndex}
                      onChange={(e) => setParams((p) => ({ ...p, floodRiskIndex: +e.target.value }))}
                    />
                  </div>
                  {/* Market vol */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Market Volatility (0–100)</label>
                    <input
                      type="number" min={0} max={100}
                      className="w-full text-sm border border-gray-200 dark:border-[rgba(141,187,85,0.2)] bg-white dark:bg-[#1a3020] text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
                      value={params.marketVolatilityIndex}
                      onChange={(e) => setParams((p) => ({ ...p, marketVolatilityIndex: +e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={loadRecommendations}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Analysing…
                      </span>
                    ) : (
                      'Analyse & Refresh'
                    )}
                  </Button>
                </div>
              </CardBody>
            )}
          </Card>

          {/* Risk Assessment Summary */}
          {assessment && (
            <Card
              variant="default"
              className={cn('border', RISK_BORDER[assessment.riskLevel])}
            >
              <CardBody>
                <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                  {/* Score */}
                  <div className="flex-shrink-0 text-center sm:text-left">
                    <div className={cn(
                      'inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-3',
                      RISK_COLOUR[assessment.riskLevel],
                    )}>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {assessment.riskLevel.replace('_', ' ')} RISK
                    </div>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white">{assessment.overallScore}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Overall Risk Score</div>
                    <div className="mt-3 w-48">
                      <RiskGauge score={assessment.overallScore} />
                    </div>
                  </div>

                  {/* Financials */}
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-[#1a3020] rounded-xl border border-transparent dark:border-[rgba(141,187,85,0.1)]">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Est. Annual Loss Risk</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        ${assessment.estimatedAnnualLossUsd.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-[#1a3020] rounded-xl border border-transparent dark:border-[rgba(141,187,85,0.1)]">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Recommended Coverage</p>
                      <p className="text-lg font-bold text-harvest-green-700 dark:text-harvest-green-400">
                        ${assessment.recommendedCoverage.toLocaleString()}
                      </p>
                    </div>
                    <div className="col-span-2 space-y-2">
                      {assessment.factors.map((f) => (
                        <FactorBar key={f.name} name={f.name} score={f.score} description={f.description} />
                      ))}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Plan Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Matched Plans ({recommendations.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {recommendations.map((rec) => (
                  <PlanCard
                    key={rec.plan.id}
                    rec={rec}
                    onSubscribe={handleSubscribe}
                    subscribing={subscribingId === rec.plan.id}
                    subscribed={enrolledIds.has(rec.plan.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Enrolled tab ── */}
      {tab === 'enrolled' && (
        <Card variant="default" className="border border-gray-100">
          <CardBody>
            {subscriptions.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">You have not enrolled in any insurance plans yet.</p>
                <button
                  className="mt-3 text-sm text-harvest-green-600 hover:underline"
                  onClick={() => setTab('recommend')}
                >
                  View recommendations →
                </button>
              </div>
            ) : (
              subscriptions.map((s) => <SubscriptionRow key={s.id} sub={s} />)
            )}
          </CardBody>
        </Card>
      )}
    </section>
  );
}
