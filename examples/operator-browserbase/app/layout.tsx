import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { PostHogProvider } from './components/PosthogProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const ppNeue = localFont({
  src: '../fonts/PPNeueMontreal-Medium.otf',
  variable: '--font-pp-neue',
});

const ppSupply = localFont({
  src: '../fonts/PPSupplySans-Regular.otf',
  variable: '--font-pp-supply',
});

export const metadata: Metadata = {
  title: 'Open Operator',
  description: 'Watch AI browse the web, for free',
  openGraph: {
    images: ['/og.png'],
    title: 'Open Operator',
    description: 'Watch AI browse the web, for free',
    url: 'https://operator.browserbase.com',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/* Fallback for browsers that don't support SVG favicons */}
        <link rel="alternate icon" href="/favicon.ico" />
      </head>
      <body
        className={`${inter.variable} ${ppNeue.variable} ${ppSupply.variable} font-sans antialiased bg-white text-gray-900`}
      >
        <PostHogProvider>{children}</PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
