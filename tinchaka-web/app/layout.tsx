import type { Metadata } from 'next';
import './globals.css';

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
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
