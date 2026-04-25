import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: '可疑帳號回報',
  description: 'Threads / IG 可疑帳號使用者回報平台',
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
          <Footer />
        </div>
      </body>
    </html>
  );
}
