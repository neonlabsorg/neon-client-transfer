import InstructionService from "./InstructionService";
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js'
import { NEON_EVM_LOADER_ID, NEON_TOKEN_DECIMALS, NEON_TOKEN_MINT } from "../constants"
import { AcceptedToken, EthereumTransactionParams } from "./types";

class NeonPortal extends InstructionService {
  private async createApproveDepositInstruction(amount: number): Promise<TransactionInstruction> {
    const solanaPubkey = this.getSolanaPubkey()
    const source = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      new PublicKey(NEON_TOKEN_MINT),
      solanaPubkey
    )
    const [authority] = await this.getAuthorityPoolAddress()

    const instruction = Token.createApproveInstruction(
      TOKEN_PROGRAM_ID,
      source,
      authority,
      solanaPubkey,
      [],
      Number(amount) * Math.pow(10, NEON_TOKEN_DECIMALS),
    )

    return instruction
  }

  async createNeonTransfer(amount: number): Promise<void> {
    if (typeof this.events.onBeforeCreateInstruction === 'function') this.events.onBeforeCreateInstruction()
    const { blockhash } = await this.connection.getRecentBlockhash()
    const solanaKey = this.getSolanaWalletPubkey()
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: solanaKey
    })

    const neonAccount = await this.getNeonAccount()
    if (!neonAccount) {
      const neonAccountInstruction = await this._createNeonAccountInstruction()
      transaction.add(neonAccountInstruction)
      if (typeof this.events.onCreateNeonAccountInstruction === 'function') this.events.onCreateNeonAccountInstruction()
    }

    const approveInstruction = await this.createApproveDepositInstruction(amount)
    transaction.add(approveInstruction)

    const solanaPubkey = this.getSolanaWalletPubkey()
    const source = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      new PublicKey(NEON_TOKEN_MINT),
      solanaPubkey
    )
    const [authority] = await this.getAuthorityPoolAddress()
    const pool = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      new PublicKey(NEON_TOKEN_MINT),
      authority,
      true
    )
    const {neonAddress} = await this.getNeonAccountAddress()

    const keys = [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: neonAddress, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]

    const depositInstruction = new TransactionInstruction({
      programId: new PublicKey(NEON_EVM_LOADER_ID),
      data: Buffer.from([Number.parseInt('0x19', 16)]),
      keys
    })
    transaction.add(depositInstruction)

    if (typeof this.events.onBeforeSignTransaction === 'function') this.events.onBeforeSignTransaction()

    setTimeout(async () => {
      try {
        if (this.solanaProvider === undefined) throw Error
        const signedTransaction = await this.solanaProvider.signTransaction(transaction)
        const sig = await this.connection.sendRawTransaction(signedTransaction.serialize())
        if (typeof this.events.onSuccessSign === 'function') this.events.onSuccessSign(sig)
      } catch (e) {
        if (typeof this.events.onErrorSign === 'function') this.events.onErrorSign(e)
      }
    })
  }

  computeWithdrawEthTransactionData(): string {
    const withdrawMethodID = '0x8e19899e'
    const solanaPubkey = this.getSolanaPubkey()
    const solanaStr = this.bufferToHex(solanaPubkey.toBytes())
    return `${withdrawMethodID}${solanaStr}`
  }


  computeWithdrawAmountValue (amount: number, token: AcceptedToken): string {
    const result = Number(amount) * Math.pow(10, token.decimals)
    return '0x' + result.toString(16)
  }

  getEthereumTransactionParams(amount: number, token: AcceptedToken): EthereumTransactionParams {
    return {
      to: "0x053e3d1b12726f648B2e45CEAbDF9078B742576D",
      from: this.neonWalletAddress,
      value: this.computeWithdrawAmountValue(amount, token),
      data: this.computeWithdrawEthTransactionData()
    }
  }

  async createSolanaTransfer (amount: number, token: AcceptedToken): Promise<void> {
    if (typeof this.events.onBeforeSignTransaction === 'function') this.events.onBeforeSignTransaction()
    try {
      if (this.ethereumProvider === undefined) throw Error
      const txHash = await this.ethereumProvider.request({
        method: 'eth_sendTransaction',
        params: [this.getEthereumTransactionParams(amount, token)],
      })
      if (typeof this.events.onSuccessSign === 'function') this.events.onSuccessSign(undefined, txHash)
    } catch (e) {
      if (typeof this.events.onErrorSign === 'function') this.events.onErrorSign(e)
    }
  }
}

export default NeonPortal
