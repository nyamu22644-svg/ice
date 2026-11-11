import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ICE — Independent Identity Verification Platform',
  description: 'Enterprise-grade identity verification, document intelligence, biometric verification, and explainable risk analysis.',
  openGraph: {
    title: 'ICE — Independent Identity Verification Platform',
    description: 'Enterprise-grade identity verification, document intelligence, biometric verification, and explainable risk analysis.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ICE — Independent Identity Verification Platform',
    description: 'Enterprise-grade identity verification, document intelligence, biometric verification, and explainable risk analysis.',
  },
};

import { ThemeProvider } from '@/lib/theme/ThemeContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('ice_theme_preference');
                var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (stored === 'dark' || (!stored && systemDark) || (stored === 'system' && systemDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#F4F7FA] dark:bg-[#0B131E] text-[#101C2C] dark:text-[#F4F7FA] antialiased" suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
