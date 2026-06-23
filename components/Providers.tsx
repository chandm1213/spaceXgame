'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import {
  toSolanaWalletConnectors,
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
} from '@privy-io/react-auth/solana';
import bs58 from 'bs58';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import {
  DISABLED_WALLET,
  WalletContext,
  WalletState,
  BuyResult,
  SendResult,
  Asset,
  shortWallet,
} from '@/lib/wallet';
import { buildPremiumPurchaseTx, buildTransferTx } from '@/lib/purchase';
import { fetchPremium, verifyPremium } from '@/lib/premium';
import { SOLANA_CHAIN, SOLANA_RPC } from '@/lib/payment';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

// Privy's send/sign screens need their own RPC for the chain. Build it from the
// same Helius URL (http→ws for the subscription endpoint).
const SOLANA_RPC_CONFIG = {
  [SOLANA_CHAIN]: {
    rpc: createSolanaRpc(SOLANA_RPC),
    rpcSubscriptions: createSolanaRpcSubscriptions(SOLANA_RPC.replace(/^http/, 'ws')),
  },
};

// Translates Privy's hooks into our normalized WalletState (incl. premium flow).
function PrivyBridge({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const address = user?.wallet?.address ?? null;
  const connected = authenticated && !!address;

  const [premium, setPremium] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(false);

  const refreshPremium = useCallback(() => {
    if (!address) {
      setPremium(false);
      return;
    }
    setPremiumLoading(true);
    fetchPremium(address)
      .then(setPremium)
      .finally(() => setPremiumLoading(false));
  }, [address]);

  useEffect(() => {
    refreshPremium();
  }, [refreshPremium]);

  const buyPremium = useCallback(async (): Promise<BuyResult> => {
    if (!address) return { ok: false, error: 'connect your wallet first' };
    const solWallet = wallets.find((w) => w.address === address) ?? wallets[0];
    if (!solWallet) return { ok: false, error: 'no Solana wallet connected' };

    try {
      const transaction = await buildPremiumPurchaseTx(address);
      const { signature } = await signAndSendTransaction({
        transaction,
        wallet: solWallet,
        chain: SOLANA_CHAIN,
      });
      const sig = bs58.encode(signature);

      // Verify server-side, retrying while the tx confirms on-chain.
      for (let i = 0; i < 8; i++) {
        const res = await verifyPremium(address, sig);
        if (res.ok && res.premium) {
          setPremium(true);
          return { ok: true };
        }
        if (res.pending) {
          await new Promise((r) => setTimeout(r, 2500));
          continue;
        }
        return { ok: false, error: res.error || 'verification failed' };
      }
      return { ok: false, error: 'still confirming — hit refresh in a moment' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'transaction cancelled';
      return { ok: false, error: msg.slice(0, 140) };
    }
  }, [address, wallets, signAndSendTransaction]);

  const sendAsset = useCallback(
    async (args: { to: string; amount: number; asset: Asset }): Promise<SendResult> => {
      if (!address) return { ok: false, error: 'connect your wallet first' };
      const solWallet = wallets.find((w) => w.address === address) ?? wallets[0];
      if (!solWallet) return { ok: false, error: 'no Solana wallet connected' };
      if (!(args.amount > 0)) return { ok: false, error: 'enter an amount' };
      try {
        new (await import('@solana/web3.js')).PublicKey(args.to); // validate address
      } catch {
        return { ok: false, error: 'invalid recipient address' };
      }
      try {
        const transaction = await buildTransferTx({ from: address, ...args });
        const { signature } = await signAndSendTransaction({
          transaction,
          wallet: solWallet,
          chain: SOLANA_CHAIN,
        });
        return { ok: true, signature: bs58.encode(signature) };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'transaction failed';
        return { ok: false, error: msg.slice(0, 140) };
      }
    },
    [address, wallets, signAndSendTransaction]
  );

  const value = useMemo<WalletState>(
    () => ({
      enabled: true,
      ready,
      connected,
      address,
      name: address ? shortWallet(address) : '',
      login,
      logout,
      premium,
      premiumLoading,
      buyPremium,
      refreshPremium,
      sendAsset,
    }),
    [
      ready,
      connected,
      address,
      login,
      logout,
      premium,
      premiumLoading,
      buyPremium,
      refreshPremium,
      sendAsset,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // No Privy key configured → run the game with wallet features disabled.
  if (!PRIVY_APP_ID) {
    return <WalletContext.Provider value={DISABLED_WALLET}>{children}</WalletContext.Provider>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // Wallet (Phantom etc.) + social logins. Google must also be enabled
        // in the Privy dashboard (Login Methods) for it to appear.
        loginMethods: ['wallet', 'email', 'google'],
        appearance: {
          theme: 'dark',
          accentColor: '#22d3ee',
          walletChainType: 'solana-only',
          logo: undefined,
        },
        externalWallets: {
          solana: { connectors: toSolanaWalletConnectors() },
        },
        solana: {
          rpcs: SOLANA_RPC_CONFIG,
        },
        // Email/Google users have no external wallet, so give them a Solana
        // embedded wallet — that's their leaderboard identity + payment account.
        embeddedWallets: {
          solana: { createOnLogin: 'users-without-wallets' },
          ethereum: { createOnLogin: 'off' },
        },
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}
