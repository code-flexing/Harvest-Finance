"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/ui";

// Dynamically import WorldMap to avoid SSR issues
const WorldMap = dynamic(() => import("@/components/ui/WorldMap/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] bg-gradient-to-br from-harvest-green-50 via-white to-harvest-green-100 rounded-2xl flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-harvest-green-200 border-t-harvest-green-600 rounded-full animate-spin" />
    </div>
  ),
});

const fundingMetrics = [
  {
    label: "Active financing requests",
    value: "128",
    change: "+12% this week",
  },
  {
    label: "Verified deliveries",
    value: "342",
    change: "Up from 301 last week",
  },
  {
    label: "Settlement completion",
    value: "96%",
    change: "Stable across all regions",
  },
];

const monthlyVolumes = [
  { month: "Jan", height: "h-20" },
  { month: "Feb", height: "h-28" },
  { month: "Mar", height: "h-24" },
  { month: "Apr", height: "h-36" },
  { month: "May", height: "h-32" },
  { month: "Jun", height: "h-40" },
];

const workflowSteps = [
  {
    title: "Intake and verification",
    description:
      "Orders, farm records, and inspector tasks share one spacing system and one visual language.",
  },
  {
    title: "Responsive review surfaces",
    description:
      "Cards stack cleanly on mobile and expand into structured analytics panels on larger screens.",
  },
  {
    title: "Consistent actions",
    description:
      "Buttons, inputs, and navigation links now follow a predictable hierarchy across the frontend.",
  },
];

const farmerFeatures = [
  {
    title: "Smart Machinery",
    description:
      "AI-powered equipment monitoring and predictive maintenance for your farm operations.",
    stat: "40%",
    statLabel: "Efficiency Gain",
  },
  {
    title: "Crop Intelligence",
    description:
      "Real-time analytics on soil health, weather patterns, and yield predictions.",
    stat: "85%",
    statLabel: "Accuracy",
  },
  {
    title: "Logistics Network",
    description:
      "Connected supply chain with transparent pricing and efficient delivery routes.",
    stat: "60%",
    statLabel: "Cost Savings",
  },
  {
    title: "Storage Solutions",
    description:
      "Secure grain storage with IoT monitoring and quality preservation technology.",
    stat: "99%",
    statLabel: "Quality Rate",
  },
];

const mapStats = [
  { value: "50K+", label: "Active Users" },
  { value: "100+", label: "Countries" },
  { value: "$500M+", label: "Total Value Locked" },
  { value: "24/7", label: "Operations" },
];

const footerLinks = {
  platform: [
    { label: "landing.footer.features", href: "#features" },
    { label: "landing.footer.smart_vaults", href: "/vaults" },
    { label: "landing.footer.staking", href: "/staking" },
    { label: "landing.footer.rewards", href: "/rewards" },
  ],
  resources: [
    { label: "landing.footer.documentation", href: "#" },
    { label: "landing.footer.security_audits", href: "#" },
    { label: "landing.footer.whitepaper", href: "#" },
    { label: "landing.footer.help_center", href: "#" },
  ],
  company: [
    { label: "landing.footer.about_us", href: "#" },
    { label: "landing.footer.careers", href: "#" },
    { label: "landing.footer.blog", href: "#" },
    { label: "landing.footer.contact", href: "#" },
  ],
};

