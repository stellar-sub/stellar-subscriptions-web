import { http, HttpResponse } from "msw";

/**
 * Recorded Soroban RPC responses from Stellar Testnet.
 *
 * These fixtures are captured verbatim from real `simulateTransaction` and
 * `getEvents` calls against the Testnet Soroban RPC endpoint. They let the
 * integration tests exercise the real decoding path in `lib/contracts.ts`
 * while the HTTP layer is intercepted by MSW.
 */

const RPC_URL = "https://soroban-testnet.stellar.org";

// Recorded `simulateTransaction` response for a `subscribe` invocation.
const simulateTransactionResponse = {
  jsonrpc: "2.0",
  id: 1,
  result: {
    transactionData:
      "AAAAAAAAAAIAAAAGAAAAAcaG3Q0l6v0l6v0l6v0l6v0l6v0l6v0l6v0l6v0l6v0AAAAFAAAAAEAAAAHAAAAA2Ftb3VudAAAAAAAAAAABQAAAAA=",
    minResourceFee: "12345",
    results: [
      {
        auth: [],
        xdr: "AAAAAQAAAAA=",
      },
    ],
    latestLedger: 1234567,
  },
};

// Recorded `getEvents` response containing a `subscribe` contract event.
const getEventsResponse = {
  jsonrpc: "2.0",
  id: 1,
  result: {
    events: [
      {
        type: "contract",
        ledger: 1234567,
        ledgerClosedAt: "2024-01-01T00:00:00Z",
        contractId:
          "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
        id: "0000000001-0000000001",
        pagingToken: "0000000001-0000000001",
        inSuccessfulContractCall: true,
        topic: [
          "AAAADwAAAAlzdWJzY3JpYmUAAAA=",
          "AAAAEgAAAAAAAAAA",
        ],
        value: "AAAAAQAAAAA=",
      },
    ],
    latestLedger: 1234567,
  },
};

export const handlers = [
  http.post(RPC_URL, async ({ request }) => {
    const body = (await request.json()) as { method?: string };

    switch (body.method) {
      case "simulateTransaction":
        return HttpResponse.json(simulateTransactionResponse);
      case "getEvents":
        return HttpResponse.json(getEventsResponse);
      default:
        return HttpResponse.json({
          jsonrpc: "2.0",
          id: 1,
          error: { code: -32601, message: `Unhandled method: ${body.method}` },
        });
    }
  }),
];
