'use client';

import { motion } from 'framer-motion';
import { cn } from '@/components/ui/types';

const shimmer = {
  animate: { opacity: [0.4, 1, 0.4] },
  transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const },
};

export function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn('bg-slate-200 rounded-md', className)}
      {...shimmer}
    />
  );
}

export function VaultCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg flex flex-col gap-2">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="p-3 bg-gray-50 rounded-lg flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-40" />
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

export function VaultTableRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </td>
      <td className="py-4 px-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
      <td className="py-4 px-4"><Skeleton className="h-4 w-20" /></td>
      <td className="py-4 px-4"><Skeleton className="h-6 w-14 rounded-full" /></td>
      <td className="py-4 px-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
      <td className="py-4 px-4">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

export function TransactionRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-4 px-4"><Skeleton className="h-4 w-24" /></td>
      <td className="py-4 px-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
      <td className="py-4 px-4"><Skeleton className="h-4 w-32" /></td>
      <td className="py-4 px-4"><Skeleton className="h-4 w-20" /></td>
      <td className="py-4 px-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
      <td className="py-4 px-4"><Skeleton className="h-8 w-16 rounded-lg ml-auto" /></td>
    </tr>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 flex flex-col gap-3">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-12 pb-20 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-gray-100 dark:border-white/5">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-14 w-40 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-6 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <Skeleton className="w-12 h-12 rounded-2xl" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-8 h-[450px] flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-10 rounded-lg" />)}
            </div>
          </div>
          <Skeleton className="flex-1 w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="space-y-2 flex flex-col items-end">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-32 w-full rounded-[2rem]" />
        </div>
      </div>
    </div>
  );
}

export function ModalSkeleton() {
  return (
    <div className="p-6 space-y-8 animate-pulse">
      <Skeleton className="h-[180px] w-full rounded-[2.5rem]" />
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24 rounded-2xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-[2rem]" />
      </div>
      <div className="space-y-6 rounded-[2.5rem] bg-gray-50/50 p-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-[1.5rem]" />
    </div>
  );
}
