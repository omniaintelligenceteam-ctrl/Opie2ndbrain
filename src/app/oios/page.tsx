'use client';

import OIOSCommandCenter from '@/components/OIOSCommandCenter';

export default function OIOSPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          OIOS Command Center
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Real-time agent orchestration overview
        </p>
        <OIOSCommandCenter />
      </div>
    </div>
  );
}
