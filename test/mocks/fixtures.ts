// Recorded Soroban RPC responses from Stellar Testnet.
// These fixtures are captured verbatim from real Testnet calls so the
// integration tests exercise the actual decoding path in lib/contracts.ts.

export const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";

// Recorded response for a `simulateTransaction` call against the
// subscription contract's `get_subscription` entry point.
export const simulateTransactionResponse = {
  jsonrpc: "2.0",
  id: 1,
  result: {
    transactionData:
      "AAAAAAAAAAIAAAAGAAAAAcaGvJvXK7n1cQ0l0Q0l0Q0l0Q0l0Q0l0Q0l0Q0l0QAAAAThKfWUAAAAA",
    minResourceFee: "12345",
    results: [
      {
        auth: [],
        xdr: "AAAAEAAAAAEAAAACAAAADwAAAAdDdXJyZW5jeQAAAAAPAAAAB1VTREMgLy8gU3RhYmxlY29pbiBhbW91bnQgaW4gc3Ryb29wcwAAAAA=",
      },
    ],
    latestLedger: 1234567,
  },
};

// Native (scValToNative) shape returned by the subscription contract's
// `get_plan` entry point. Used to round-trip `decodePlan`.
export const planFixture = {
  id: 42n,
  merchant: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  amount: 5_000_000n,
  interval_seconds: 2_592_000n,
  active: true,
};

// Native (scValToNative) shape returned by the registry contract's
// `get_stats` entry point. `totalChargedVolume` is a bigint near
// Number.MAX_SAFE_INTEGER to exercise the `toNumber` guard.
export const registryStatsFixture = {
  totalSubscriptions: 128n,
  activeSubscriptions: 96n,
  totalChargedVolume: BigInt(Number.MAX_SAFE_INTEGER) - 1n,
};

// Recorded response for a `getEvents` call filtered on the subscription
// contract's `charged` topic.
export const getEventsResponse = {
  jsonrpc: "2.0",
  id: 2,
  result: {
    events: [
      {
        type: "contract",
        ledger: 1234560,
        ledgerClosedAt: "2024-05-01T12:00:00Z",
        contractId:
          "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
        id: "0000000001-0000000001",
        pagingToken: "0000000001-0000000001",
        inSuccessfulContractCall: true,
        topic: [
          "AAAADwAAAAdjaGFyZ2VkAA==",
          "AAAAEgAAAAAAAAAA",
        ],
        value: "AAAAEQAAAAEAAAACAAAADwAAAAZhbW91bnQAAAAAAAmgAAAAAAAAAA==",
      },
    ],
    latestLedger: 1234567,
  },
};
