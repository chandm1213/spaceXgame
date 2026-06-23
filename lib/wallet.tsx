'use client';

import { createContext, useContext } from 'react';

// Normalized wallet state the rest of the game consumes.
// Nothing here imports Privy, so any component can read wallet state
// even when Privy isn't configured (the game stays fully playable).
// Outcome of a premium purchase attempt, surfaced to the UI.
export interface BuyResult {
  ok: boolean;
  error?: string;
}

export type Asset = 'SOL' | 'SPACEX';

export interface SendResult {
  ok: boolean;
  signature?: string;
  error?: string;
}

export interface WalletState {
  enabled: boolean; // is wallet login configured at all (Privy key present)
  ready: boolean; // provider finished initializing
  connected: boolean;
  address: string | null;
  name: string; // short display name for the leaderboard
  login: () => void;
  logout: () => void;

  // Premium ($SPACEX) entitlement
  premium: boolean;
  premiumLoading: boolean;
  buyPremium: () => Promise<BuyResult>;
  refreshPremium: () => void;

  // Send SOL or $SPACEX from the connected wallet.
  sendAsset: (args: { to: string; amount: number; asset: Asset }) => Promise<SendResult>;
}

export const DISABLED_WALLET: WalletState = {
  enabled: false,
  ready: true,
  connected: false,
  address: null,
  name: '',
  login: () => {},
  logout: () => {},
  premium: false,
  premiumLoading: false,
  buyPremium: async () => ({ ok: false, error: 'wallet not configured' }),
  refreshPremium: () => {},
  sendAsset: async () => ({ ok: false, error: 'wallet not configured' }),
};

export const WalletContext = createContext<WalletState>(DISABLED_WALLET);

export function useWallet() {
  return useContext(WalletContext);
}

export function shortWallet(w: string) {
  return `${w.slice(0, 4)}…${w.slice(-4)}`;
}
