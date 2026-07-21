import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/hooks/use-theme';

export const metadata: Metadata = {
  title: 'PCnerd ID - AI PC Builder Indonesia',
  description: 'Rakit PC impian Anda dengan bantuan AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased transition-colors duration-300 dark:bg-black dark:text-gray-200 bg-gray-50 text-gray-800">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
