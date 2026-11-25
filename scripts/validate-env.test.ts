import { describe, expect, it } from 'vitest';
import { validateEnv } from './validate-env';

const TESTNET_VARS = {
  NEXT_PUBLIC_TESTNET_SUBSCRIPTION_CONTRACT: 'CTESTNETSUBSCRIPTION',
  NEXT_PUBLIC_TESTNET_VAULT_CONTRACT: 'CTESTNETVAULT',
  NEXT_PUBLIC_TESTNET_TOKEN_CONTRACT: 'CTESTNETTOKEN',
};

const MAINNET_VARS = {
  NEXT_PUBLIC_MAINNET_SUBSCRIPTION_CONTRACT: 'CMAINNETSUBSCRIPTION',
  NEXT_PUBLIC_MAINNET_VAULT_CONTRACT: 'CMAINNETVAULT',
  NEXT_PUBLIC_MAINNET_TOKEN_CONTRACT: 'CMAINNETTOKEN',
};

const FULL_ENV = {
  ...TESTNET_VARS,
  ...MAINNET_VARS,
  NEXT_PUBLIC_DEFAULT_NETWORK: 'testnet',
};

describe('validateEnv', () => {
  it('returns an empty array when all required vars are present', () => {
    const errors = validateEnv(FULL_ENV);
    expect(errors).toEqual([]);
  });

  it('reports a missing NEXT_PUBLIC_TESTNET_SUBSCRIPTION_CONTRACT', () => {
    const env: Record<string, string | undefined> = { ...FULL_ENV };
    delete env.NEXT_PUBLIC_TESTNET_SUBSCRIPTION_CONTRACT;

    const errors = validateEnv(env);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('NEXT_PUBLIC_TESTNET_SUBSCRIPTION_CONTRACT'))).toBe(true);
  });

  it('reports a partially configured Mainnet', () => {
    const env: Record<string, string | undefined> = {
      ...TESTNET_VARS,
      NEXT_PUBLIC_DEFAULT_NETWORK: 'testnet',
      NEXT_PUBLIC_MAINNET_SUBSCRIPTION_CONTRACT: 'CMAINNETSUBSCRIPTION',
    };

    const errors = validateEnv(env);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => /mainnet/i.test(e))).toBe(true);
  });

  it('reports an invalid NEXT_PUBLIC_DEFAULT_NETWORK', () => {
    const env: Record<string, string | undefined> = {
      ...FULL_ENV,
      NEXT_PUBLIC_DEFAULT_NETWORK: 'not-a-network',
    };

    const errors = validateEnv(env);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('NEXT_PUBLIC_DEFAULT_NETWORK'))).toBe(true);
  });
});