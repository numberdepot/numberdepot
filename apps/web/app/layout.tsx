import type { Metadata, Viewport } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import Providers from './providers';
import './globals.css';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NumberDepot — Buy & Sell Phone Numbers',
  description:
    'NumberDepot is the premier marketplace to buy, sell, park, and forward phone numbers. Find local, toll-free, and vanity numbers at the best prices.',
  keywords: [
    'phone numbers',
    'buy phone numbers',
    'sell phone numbers',
    'vanity numbers',
    'toll-free numbers',
    'number parking',
    'call forwarding',
  ],
  authors: [{ name: 'NumberDepot' }],
  robots: 'index, follow',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'NumberDepot — Buy & Sell Phone Numbers',
    description:
      'The premier marketplace for phone numbers. Buy, sell, park, and forward local, toll-free, and vanity numbers.',
    type: 'website',
    siteName: 'NumberDepot',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#002664',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sourceSans.variable}>
      <body className={sourceSans.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
