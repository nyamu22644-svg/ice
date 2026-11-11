'use client';

import React from 'react';
import { GlobalHeader } from '@/components/navigation/GlobalHeader';
import { DeveloperPortal } from '@/components/developers/DeveloperPortal';

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <GlobalHeader />
      <main>
        <DeveloperPortal />
      </main>
    </div>
  );
}
