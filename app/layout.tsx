import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: '詐騙帳號查詢',
  description: 'Threads / IG 詐騙帳號查詢與提報',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="max-w-lg mx-auto pb-12">
          <Header />
          <main className="px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
