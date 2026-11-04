'use client';

import dynamic from 'next/dynamic';

// La scène 3D (three.js) est chargée après le reste de la page, uniquement dans le navigateur.
const Hero3D = dynamic(() => import('./Hero3D'), { ssr: false, loading: () => <div className="stage" aria-hidden="true"><div className="halo" /></div> });
export default function Hero3DLazy() { return <Hero3D />; }
