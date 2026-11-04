import type { Metadata } from 'next';
import DocPublic from '@/components/DocPublic';

export const metadata: Metadata = { title: 'Fripe — Document', robots: { index: false } };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <DocPublic token={token} />;
}
