import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#10b981',
};

export const metadata: Metadata = {
  title: 'Indian Chicken Center | Business Management',
  description:
    'Wholesale chicken distribution SaaS — manage truck trips, stock, customer orders, ledgers, expenses, and profit for Indian Chicken Center.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Indian Chicken Center',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Indian Chicken Center',
    description: 'Wholesale chicken distribution business management platform.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-[100dvh] min-h-[100dvh] antialiased">
      <head>
        {/* PWA — installable on Android Chrome via Add to Home Screen */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Indian Chicken Center" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={`${inter.className} h-[100dvh] min-h-[100dvh] bg-slate-100 text-slate-900 overflow-x-hidden`}>
        {children}
      </body>
    </html>
  );
}

