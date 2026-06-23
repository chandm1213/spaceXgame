import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { SPACEX_MINT, SOLANA_RPC } from './payment';

export interface Balances {
  sol: number;
  spacex: number;
}

// Read-only — uses the public RPC + an address, no signing needed.
export async function getBalances(address: string): Promise<Balances> {
  const connection = new Connection(SOLANA_RPC, 'confirmed');
  const owner = new PublicKey(address);

  let sol = 0;
  let spacex = 0;

  try {
    const lamports = await connection.getBalance(owner);
    sol = lamports / LAMPORTS_PER_SOL;
  } catch {
    /* leave 0 */
  }

  try {
    // $SPACEX is a Token-2022 mint, so derive its ATA under that program.
    const ata = await getAssociatedTokenAddress(
      new PublicKey(SPACEX_MINT),
      owner,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    const bal = await connection.getTokenAccountBalance(ata);
    spacex = bal.value.uiAmount ?? 0;
  } catch {
    // No token account yet → 0 holdings.
  }

  return { sol, spacex };
}
