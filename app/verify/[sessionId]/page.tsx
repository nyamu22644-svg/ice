'use client';

import React, { use } from 'react';
import { VerificationJourney } from '@/components/verify/VerificationJourney';
import { GlobalHeader } from '@/components/navigation/GlobalHeader';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionVerifyPage({ params }: PageProps) {
  const resolvedParams = use(params);

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <GlobalHeader />
      <main>
        <VerificationJourney initialSessionId={resolvedParams.sessionId} />
      </main>
    </div>
  );
}
