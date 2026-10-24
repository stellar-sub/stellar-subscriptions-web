"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log for diagnostics only; never surface internals to the user.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold text-gray-900">
        Something went wrong
      </h1>
      <p className="max-w-md text-base text-gray-600">
        An unexpected error occurred. Please try again, or head back to the
        home page.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
