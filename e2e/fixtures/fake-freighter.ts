/**
 * Fake Freighter wallet for Playwright end-to-end tests.
 *
 * Real wallet signing cannot run in CI, so this module installs a stubbed
 * `window.freighter` / `window.freighterApi` that mimics the parts of the
 * Freighter API the app relies on. It is reusable across specs: import the
 * helpers and call them from `page.addInitScript` (or `page.evaluate`) before
 * the app boots.
 *
 * Usage:
 *
 *   import { installFakeFreighter } from './fixtures/fake-freighter';
 *
 *   test.beforeEach(async ({ page }) => {
 *     await installFakeFreighter(page, { publicKey: 'G...' });
 *   });
 *
 * The fake never signs anything for real: `signTransaction` returns a
 * deterministic placeholder XDR so the UI can proceed through the flow.
 */

export interface FakeFreighterOptions {
  /** Stellar public key the fake wallet reports as connected. */
  publicKey?: string;
  /** Network passphrase reported by the fake wallet. */
  networkPassphrase?: string;
  /** Whether the wallet starts already connected/allowed. */
  isConnected?: boolean;
  /** Value returned by `signTransaction`; defaults to a placeholder XDR. */
  signedXdr?: string;
}

export const DEFAULT_PUBLIC_KEY =
  'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

export const DEFAULT_NETWORK_PASSPHRASE =
  'Test SDF Network ; September 2015';

export const DEFAULT_SIGNED_XDR = 'AAAAAgAAAABmYWtlLXNpZ25lZC14ZHIA';

/**
 * Serialisable description of the fake wallet. Kept as plain data so it can be
 * passed into `page.addInitScript` without closing over Node-only values.
 */
export interface FakeFreighterConfig {
  publicKey: string;
  networkPassphrase: string;
  isConnected: boolean;
  signedXdr: string;
}

export function resolveConfig(
  options: FakeFreighterOptions = {},
): FakeFreighterConfig {
  return {
    publicKey: options.publicKey ?? DEFAULT_PUBLIC_KEY,
    networkPassphrase: options.networkPassphrase ?? DEFAULT_NETWORK_PASSPHRASE,
    isConnected: options.isConnected ?? true,
    signedXdr: options.signedXdr ?? DEFAULT_SIGNED_XDR,
  };
}

/**
 * Installs the fake wallet on the given page before any app script runs.
 * Call this in `beforeEach` so every navigation sees the stub.
 */
export async function installFakeFreighter(
  page: { addInitScript: (fn: (config: FakeFreighterConfig) => void, arg: FakeFreighterConfig) => Promise<unknown> },
  options: FakeFreighterOptions = {},
): Promise<void> {
  const config = resolveConfig(options);
  await page.addInitScript(installFakeFreighterInPage, config);
}

/**
 * The in-page installer. This function is serialised by Playwright and runs in
 * the browser context, so it must be self-contained (no imports/closures).
 */
export function installFakeFreighterInPage(config: FakeFreighterConfig): void {
  const win = window as unknown as Record<string, unknown>;

  const api = {
    isConnected: () => Promise.resolve(config.isConnected),
    isAllowed: () => Promise.resolve(config.isConnected),
    getPublicKey: () =>
      config.isConnected
        ? Promise.resolve(config.publicKey)
        : Promise.reject(new Error('Freighter is not connected')),
    getNetwork: () => Promise.resolve('TESTNET'),
    getNetworkDetails: () =>
      Promise.resolve({
        network: 'TESTNET',
        networkUrl: 'https://horizon-testnet.stellar.org',
        networkPassphrase: config.networkPassphrase,
        sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
      }),
    requestAccess: () => {
      config.isConnected = true;
      return Promise.resolve(config.publicKey);
    },
    signTransaction: (xdr: string) =>
      Promise.resolve({ signedTxXdr: config.signedXdr || xdr, signerAddress: config.publicKey }),
    signAuthEntry: (entry: string) =>
      Promise.resolve({ signedAuthEntry: entry, signerAddress: config.publicKey }),
    signMessage: (message: string) =>
      Promise.resolve({ signedMessage: message, signerAddress: config.publicKey }),
  };

  win.freighter = api;
  win.freighterApi = api;
}
