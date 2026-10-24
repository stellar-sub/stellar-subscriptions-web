import path from "node:path";
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../components/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials"],
  framework: { name: "@storybook/nextjs", options: {} },
  webpackFinal: (config) => {
    // Components talk to the chain through lib/contracts and lib/stellar. The
    // catalogue swaps in offline stand-ins so every story renders without a wallet or network.
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@/lib/contracts$": path.resolve(__dirname, "mocks/contracts.ts"),
      "@/lib/stellar$": path.resolve(__dirname, "mocks/stellar.ts"),
    };
    return config;
  },
};

export default config;
