import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
        404
      </p>
      <h1 className="text-3xl font-semibold text-gray-900">
        Page not found
      </h1>
      <p className="max-w-md text-base text-gray-600">
        We couldn&apos;t find the page you were looking for. It may have been
        moved or no longer exists.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Back to home
        </Link>
        <Link
          href="/plans"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          View plans
        </Link>
      </div>
    </main>
  );
}