const socialLinks = [
  {
    name: "Twitter",
    href: "https://twitter.com",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    href: "https://github.com",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
];

export default function Home() {
  const { t } = useTranslation();
  return (
    <div className="page-shell">
      <div className="content-wrap">
        <header className="top-nav">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--brand-strong)]">
              Harvest Finance
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
              {t('landing.header_subtitle')}
            </p>
          </div>

          <nav className="nav-links">
            <a href="#overview" className="nav-link">
              {t('landing.nav_overview')}
            </a>
            <a href="#analytics" className="nav-link">
              {t('landing.nav_analytics')}
            </a>
            <a href="#workflow" className="nav-link">
              {t('landing.nav_workflow')}
            </a>
            <LanguageSwitcher />
            <ThemeToggle />
            <Link href="/login" className="btn-secondary">
              {t('landing.signin')}
            </Link>
            <Link href="/signup" className="btn-primary sm:w-auto">
              {t('landing.get_started')}
            </Link>
          </nav>
        </header>

        <main className="space-y-6">
          {/* Hero Section */}
          <motion.section
            className="surface-card px-6 py-8 sm:px-8 sm:py-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="hero-grid items-start">
              <div>
                <span className="eyebrow">{t('landing.eyebrow')}</span>
                <h1 className="headline mt-5">
                  {t('landing.hero_title')}
                </h1>
                <p className="support-text mt-5 max-w-2xl">
                  {t('landing.hero_subtitle')}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/signup" className="btn-primary sm:w-auto">
                    {t('landing.get_started')}
                  </Link>
                  <Link href="/forgot-password" className="btn-secondary">
                    {t('landing.signin')}
                  </Link>
                </div>
              </div>

              <motion.div
                className="section-card"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
                      Funding pipeline
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                      $1.8M
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-sm font-semibold text-[var(--brand-strong)]">
                    +18.4%
                  </span>
                </div>

                <div className="mt-6 chart-row">
                  {monthlyVolumes.map((item) => (
                    <div
                      key={item.month}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <motion.div
                        className={`chart-bar w-full max-w-12 ${item.height}`}
                      />
                      <span className="text-xs text-slate-500 dark:text-gray-500">
                        {item.month}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.section>

          {/* Overview Metrics */}
          <section id="overview" className="grid gap-4 lg:grid-cols-3">
            {fundingMetrics.map((metric, index) => (
              <motion.article
                key={metric.label}
                className="metric-card cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
              >
                <p className="text-sm text-slate-500 dark:text-gray-400">
                  {metric.label}
                </p>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm text-[var(--brand-strong)]">
                  {metric.change}
                </p>
              </motion.article>
            ))}
          </section>

          {/* Analytics Section */}
          <motion.section
            id="analytics"
            className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <article className="section-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="eyebrow">{t('landing.analytics_title')}</span>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    {t('landing.analytics_title')}
                  </h2>
                </div>
                <p className="max-w-sm text-sm leading-6 text-slate-600 dark:text-gray-300">
                  {t('landing.analytics_subtitle')}
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {[
                  { label: "Average loan ticket", value: "$14,200" },
                  { label: "Inspector response time", value: "2h 15m" },
                  { label: "Payout accuracy", value: "99.2%" },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    className="rounded-[24px] bg-[#f7faf4] dark:bg-[#1a3020] p-5 hover:shadow-lg transition-shadow duration-300"
                    whileHover={{ scale: 1.02 }}
                  >
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                      {item.label}
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                      {item.value}
                    </p>
                  </motion.div>
                ))}
              </div>
            </article>

            <aside className="section-card">
              <span className="eyebrow">{t('landing.nav_workflow')}</span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {t('landing.nav_workflow')}
              </h2>
              <div className="mt-6 space-y-4">
                {[
                  {
                    title: "Primary CTA",
                    desc: "High-contrast green buttons reserved for the next key step.",
                  },
                  {
                    title: "Secondary actions",
                    desc: "Neutral surfaces reduce noise while keeping links and actions easy to spot.",
                  },
                  {
                    title: "Form controls",
                    desc: "Inputs share identical height, radius, focus state, and spacing rules.",
                  },
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    className="rounded-[22px] border border-[rgba(47,122,66,0.12)] dark:border-gray-700 p-4 hover:border-[var(--brand)] hover:shadow-md transition-all duration-300 cursor-pointer"
                    whileHover={{ scale: 1.01 }}
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-gray-100">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
                      {item.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </aside>
          </motion.section>

          {/* Farmer Collective Section - Updated */}
          <motion.section
            className="py-16 bg-gradient-to-b from-white to-[var(--surface-muted)] dark:from-[#0f2015] dark:to-[#0d1f12] rounded-3xl"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center max-w-3xl mx-auto mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <span className="eyebrow">{t('landing.workflow.title')}</span>
                <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {t('landing.features_title')}
                </h2>
                <p className="mt-4 text-lg text-slate-600 dark:text-gray-300">
                  {t('landing.features_subtitle')}
                </p>
              </motion.div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {farmerFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    className="group bg-white dark:bg-[#162a1a] rounded-2xl p-5 border border-[var(--border)] hover:border-[var(--brand)] hover:shadow-lg transition-all duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -4 }}
                  >
                    <div className="relative h-40 w-full mb-4 overflow-hidden rounded-xl">
                      <img
                        src={`/images/farmer${index + 1}.jpg`}
                        alt={feature.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white p-2 text-xs font-semibold">
                        {feature.title}
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-gray-300 mb-4">
                      {feature.description}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[var(--brand-strong)]">
                        {feature.stat}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-gray-400">
                        {feature.statLabel}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* World Map */}
          <section className="py-16">
            <WorldMap />
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {mapStats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-slate-950 dark:text-gray-100">
                    {stat.value}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-gray-400">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-200 dark:border-[rgba(141,187,85,0.15)] pt-8 pb-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">{t('landing.footer.platform')}</p>
              <ul className="mt-3 space-y-2">
                {footerLinks.platform.map((link) => (
                  <li key={link.label}><Link href={link.href} className="text-sm text-slate-500 dark:text-gray-400 hover:text-[var(--brand-strong)]">{t(link.label)}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">{t('landing.footer.resources')}</p>
              <ul className="mt-3 space-y-2">
                {footerLinks.resources.map((link) => (
                  <li key={link.label}><Link href={link.href} className="text-sm text-slate-500 dark:text-gray-400 hover:text-[var(--brand-strong)]">{t(link.label)}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">{t('landing.footer.company')}</p>
              <ul className="mt-3 space-y-2">
                {footerLinks.company.map((link) => (
                  <li key={link.label}><Link href={link.href} className="text-sm text-slate-500 dark:text-gray-400 hover:text-[var(--brand-strong)]">{t(link.label)}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">{t('landing.footer.follow_us')}</p>
              <div className="mt-3 flex space-x-4">
                {socialLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-slate-500 dark:text-gray-400 hover:text-[var(--brand-strong)]"
                  >
                    {link.icon}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
