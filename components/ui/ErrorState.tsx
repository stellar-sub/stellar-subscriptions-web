import { NotDeployedError } from "@/lib/contracts";

export function ErrorState({
  error,
  title = "Couldn't load this",
  onRetry,
}: {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}) {
  const notDeployed = error instanceof NotDeployedError;
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 border-danger/30 px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-fg">{notDeployed ? "Not available on this network" : title}</h3>
      <p className="max-w-md text-sm text-muted">{message}</p>
      {notDeployed && <p className="text-sm text-muted">Switch to Testnet to use the live deployment.</p>}
      {onRetry && !notDeployed && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-2">
          Try again
        </button>
      )}
    </div>
  );
}
