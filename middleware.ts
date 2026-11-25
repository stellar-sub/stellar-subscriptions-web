import { NextResponse, type NextRequest } from "next/server";

/**
 * Soroban RPC origins the browser may call. Mirrors `NETWORKS` in `lib/stellar.ts`,
 * which cannot be imported here because middleware runs on the edge runtime.
 */
const RPC_ORIGINS = [
  process.env.NEXT_PUBLIC_TESTNET_RPC_URL || "https://soroban-testnet.stellar.org",
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://mainnet.sorobanrpc.com",
].map((url) => new URL(url).origin);

function contentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    // Next's hydration scripts and the theme script carry the per-request nonce.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // React renders inline style attributes (e.g. the cap progress bar).
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    // RPC calls only. Freighter talks to the page through its extension, not fetch.
    `connect-src 'self' ${RPC_ORIGINS.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);

  // Next reads the policy from the request headers to nonce its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: [{ source: "/((?!_next/static|_next/image|favicon.ico).*)" }],
};
