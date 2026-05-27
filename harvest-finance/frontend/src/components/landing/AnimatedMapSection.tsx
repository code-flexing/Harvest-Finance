"use client";
import React from "react";
import { motion } from "framer-motion";
import { Globe, TrendingUp, Users, Shield, ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";

const WorldMap = dynamic(
  () => import("@/components/ui/WorldMap/WorldMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[400px] bg-gradient-to-br from-harvest-green-50 via-white to-harvest-green-100 rounded-2xl flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-harvest-green-200 border-t-harvest-green-600 rounded-full animate-spin" />
      </div>
    ),
  }
);

const mapStats = [
  { value: "50K+", label: "Active Users", icon: Users },
  { value: "100+", label: "Countries", icon: Globe },
  { value: "$500M+", label: "Total Value Locked", icon: TrendingUp },
  { value: "24/7", label: "Operations", icon: Shield },
] as const;

const AnimatedMapSection = () => {
  return (
    <section className="relative py-20 bg-gradient-to-b from-white via-[var(--surface-muted)] to-[var(--background)] overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--brand-soft)] rounded-full blur-3xl opacity-30 animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--accent)] rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ animationDuration: "5s" }}
        />
      </div>

      <div className="content-wrap px-4 py-12 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="eyebrow">Global Reach</span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            A Thriving Global Ecosystem
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Join thousands of farmers worldwide securely growing their yields
            across multiple regions.
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {mapStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="group"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
            >
              <div className="bg-white rounded-2xl p-4 border border-[var(--border)] hover:border-[var(--brand)] hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-[var(--brand-soft)] group-hover:bg-[var(--brand)] transition-colors">
                    <stat.icon className="w-4 h-4 text-[var(--brand-strong)] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                    {stat.label}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Map container */}
        <motion.div
          className="relative h-[400px] sm:h-[500px] lg:h-[600px] rounded-3xl overflow-hidden border border-[var(--border)] shadow-xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Corner decorations */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-[var(--brand)]/30 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-[var(--brand)]/30 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-[var(--brand)]/30 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-[var(--brand)]/30 rounded-br-lg" />
          </div>

          {/* The actual map */}
          <WorldMap showMarkers animateMarkers zoomable={false} className="h-full" />

          {/* Floating info card */}
          <motion.div
            className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-auto bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-[var(--border)] shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start sm:items-center">
              <div className="text-center sm:text-left">
                <p className="text-sm text-slate-500">Real-time Activity</p>
                <p className="text-xl font-bold text-slate-900">
                  Live Transactions
                </p>
              </div>
              <div className="h-px sm:h-8 w-full sm:w-px bg-[var(--border)]" />
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
                <span className="text-sm text-slate-600">12 active now</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Legend */}
        <motion.div
          className="flex flex-wrap justify-center gap-6 mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-slate-600">Active Vaults</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-700" />
            <span className="text-sm text-slate-600">User Regions</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-300" />
            <span className="text-sm text-slate-600">Global Hubs</span>
          </div>
        </motion.div>

        {/* Learn more link */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <a
            href="#"
            className="inline-flex items-center gap-2 text-[var(--brand-strong)] hover:text-[var(--brand)] font-medium transition-colors group"
          >
            Explore our global network
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default AnimatedMapSection;