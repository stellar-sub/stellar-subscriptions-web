import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";

import { sorobanHandlers } from "../test/mocks/sorobanHandlers";
import { TESTNET_RPC_URL } from "../test/mocks/sorobanFixtures";

const server = setupServer(...sorobanHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("lib/contracts decoding over mocked Soroban RPC", () => {
  it("decodes a simulateTransaction response through the HTTP layer", async () => {
    const response = await fetch(TESTNET_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "simulateTransaction",
        params: { transaction: "placeholder" },
      }),
    });

    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.result.latestLedger).toBe(1234567);
    expect(json.result.minResourceFee).toBe("12345");
    expect(json.result.results).toHaveLength(1);
  });

  it("decodes a getEvents response through the HTTP layer", async () => {
    const response = await fetch(TESTNET_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "getEvents",
        params: { startLedger: 1234500 },
      }),
    });

    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.result.events).toHaveLength(1);
    expect(json.result.events[0].type).toBe("contract");
    expect(json.result.events[0].inSuccessfulContractCall).toBe(true);
  });
});
