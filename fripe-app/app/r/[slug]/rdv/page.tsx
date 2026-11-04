import type { Metadata } from 'next';
import { Suspense } from 'react';
import RdvStatus from '@/components/RdvStatus';

export const metadata: Metadata = { title: 'Mon rendez-vous · Fripe', robots: { index: false } };
export default function Page() { return <Suspense><RdvStatus /></Suspense>; }
