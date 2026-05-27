'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, X, AlertCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { cn, Button } from '@/components/ui';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    error, 
    markAsRead, 
    markAllAsRead,
    refresh 
  } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-harvest-green-600 dark:hover:text-harvest-green-400 hover:bg-harvest-green-50 dark:hover:bg-harvest-green-900/20 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-harvest-green-500 dark:focus:ring-harvest-green-400"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white font-bold items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-[#162a1a] rounded-xl shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-[rgba(141,187,85,0.15)] z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-white dark:bg-[#162a1a] border-b border-gray-100 dark:border-[rgba(141,187,85,0.12)] flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="text-xs font-normal bg-harvest-green-100 dark:bg-harvest-green-900/40 text-harvest-green-700 dark:text-harvest-green-300 px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 text-xs font-medium text-harvest-green-600 dark:text-harvest-green-400 hover:bg-harvest-green-50 dark:hover:bg-harvest-green-900/30 rounded-md transition-colors flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <Check className="w-4 h-4" />
                    Read all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="max-h-[70vh] overflow-y-auto">
              {isLoading && notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-harvest-green-500 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading your notifications...</p>
                </div>
              ) : error ? (
                <div className="p-10 text-center">
                  <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4"
                    onClick={() => refresh()}
                  >
                    Try again
                  </Button>
                </div>
              ) : notifications.length > 0 ? (
                <div className="flex flex-col">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={markAsRead}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="bg-gray-50 dark:bg-[#1a3020] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <h4 className="text-gray-900 dark:text-white font-semibold mb-1">No notifications yet</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    We'll notify you when something important happens.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-[#0f2015] border-t border-gray-100 dark:border-[rgba(141,187,85,0.12)] text-center">
                <button
                  className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-harvest-green-600 dark:hover:text-harvest-green-400 transition-colors py-1 px-4"
                >
                  View all activity
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
