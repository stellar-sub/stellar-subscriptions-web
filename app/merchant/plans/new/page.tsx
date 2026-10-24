'use client';

import { useState } from 'react';
import Link from 'next/link';
import RequireWallet from '@/components/RequireWallet';
import CreatePlanForm from '@/components/CreatePlanForm';

export default function NewPlanPage() {
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null);

  return (
    <RequireWallet purpose="create a plan">
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/merchant"
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; Back to dashboard
          </Link>
        </div>

        <h1 className="mb-2 text-2xl font-bold">Create a plan</h1>
        <p className="mb-6 text-sm text-gray-600">
          Plans define a fixed amount and a fixed schedule. The contract does not
          allow charging more than the plan amount or off schedule.
        </p>

        {createdPlanId ? (
          <div className="rounded-lg border border-green-300 bg-green-50 p-6">
            <h2 className="mb-2 text-lg font-semibold text-green-800">
              Plan created
            </h2>
            <p className="mb-4 text-sm text-green-900">
              Your new plan id is{' '}
              <span className="font-mono font-semibold">{createdPlanId}</span>.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/plans/${createdPlanId}`}
                className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                Open public plan page
              </Link>
              <Link
                href="/merchant"
                className="rounded border border-green-700 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        ) : (
          <CreatePlanForm onCreated={(planId: string) => setCreatedPlanId(planId)} />
        )}
      </main>
    </RequireWallet>
  );
}