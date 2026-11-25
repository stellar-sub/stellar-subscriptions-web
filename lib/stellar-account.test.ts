import { describe, it, expect, vi, afterEach } from 'vitest';
import { SorobanRpc } from '@stellar/stellar-sdk';
import { isAccountFunded, getFriendbotUrl } from './stellar-account';

describe('isAccountFunded', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when the account exists', async () => {
    vi.spyOn(SorobanRpc.Server.prototype, 'getAccount').mockResolvedValue(
      {} as never,
    );

    const result = await isAccountFunded('GABC123');

    expect(result).toBe(true);
  });

  it('returns false when the account is not found', async () => {
    vi.spyOn(SorobanRpc.Server.prototype, 'getAccount').mockRejectedValue(
      new Error('account not found'),
    );

    const result = await isAccountFunded('GABC123');

    expect(result).toBe(false);
  });

  it('re-throws unexpected errors', async () => {
    const unexpectedError = new Error('unexpected failure');
    vi.spyOn(SorobanRpc.Server.prototype, 'getAccount').mockRejectedValue(
      unexpectedError,
    );

    await expect(isAccountFunded('GABC123')).rejects.toThrow(
      'unexpected failure',
    );
  });
});

describe('getFriendbotUrl', () => {
  it('URL-encodes the address correctly', () => {
    const address = 'GABC+DEF/123';

    const url = getFriendbotUrl(address);

    expect(url).toContain(encodeURIComponent(address));
  });
});