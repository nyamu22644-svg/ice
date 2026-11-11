'use client';

import React from 'react';
import { VerificationJourney } from '@/components/verify/VerificationJourney';
import { GlobalHeader } from '@/components/navigation/GlobalHeader';

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <GlobalHeader />
      <main>
        <VerificationJourney />
      </main>
    </div>
  );
}
