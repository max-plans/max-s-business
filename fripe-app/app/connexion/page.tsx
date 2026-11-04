import type { Metadata } from 'next';
import Login from '@/components/Login';

export const metadata: Metadata = { title: 'Fripe — Connexion', robots: { index: false } };
export default function Page() { return <Login />; }
