import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  signTransaction: vi.fn(),
}));

import * as freighterApi from '@stellar/freighter-api';
import {
  connectFreighter,
  getFreighterAddress,
  getFreighterNetwork,
  signWithFreighter,
} from './freighter';

const mocked = vi.mocked(freighterApi);

describe('lib/freighter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('connectFreighter', () => {
    it('returns the address when access is granted', async () => {
      mocked.requestAccess.mockResolvedValue({ address: 'GABC123' } as never);

      await expect(connectFreighter()).resolves.toBe('GABC123');
      expect(mocked.requestAccess).toHaveBeenCalledTimes(1);
    });

    it('throws when access is declined', async () => {
      mocked.requestAccess.mockResolvedValue({ error: 'User declined access' } as never);

      await expect(connectFreighter()).rejects.toThrow('User declined access');
    });
  });

  describe('getFreighterAddress', () => {
    it('returns the address', async () => {
      mocked.getAddress.mockResolvedValue({ address: 'GXYZ789' } as never);

      await expect(getFreighterAddress()).resolves.toBe('GXYZ789');
    });

    it('throws when the address cannot be read', async () => {
      mocked.getAddress.mockResolvedValue({ error: 'No address' } as never);

      await expect(getFreighterAddress()).rejects.toThrow('No address');
    });
  });

  describe('getFreighterNetwork', () => {
    it('maps the public network passphrase', async () => {
      mocked.getNetwork.mockResolvedValue({
        networkPassphrase: 'Public Global Stellar Network ; September 2015',
      } as never);

      await expect(getFreighterNetwork()).resolves.toBe('PUBLIC');
    });

    it('maps the test network passphrase', async () => {
      mocked.getNetwork.mockResolvedValue({
        networkPassphrase: 'Test SDF Network ; September 2015',
      } as never);

      await expect(getFreighterNetwork()).resolves.toBe('TESTNET');
    });

    it('maps an unknown passphrase to null', async () => {
      mocked.getNetwork.mockResolvedValue({
        networkPassphrase: 'Some Unknown Network',
      } as never);

      await expect(getFreighterNetwork()).resolves.toBeNull();
    });
  });

  describe('signWithFreighter', () => {
    it('returns the signed transaction on success', async () => {
      mocked.signTransaction.mockResolvedValue({ signedTxXdr: 'SIGNED_XDR' } as never);

      await expect(signWithFreighter('XDR', 'PUBLIC')).resolves.toBe('SIGNED_XDR');
    });

    it('yields the nothing-was-signed message when declined', async () => {
      mocked.signTransaction.mockResolvedValue({ error: 'User declined' } as never);

      await expect(signWithFreighter('XDR', 'PUBLIC')).rejects.toThrow(
        /nothing was signed/i,
      );
    });
  });
});
