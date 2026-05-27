import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { I18nInitializer } from "@/components/layout/I18nInitializer";
import { MilestoneToastContainer } from "@/components/dashboard/MilestoneToast";
import ReactToastProvider from '@/components/ui/ReactToastProvider';
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import { ServiceWorkerRegistration } from "@/components/layout/ServiceWorkerRegistration";
import { ConnectionStatus } from "@/components/layout/ConnectionStatus";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Harvest Finance - Empowering Farmers Through Blockchain',
  description:
    'A decentralized platform connecting farmers, buyers, and inspectors for transparent agricultural finance.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Harvest Finance',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Harvest Finance',
    title: 'Harvest Finance - Farm Vault Dashboard',
    description: 'Mobile-first offline dashboard for farm vault management',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2f7a42',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nInitializer />
        <ThemeProvider>
          <QueryProvider>
            <ServiceWorkerRegistration />
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            {children}
            <MilestoneToastContainer />
            <ReactToastProvider />
            <ConnectionStatus />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}