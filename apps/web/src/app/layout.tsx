import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { AuthProvider } from '@/lib/auth';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'MediaVault — Professional Media Sharing',
  description: 'Upload, organize and share high-quality photos and videos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-ink text-slate-900 dark:text-slate-100">
        <Providers>
          <AuthProvider>
            <Navbar />
            <main className="min-h-screen">{children}</main>
            <Footer />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
