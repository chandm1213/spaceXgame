// Shared payment config. Addresses are public on-chain data, so NEXT_PUBLIC_ is fine.
// Override any of these via env without touching code.

// $SPACEX SPL token mint (the Pump.fun contract address).
export const SPACEX_MINT =
  process.env.NEXT_PUBLIC_SPACEX_MINT || '52eGV9S6kTUroTXJ1xgbHpcYBm7CNSeoy9XNomCApump';

// Wallet that receives premium payments.
export const PREMIUM_RECEIVER =
  process.env.NEXT_PUBLIC_PREMIUM_RECEIVER || '94q7mtD4QFDvvkksjKHowzQWUZPgCDs2BFbgwsD9ieAL';

// Price of the premium unlock, in whole $SPACEX tokens (UI units, not base units).
export const PREMIUM_PRICE = Number(process.env.NEXT_PUBLIC_PREMIUM_PRICE || '350000');

// RPC endpoint. Public mainnet works but is rate-limited — set a Helius/QuickNode
// URL for production reliability.
export const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export const SOLANA_CHAIN = 'solana:mainnet' as const;
