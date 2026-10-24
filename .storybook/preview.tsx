import type { Preview } from "@storybook/react";
import "../app/globals.css";
import { WalletContext, type WalletState } from "@/hooks/useWallet";

const SUBSCRIBER = "GBKAVFZ5GCZMMIV3ZKZL5USKFYT5DBBZTY4P5V5J75ANHWTX7GASETK4";

/** A subscriber connected on Testnet. Stories override fields with `parameters.wallet`. */
const connected: WalletState = {
  address: SUBSCRIBER,
  network: "testnet",
  walletNetwork: "testnet",
  installed: true,
  connecting: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
  setNetwork: () => {},
  writeCtx: (onPhase) => ({ network: "testnet", source: SUBSCRIBER, sign: async () => "", onPhase }),
};

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
  },
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Colour theme",
      defaultValue: "dark",
      toolbar: {
        icon: "mirror",
        dynamicTitle: true,
        items: [
          { value: "light", title: "Light theme" },
          { value: "dark", title: "Dark theme" },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      // The app's colours are CSS variables that `.dark` redefines, so the class
      // goes on a wrapper: each story renders in whichever theme is selected.
      const wallet: WalletState = { ...connected, ...context.parameters.wallet };
      const dark = context.globals.theme === "dark";
      return (
        <WalletContext.Provider value={wallet}>
          <div className={`min-h-screen bg-bg p-6 text-fg ${dark ? "dark" : ""}`}>
            <div className="mx-auto max-w-xl">
              <Story />
            </div>
          </div>
        </WalletContext.Provider>
      );
    },
  ],
};

export default preview;
