import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Book Your Shuttle | Vestroo',
  description: 'Book your shuttle service with Vestroo',
};

// Route group layout - should not have html/body tags
// Root layout handles html/body
// Header and Footer wrap all book/flow pages in this route group
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

