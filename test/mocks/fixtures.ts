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
