import { PublicKey } from '@solana/web3.js';
import { createApproveInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { neonBalanceProgramAddress } from './utils';
import { toFullAmount } from '../utils';
import { createNeonDepositToBalanceInstruction } from './neon-transfer';
import { createWrapSOLTransaction } from './mint-transfer';
export async function solanaSOLTransferTransaction(connection, solanaWallet, neonWallet, neonEvmProgram, neonTokenMint, token, amount, chainId = 111) {
    const [balanceAddress] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
    const fullAmount = toFullAmount(amount, token.decimals);
    const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(token.address_spl), solanaWallet);
    const transaction = await createWrapSOLTransaction(connection, solanaWallet, amount, token);
    transaction.add(createApproveInstruction(associatedTokenAddress, balanceAddress, solanaWallet, fullAmount));
    transaction.add(createNeonDepositToBalanceInstruction(chainId, solanaWallet, associatedTokenAddress, neonWallet, neonEvmProgram, neonTokenMint));
    return transaction;
}
//# sourceMappingURL=multy-transfer.js.map