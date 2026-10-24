# Deployment

This app is a Next.js 14 site with no server-side secrets. Pages are rendered at build time and all chain data is read in the browser from Stellar RPC, so it deploys cleanly to Vercel as a standard Next.js project.

## Before you deploy

- Node 20 or newer (see `engines` in `package.json`).
- Run `npm ci`, then confirm `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass locally.

## Deploy to Vercel

1. In Vercel, choose **Add New → Project** and import the GitHub repository.
2. Leave the framework preset as **Next.js**. Keep the default build command (`next build`), output directory and install command (`npm install`, or `npm ci` if you want the lockfile enforced).
3. Under **Environment Variables**, add the variables listed below for the network you are targeting. Set them for the **Production** environment at minimum.
4. Click **Deploy**.
5. Open the deployment URL and confirm the app loads and shows the expected network in the header.

Vercel builds from the repository on every push to the production branch. Preview deployments are created for other branches automatically.

## Environment variables

Every variable is read from `process.env` and used in browser code, so every one of them uses the `NEXT_PUBLIC_` prefix. Next.js inlines these values into the JavaScript bundle at build time. **Anything prefixed `NEXT_PUBLIC_` is visible to anyone who loads the site.**

Because values are baked in at build time, changing a variable in Vercel does nothing until you **redeploy**.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_DEFAULT_NETWORK` | No | `testnet` (default) or `mainnet`. The network the app opens on before a wallet is connected. |
| `NEXT_PUBLIC_TESTNET_RPC_URL` | No | Overrides the public Stellar RPC endpoint for Testnet. |
| `NEXT_PUBLIC_MAINNET_RPC_URL` | No | Overrides the public Stellar RPC endpoint for Mainnet. |
| `NEXT_PUBLIC_TESTNET_SUBSCRIPTION_CONTRACT` | No | Testnet subscription contract ID. Defaults to the deployment recorded in the contracts repository. |
| `NEXT_PUBLIC_TESTNET_PLAN_CONTRACT` | No | Testnet plan contract ID. Same default behaviour as above. |
| `NEXT_PUBLIC_TESTNET_REGISTRY_CONTRACT` | No | Testnet registry contract ID. Same default behaviour as above. |
| `NEXT_PUBLIC_MAINNET_SUBSCRIPTION_CONTRACT` | No | Mainnet subscription contract ID. |
| `NEXT_PUBLIC_MAINNET_PLAN_CONTRACT` | No | Mainnet plan contract ID. |
| `NEXT_PUBLIC_MAINNET_REGISTRY_CONTRACT` | No | Mainnet registry contract ID. |
| `NEXT_PUBLIC_TESTNET_READ_ACCOUNT` | No | A funded Testnet account used only as the source of read-only simulations. Defaults to a built-in account. |
| `NEXT_PUBLIC_MAINNET_READ_ACCOUNT` | No | A funded Mainnet account used only as the source of read-only simulations. |
| `NEXT_PUBLIC_GITHUB_ORG` | No | GitHub organisation linked from the site footer. Defaults to `stellar-sub`. |

A complete reference with comments lives in `.env.example`. Copy it to `.env.local` for local development. `.env.local` is git-ignored.

### Never put secrets in `NEXT_PUBLIC_` variables

- Do not put API keys, private keys, seed phrases, RPC provider tokens, or any credential in a `NEXT_PUBLIC_` variable. Because they are inlined into the bundle, they are effectively published the moment the site is deployed.
- The variables above are all public values: RPC URLs, contract IDs and public account addresses. A read account is only a public `G...` address, and it is only used to simulate reads. Never supply a secret `S...` key.
- If you later add a feature that needs a credential, read it server-side (for example in a Route Handler) using a variable **without** the `NEXT_PUBLIC_` prefix, and set it in Vercel's **Environment Variables** with the sensitive option enabled.

## Pointing at Testnet or Mainnet

**Testnet** works with the defaults. Leave the variables empty to use the public RPC and the Testnet contracts recorded in the contracts repository, or set `NEXT_PUBLIC_TESTNET_*` to point at your own deployment.

**Mainnet** is not deployed yet. To enable it:

1. Deploy the subscription, plan and registry contracts to Mainnet.
2. Set **all three** `NEXT_PUBLIC_MAINNET_*_CONTRACT` variables. The app treats Mainnet as available only when all three are set. If any is missing, Mainnet is marked "(not deployed)" in the network selector and the page shows "Not deployed on this network" rather than failing.
3. Set `NEXT_PUBLIC_MAINNET_READ_ACCOUNT` to a funded Mainnet account, and optionally `NEXT_PUBLIC_MAINNET_RPC_URL`.
4. Set `NEXT_PUBLIC_DEFAULT_NETWORK=mainnet` only if Mainnet should be the default network for visitors who have not connected a wallet.
5. Redeploy.

Keep the Mainnet and Testnet variables separate. Do not reuse Testnet contract IDs for Mainnet.

## Accuracy of what the site says

The contracts enforce each subscription's cap and charge schedule. A merchant cannot charge more than the authorised cap or charge off schedule. Any copy added to the deployed site must describe this truthfully. Do not imply that a merchant can exceed the cap or charge outside the schedule.

## Verify a deployment

- The site loads without errors in the browser console.
- The network selector shows the expected network as available, and the contract IDs match the ones you set.
- On Mainnet before the contracts are configured, Mainnet is marked "(not deployed)" instead of the page breaking.
- Connecting a wallet on Testnet and viewing plans reads live data from the configured RPC.
