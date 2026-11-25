import { pathToFileURL } from 'url';

const REQUIRED_VARS = [
  'NEXT_PUBLIC_TESTNET_SUBSCRIPTION_CONTRACT',
  'NEXT_PUBLIC_TESTNET_PLAN_CONTRACT',
  'NEXT_PUBLIC_TESTNET_REGISTRY_CONTRACT',
  'NEXT_PUBLIC_TESTNET_READ_ACCOUNT',
] as const;

const MAINNET_CONTRACT_VARS = [
  'NEXT_PUBLIC_MAINNET_SUBSCRIPTION_CONTRACT',
  'NEXT_PUBLIC_MAINNET_PLAN_CONTRACT',
  'NEXT_PUBLIC_MAINNET_REGISTRY_CONTRACT',
] as const;

const MAINNET_READ_ACCOUNT = 'NEXT_PUBLIC_MAINNET_READ_ACCOUNT';

const VALID_NETWORKS = ['testnet', 'mainnet'] as const;

function isSet(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateEnv(env: NodeJS.ProcessEnv): string[] {
  const errors: string[] = [];

  const defaultNetwork = env.NEXT_PUBLIC_DEFAULT_NETWORK;
  if (!isSet(defaultNetwork)) {
    errors.push(
      `NEXT_PUBLIC_DEFAULT_NETWORK is required (expected one of: ${VALID_NETWORKS.join(', ')})`,
    );
  } else if (!VALID_NETWORKS.includes(defaultNetwork as (typeof VALID_NETWORKS)[number])) {
    errors.push(
      `NEXT_PUBLIC_DEFAULT_NETWORK has invalid value "${defaultNetwork}" (expected one of: ${VALID_NETWORKS.join(', ')})`,
    );
  }

  for (const name of REQUIRED_VARS) {
    if (!isSet(env[name])) {
      errors.push(`${name} is required`);
    }
  }

  const setMainnetVars = MAINNET_CONTRACT_VARS.filter((name) => isSet(env[name]));
  const anyMainnetSet = setMainnetVars.length > 0 || isSet(env[MAINNET_READ_ACCOUNT]);

  if (anyMainnetSet) {
    for (const name of MAINNET_CONTRACT_VARS) {
      if (!isSet(env[name])) {
        errors.push(
          `${name} is required when any mainnet contract variable is set (mainnet vars must be all-or-nothing)`,
        );
      }
    }
    if (!isSet(env[MAINNET_READ_ACCOUNT])) {
      errors.push(
        `${MAINNET_READ_ACCOUNT} is required when any mainnet contract variable is set (mainnet vars must be all-or-nothing)`,
      );
    }
  }

  return errors;
}

function isCliEntry(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
}

if (isCliEntry()) {
  const errors = validateEnv(process.env);
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`Missing or invalid env var: ${error}`);
    }
    process.exit(1);
  } else {
    console.log('Environment variables OK');
    process.exit(0);
  }
}