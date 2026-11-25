# Token Support

This document explains which tokens can be used when creating a plan, and how to find the contract id for a token.

## What tokens are supported?

Plans can be funded with any token that follows the **SEP-41 token interface** on Stellar. SEP-41 is the standard token interface used by Soroban smart contracts. It defines a common set of functions (such as `transfer`, `balance`, `approve`, and `allowance`) that a token contract must implement so that other contracts — including this app — can interact with it.

If a token implements SEP-41, it can be used for plans.

### Native XLM via the Stellar Asset Contract (SAC)

Native XLM (lumens) is also supported. On Soroban, native XLM is exposed through the **Stellar Asset Contract (SAC)** — a contract that wraps a Stellar asset and exposes it through the SEP-41 interface. This means you can use XLM for plans by providing the SAC contract id for native XLM on the network you are using.

The SAC contract id for native XLM is network-specific, so make sure you use the one that matches the network the app is connected to (for example, Testnet vs. Mainnet).

## Token contract id format

Token contract ids are Soroban contract ids and use the `C…` format — a string beginning with the letter `C` followed by a long sequence of characters. For example:

```
CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM
```

When entering a token contract id in the app, make sure you paste the full `C…` id exactly as shown. Contract ids are case-sensitive.

> **Note:** The token must exist on the **same network** as the app. A contract id that is valid on Testnet will not work on Mainnet (and vice versa). If you are unsure which network the app is using, check the network indicator in the app.

## How to find a token contract id

You can look up token contract ids on [Stellar Expert](https://stellar.expert):

1. Go to [stellar.expert](https://stellar.expert) and select the network you are using (e.g. Testnet or Mainnet).
2. Search for the token by its asset code (e.g. `USDC`) or issuer.
3. Open the asset's page. If the asset has a Stellar Asset Contract, the page will show the contract id in the `C…` format.
4. Copy the contract id and paste it into the token contract id field when creating a plan.

For native XLM, look up the SAC contract id for XLM on the network you are using (the XLM asset page on Stellar Expert links to its contract).

## Summary

- Any **SEP-41** token can be used for plans.
- **Native XLM** is supported via its **Stellar Asset Contract (SAC)**.
- Token contract ids use the **`C…`** format.
- The token must exist on the **same network** as the app.
- Find contract ids on **[Stellar Expert](https://stellar.expert)**.