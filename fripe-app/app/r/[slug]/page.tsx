import type { Metadata } from 'next';
import BookPage from '@/components/BookPage';

export const metadata: Metadata = { title: 'Réserver en ligne · Fripe' };
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BookPage slug={slug} />;
}
