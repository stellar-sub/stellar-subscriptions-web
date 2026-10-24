/**
 * A stand-in for the Freighter browser extension. @stellar/freighter-api talks
 * to the extension by posting window messages; this answers them, so the app
 * sees an installed wallet that is either connected as `address` or not yet
 * connected. It never signs anything.
 */

import type { Page } from "@playwright/test";
import { Networks } from "@stellar/stellar-sdk";

export async function installFakeFreighter(page: Page, { address }: { address: string | null }) {
  await page.addInitScript(
    ({ address, passphrase }) => {
      (window as unknown as { freighter: boolean }).freighter = true;
      if (address) {
        try {
          localStorage.setItem("subs.wallet.connected", "1");
        } catch {
          // Storage is unavailable on about:blank; the real page still gets it.
        }
      }

      window.addEventListener("message", (event) => {
        if (event.source !== window || event.data?.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST") return;
        const reply = (payload: Record<string, unknown>) =>
          window.postMessage(
            { source: "FREIGHTER_EXTERNAL_MSG_RESPONSE", messagedId: event.data.messageId, ...payload },
            window.location.origin,
          );

        switch (event.data.type) {
          case "REQUEST_CONNECTION_STATUS":
            reply({ isConnected: true });
            break;
          case "REQUEST_ALLOWED_STATUS":
            reply({ isAllowed: Boolean(address) });
            break;
          case "REQUEST_ACCESS":
          case "REQUEST_PUBLIC_KEY":
            reply({ publicKey: address ?? "" });
            break;
          case "REQUEST_NETWORK_DETAILS":
            reply({
              networkDetails: {
                network: "TESTNET",
                networkName: "Test Net",
                networkUrl: "https://horizon-testnet.stellar.org",
                networkPassphrase: passphrase,
                sorobanRpcUrl: "https://soroban-testnet.stellar.org",
              },
            });
            break;
        }
      });
    },
    { address, passphrase: Networks.TESTNET },
  );
}
