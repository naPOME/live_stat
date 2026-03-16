import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ThemeProvider from '@/components/ThemeProvider';
import QueryProvider from '@/components/QueryProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});
const interDisplay = Inter({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Tournyx',
  description: 'Tournament management platform for esports organizers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${interDisplay.variable}`} suppressHydrationWarning>
      <head>
        {/* Prevent theme flash: apply stored theme before paint */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('tournyx-theme');
            if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
          } catch(e) {}
        ` }} />
      </head>
      <body className="antialiased">
        <QueryProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
