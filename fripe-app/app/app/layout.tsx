import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = { title: 'Fripe — Mon espace', robots: { index: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
