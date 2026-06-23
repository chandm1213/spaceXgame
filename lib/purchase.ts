import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getMint,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { SPACEX_MINT, PREMIUM_RECEIVER, PREMIUM_PRICE, SOLANA_RPC } from './payment';

export type Asset = 'SOL' | 'SPACEX';

// Builds an unsigned, serialized transfer transaction (SOL or $SPACEX) from
// `from` to `to` for `amount` whole units. Privy signs + sends it.
export async function buildTransferTx(args: {
  from: string;
  to: string;
  amount: number;
  asset: Asset;
}): Promise<Uint8Array> {
  const { from, to, amount, asset } = args;
  const connection = new Connection(SOLANA_RPC, 'confirmed');
  const fromPk = new PublicKey(from);
  const toPk = new PublicKey(to);

  const tx = new Transaction();
  tx.feePayer = fromPk;

  if (asset === 'SOL') {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: fromPk,
        toPubkey: toPk,
        lamports: Math.round(amount * LAMPORTS_PER_SOL),
      })
    );
  } else {
    const mint = new PublicKey(SPACEX_MINT);
    // $SPACEX is a Token-2022 mint — use that program for all token ops.
    const prog = TOKEN_2022_PROGRAM_ID;
    const mintInfo = await getMint(connection, mint, 'confirmed', prog);
    const decimals = mintInfo.decimals;
    const baseUnits = BigInt(Math.round(amount * 10 ** decimals));

    const fromAta = await getAssociatedTokenAddress(mint, fromPk, false, prog);
    const toAta = await getAssociatedTokenAddress(mint, toPk, false, prog);

    const toAtaInfo = await connection.getAccountInfo(toAta);
    if (!toAtaInfo) {
      // Create the recipient's token account if missing (sender pays rent).
      tx.add(createAssociatedTokenAccountInstruction(fromPk, toAta, toPk, mint, prog));
    }
    tx.add(
      createTransferCheckedInstruction(fromAta, mint, toAta, fromPk, baseUnits, decimals, [], prog)
    );
  }

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;

  return tx.serialize({ requireAllSignatures: false, verifySignatures: false });
}

// Premium unlock = a fixed $SPACEX transfer to the receiver wallet.
export function buildPremiumPurchaseTx(buyer: string): Promise<Uint8Array> {
  return buildTransferTx({
    from: buyer,
    to: PREMIUM_RECEIVER,
    amount: PREMIUM_PRICE,
    asset: 'SPACEX',
  });
}
