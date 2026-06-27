import { Vault, RiskLevel } from '@/types/vault';

export type SortKey = 'name' | 'apy' | 'tvl' | 'riskLevel';
export type SortDirection = 'asc' | 'desc';

export const sortVaults = (
  vaults: Vault[],
  key: SortKey,
  direction: SortDirection
): Vault[] => {
  const riskOrder: Record<RiskLevel, number> = {
    Low: 1,
    Medium: 2,
    High: 3,
  };

  return [...vaults].sort((a, b) => {
    let comparison = 0;

    switch (key) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'apy':
        comparison = (a.apy || 0) - (b.apy || 0);
        break;
      case 'tvl':
        comparison = (a.tvl || 0) - (b.tvl || 0);
        break;
      case 'riskLevel':
        comparison = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        break;
      default:
        comparison = 0;
    }

    return direction === 'asc' ? comparison : -comparison;
  });
};

export const getCurrentLocale = (): string => {
  if (typeof window === 'undefined') return 'en';
  const cookieMatch = document.cookie.match(/(^|;)\s*NEXT_LOCALE\s*=\s*([^;]+)/);
  if (cookieMatch) {
    return cookieMatch[2];
  }
  return localStorage.getItem('NEXT_LOCALE') || 'en';
};

export const formatCurrency = (value: number): string => {
  const locale = getCurrentLocale();
  const currency = locale === 'en' ? 'USD' : 'NGN';
  const formatLocale = locale === 'en' ? 'en-US' : `${locale}-NG`;
  const convertedValue = locale === 'en' ? value : value * 1500; // 1 USD = 1500 NGN

  return new Intl.NumberFormat(formatLocale, {
    style: 'currency',
    currency: currency,
    notation: convertedValue >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(convertedValue);
};

export const formatPercentage = (value: number): string => {
  const locale = getCurrentLocale();
  const formatLocale = locale === 'en' ? 'en-US' : `${locale}-NG`;
  return new Intl.NumberFormat(formatLocale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

export const getRiskVariant = (riskLevel: RiskLevel): 'success' | 'warning' | 'error' => {
  switch (riskLevel) {
    case 'Low':
      return 'success';
    case 'Medium':
      return 'warning';
    case 'High':
      return 'error';
    default:
      return 'success';
  }
};
