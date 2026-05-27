'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  X
} from 'lucide-react';
import { Notification, NotificationType } from '@/types/notification';
import { cn } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.DEPOSIT:
      return <ArrowUpRight className="w-5 h-5 text-green-500 dark:text-green-400" />;
    case NotificationType.WITHDRAWAL:
      return <ArrowDownLeft className="w-5 h-5 text-orange-500 dark:text-orange-400" />;
    case NotificationType.REWARD:
      return <Coins className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />;
    case NotificationType.VAULT_CREATED:
      return <CheckCircle className="w-5 h-5 text-harvest-green-600 dark:text-harvest-green-400" />;
    case NotificationType.LARGE_TRANSACTION:
      return <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />;
    case NotificationType.ERROR:
      return <X className="w-5 h-5 text-red-600 dark:text-red-400" />;
    default:
      return <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />;
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onRead 
}) => {
  const icon = getNotificationIcon(notification.type);
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        "p-4 border-b border-gray-100 dark:border-[rgba(141,187,85,0.1)] last:border-0 cursor-pointer transition-colors relative",
        notification.isRead
          ? "bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-[#1a3020]/60"
          : "bg-harvest-green-50/40 dark:bg-harvest-green-900/20 border-l-4 border-l-harvest-green-500 dark:border-l-harvest-green-400 hover:bg-harvest-green-50/70 dark:hover:bg-harvest-green-900/30"
      )}
      onClick={() => !notification.isRead && onRead(notification.id)}
    >
      <div className="flex gap-4">
        <div className="shrink-0 mt-1">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h4 className={cn(
              "text-sm font-semibold truncate",
              notification.isRead
                ? "text-gray-900 dark:text-gray-100"
                : "text-harvest-green-800 dark:text-harvest-green-300"
            )}>
              {notification.title}
            </h4>
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
              {timeAgo}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>
        </div>
        {!notification.isRead && (
          <div className="w-2 h-2 bg-harvest-green-500 dark:bg-harvest-green-400 rounded-full mt-2 shrink-0" />
        )}
      </div>
    </motion.div>
  );
};
