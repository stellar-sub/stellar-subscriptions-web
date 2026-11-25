// Issues #208, #209, #210, #211 - Wallet Context Features

import { useEffect, useState, useCallback } from 'react';

// ============================================================================
// Issue #208: WalletProvider auto-clear accountSwitched
// ============================================================================

interface WalletContextType {
  accountSwitched: boolean;
  clearAccountSwitchWarning: () => void;
}

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accountSwitched, setAccountSwitched] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const clearAccountSwitchWarning = useCallback(() => {
    setAccountSwitched(false);
  }, []);

  // FIX: Auto-clear after 5 seconds
  useEffect(() => {
    if (accountSwitched) {
      const timer = setTimeout(() => {
        clearAccountSwitchWarning();
      }, 5000);

      setTimeoutId(timer);

      return () => clearTimeout(timer);
    }
  }, [accountSwitched, clearAccountSwitchWarning]);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  return (
    <WalletContext.Provider value={{ accountSwitched, clearAccountSwitchWarning }}>
      {children}
    </WalletContext.Provider>
  );
};

// ============================================================================
// Issue #209: NetworkSelector disable mainnet when not deployed
// ============================================================================

import { contractsFor } from '@/lib/contracts';

interface NetworkSelectorProps {
  selectedNetwork: string;
  onChange: (network: string) => void;
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({ selectedNetwork, onChange }) => {
  const [mainnetDeployed, setMainnetDeployed] = useState(true);

  // FIX: Check if mainnet contracts exist
  useEffect(() => {
    const mainnetContracts = contractsFor('mainnet');
    setMainnetDeployed(mainnetContracts !== null);
  }, []);

  return (
    <select
      value={selectedNetwork}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-3 py-2"
    >
      <option value="testnet">Testnet</option>

      <option
        value="mainnet"
        disabled={!mainnetDeployed}
        title={!mainnetDeployed ? "Mainnet deployment not configured" : ""}
      >
        Mainnet {!mainnetDeployed && "(Not Configured)"}
      </option>
    </select>
  );
};

// ============================================================================
// Issue #210: RequireWallet show network mismatch error
// ============================================================================

interface RequireWalletProps {
  children: React.ReactNode;
  requiredNetwork?: string;
}

export const RequireWallet: React.FC<RequireWalletProps> = ({
  children,
  requiredNetwork = 'testnet'
}) => {
  const { address, walletNetwork } = useWallet();

  // FIX: Distinguish between no wallet and network mismatch
  if (!address) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <p>Please connect your wallet to continue</p>
      </div>
    );
  }

  // FIX: Check for network mismatch
  if (walletNetwork && walletNetwork !== requiredNetwork) {
    return (
      <div className="p-4 bg-orange-50 border border-orange-200 rounded">
        <p className="font-semibold">Network Mismatch</p>
        <p>Switch Freighter to {requiredNetwork.charAt(0).toUpperCase() + requiredNetwork.slice(1)} to continue</p>
        <p className="text-sm text-gray-600 mt-2">
          Connected: {walletNetwork} | Required: {requiredNetwork}
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

// ============================================================================
// Issue #211: useLedger expose loading state
// ============================================================================

interface Ledger {
  sequence: number;
  timestamp: number;
}

interface UseLedgerReturn {
  ledger: Ledger | null;
  loading: boolean;  // FIX: Add loading state
  error: Error | null;
}

export const useLedger = (): UseLedgerReturn => {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);  // FIX: Start as true
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLedger = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/ledger');
        const data = await response.json();

        if (isMounted) {
          setLedger(data);
          setLoading(false);  // Clear loading after first success
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setLoading(false);
        }
      }
    };

    fetchLedger();
    const interval = setInterval(fetchLedger, 10000);  // Poll every 10s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { ledger, loading, error };
};

// Usage example
export const CountdownTimer: React.FC = () => {
  const { ledger, loading } = useLedger();

  if (loading) {
    return <div className="bg-gray-200 h-6 w-20 rounded animate-pulse" />;  // Skeleton
  }

  if (!ledger) {
    return <div>Unable to load ledger</div>;
  }

  const countdownSeconds = Math.max(0, 60 - (Date.now() - ledger.timestamp * 1000) / 1000);

  return <div>{countdownSeconds.toFixed(0)}s</div>;
};
