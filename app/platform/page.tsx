'use client';

import React from 'react';
import { GlobalHeader } from '@/components/navigation/GlobalHeader';
import { PlatformConsole } from '@/components/platform/PlatformConsole';

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <GlobalHeader />
      <main>
        <PlatformConsole />
      </main>
    </div>
  );
}
