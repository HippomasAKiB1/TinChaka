import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { TopNav } from '@/components/TopNav';

export const metadata: Metadata = {
  title: 'TinChaka — Dhaka Ride Pooling',
  description: 'Share a seat. Split the fare. Survive Dhaka traffic.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
        <AuthProvider>
          <TopNav />
          <div className="flex-1 flex flex-col">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
