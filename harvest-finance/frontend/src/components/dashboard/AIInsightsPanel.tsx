'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  Clock, 
  ChevronRight,
  ChevronLeft,
  WifiOff,
  RefreshCw,
  Leaf,
  Droplets,
  Sun,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Badge, Button, Card, CardBody } from '@/components/ui';
import { useTranslation } from 'react-i18next';
import { useOfflineData } from '@/hooks/useOfflineData';
import { db, AIRecommendation } from '@/lib/db';

interface AIInsightsPanelProps {
  isOnline?: boolean;
  maxItems?: number;
  showFilters?: boolean;
  onRecommendationClick?: (recommendation: AIRecommendation) => void;
}

const categoryIcons: Record<string, React.ElementType> = {
  crop: Leaf,
  soil: Droplets,
  weather: Sun,
  market: TrendingUp,
  general: Info,
};

const priorityColors: Record<string, string> = {
  high: 'bg-red-50 border-red-200 text-red-800',
  medium: 'bg-amber-50 border-amber-200 text-amber-800',
  low: 'bg-emerald-50 border-emerald-200 text-emerald-800',
};

const priorityIcons: Record<string, React.ElementType> = {
  high: AlertTriangle,
  medium: Info,
  low: CheckCircle2,
};

export function AIInsightsPanel({
  isOnline = true,
  maxItems = 3,
  showFilters = true,
  onRecommendationClick,
}: AIInsightsPanelProps) {
  const { t } = useTranslation();
  const { recommendations } = useOfflineData();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [displayedRecs, setDisplayedRecs] = useState<AIRecommendation[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let filtered = recommendations;
    
    if (activeFilter !== 'all') {
      filtered = recommendations.filter(rec => rec.category === activeFilter);
    }

    const sorted = [...filtered].sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const priorityDiff = (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setDisplayedRecs(showAll ? sorted : sorted.slice(0, maxItems));
  }, [recommendations, activeFilter, showAll, maxItems]);

  const categories = ['all', 'crop', 'soil', 'weather', 'market', 'general'];

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleRecClick = useCallback((rec: AIRecommendation) => {
    onRecommendationClick?.(rec);
  }, [onRecommendationClick]);

  const refreshRecommendations = useCallback(async () => {
    if (!isOnline) return;
    
    try {
      const response = await fetch('/api/v1/ai-assistant/recommend');
      if (response.ok) {
        const freshRecs: AIRecommendation[] = await response.json();
        const now = new Date().toISOString();
        const recsWithMeta = freshRecs.map(r => ({ ...r, syncedAt: now }));
        await db.aiRecommendations.bulkPut(recsWithMeta);
      }
    } catch {
      // Silently fail - user can retry later
    }
  }, [isOnline]);

  return (
    <Card variant="default" className="overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-harvest-green-50 text-harvest-green-700">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{t('dashboard.assistant_title')}</h2>
              <p className="text-xs text-gray-500">
                {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isOnline && (
              <Badge variant="warning" size="sm" isPill>
                <WifiOff className="h-3 w-3 mr-1" />
                {t('common.cached')}
              </Badge>
            )}
            {isOnline && (
              <button
                onClick={refreshRecommendations}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 touch-manipulation"
                aria-label="Refresh recommendations"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors touch-manipulation ${
                  activeFilter === cat
                    ? 'bg-harvest-green-100 text-harvest-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {displayedRecs.length === 0 ? (
          <div className="p-8 text-center">
            <Sparkles className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No recommendations available</p>
            {!isOnline && (
              <p className="text-xs text-gray-400 mt-1">Connect to get AI-powered insights</p>
            )}
          </div>
        ) : (
          displayedRecs.map((rec) => {
            const CategoryIcon = categoryIcons[rec.category] || Info;
            const PriorityIcon = priorityIcons[rec.priority] || Info;
            
            return (
              <div
                key={rec.id}
                className="p-4 active:bg-gray-50 touch-manipulation cursor-pointer"
                onClick={() => handleRecClick(rec)}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl ${priorityColors[rec.priority]}`}>
                    <CategoryIcon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">{rec.title}</h3>
                      <Badge variant="primary" size="sm" isPill className="shrink-0">
                        {rec.category}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2">{rec.description}</p>
                    
                    <div className="flex items-center gap-3 mt-2">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[rec.priority]}`}>
                        <PriorityIcon className="h-3 w-3" />
                        {rec.priority}
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(rec.createdAt)}
                      </div>
                      
                      {rec.actionable && (
                        <Badge variant="success" size="sm" isPill className="shrink-0">
                          Actionable
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {recommendations.length > maxItems && (
        <div className="p-3 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowAll(!showAll)}
            rightIcon={showAll ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          >
            {showAll ? t('common.pending_sync') : t('common.success')}
          </Button>
        </div>
      )}
    </Card>
  );
}