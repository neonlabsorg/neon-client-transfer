import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createApproveInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { neonBalanceProgramAddress, toFullAmount } from './utils';
import { createNeonDepositToBalanceInstruction } from './neon-transfer';
import { createWrapSOLTransaction } from './mint-transfer';
import { SolanaSOLTransferTransactionParams } from './models';

export async function solanaSOLTransferTransaction({
  connection,
  solanaWallet,
  neonWallet,
  neonEvmProgram,
  neonTokenMint,
  splToken,
  amount,
  chainId = 111
}: SolanaSOLTransferTransactionParams): Promise<Transaction> {
  const [balanceAddress] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
  const fullAmount = toFullAmount(amount, splToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
  const transaction = await createWrapSOLTransaction({ connection, solanaWallet, amount, splToken });

  transaction.add(createApproveInstruction(associatedTokenAddress, balanceAddress, solanaWallet, fullAmount));
  transaction.add(createNeonDepositToBalanceInstruction({ chainId, solanaWallet, tokenAddress: associatedTokenAddress, neonWallet, neonEvmProgram, tokenMint: neonTokenMint }));

  return transaction;
}
