import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Trash2, RefreshCw, ChevronDown, ChevronUp, Download, X } from 'lucide-react';
import { queryHistoryService } from '@/services/queryHistory.service';
import { QueryHistory as QueryHistoryType } from '@/types/query-history';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export const QueryHistory: React.FC = () => {
  const [history, setHistory] = useState<QueryHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const result = await queryHistoryService.getHistory({
        search: searchTerm || undefined,
        limit: 50,
      });
      setHistory(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [searchTerm]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this query?')) {
      await queryHistoryService.deleteQuery(id);
      loadHistory();
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      await queryHistoryService.clearAllHistory();
      loadHistory();
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(history, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-history-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Assistant History</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review past questions and AI responses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={history.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="destructive" onClick={handleClearAll} disabled={history.length === 0}>
            Clear All
          </Button>
          <Button variant="outline" onClick={loadHistory}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search your questions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{total} total queries</span>
        <Badge variant="secondary">Last 50 shown</Badge>
      </div>

      {/* History List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
        </div>
      ) : history.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No query history yet</p>
            <p className="text-sm text-gray-400">Ask the AI Assistant something to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {history.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  <CardHeader className="cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base font-medium line-clamp-2">
                          {item.query}
                        </CardTitle>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatDate(item.createdAt)}</span>
                          {item.vaultContext && (
                            <Badge variant="outline" className="text-xs">
                              Vault: {item.vaultContext.name || 'N/A'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                        {expandedId === item.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <AnimatePresence>
                    {expandedId === item.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CardContent className="border-t pt-4">
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              AI Response:
                            </h4>
                            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                              {item.response}
                            </p>
                            {item.seasonalData && (
                              <div className="mt-3 rounded-md bg-green-50 p-3 dark:bg-green-900/20">
                                <p className="text-xs text-green-700 dark:text-green-300">
                                  🌱 Seasonal context: {JSON.stringify(item.seasonalData)}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Re-run query functionality
                                // Emit event to AI Assistant component
                                window.dispatchEvent(new CustomEvent('re-run-query', { detail: { query: item.query } }));
                              }}
                            >
                              Re-run Query
                            </Button>
                          </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default QueryHistory;
