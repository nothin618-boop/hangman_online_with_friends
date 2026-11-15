'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const CyberRescueGame = dynamic(
  () =>
    import('@/components/cyber_rescue/CyberRescueGame').then(
      (mod) => mod.CyberRescueGame
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-200 font-sans gap-3 select-none">
        <span className="text-4xl animate-bounce">🪂</span>
        <span className="text-sm font-bold tracking-wider text-cyan-300">
          PREPARING STICKMAN RESCUE...
        </span>
      </div>
    ),
  }
);

export default function HomePage() {
  return <CyberRescueGame />;
}
