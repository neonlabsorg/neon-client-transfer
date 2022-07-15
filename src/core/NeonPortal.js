import InstructionService from "./InstructionService"
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { Transaction, TransactionInstruction, PublicKey } from "@solana/web3.js"
import ab2str from "arraybuffer-to-string"
import { NEON_EVM_LOADER_ID, NEON_TOKEN_DECIMALS, NEON_TOKEN_MINT } from "../constants"

// Neon-token
class NeonPortal extends InstructionService {
  // #region Neon -> Solana
  async createNeonTransfer(events = undefined, amount = 0) {
    events = events === undefined ? this.events : events
    if (typeof events.onBeforeCreateInstruction === "function") events.onBeforeCreateInstruction()

    const { blockhash } = await this.connection.getRecentBlockhash()
    const solanaKey = this._getSolanaWalletPubkey()
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: solanaKey,
    })

    const neonAccount = await this.getNeonAccount()
    if (!neonAccount) {
      const neonAccountInstruction = await this._createNeonAccountInstruction()
      transaction.add(neonAccountInstruction)
      if (typeof events.onCreateNeonAccountInstruction === "function")
        events.onCreateNeonAccountInstruction()
    }

    const approveInstruction = await this._createApproveDepositInstruction(amount)
    transaction.add(approveInstruction)

    const solanaPubkey = this._getSolanaWalletPubkey()
    const source = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      new PublicKey(NEON_TOKEN_MINT),
      solanaPubkey,
    )
    const [authority] = await this._getAuthorityPoolAddress()
    const pool = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      new PublicKey(NEON_TOKEN_MINT),
      authority,
      true,
    )
    const { neonAddress } = await this._getNeonAccountAddress()

    const keys = [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: neonAddress, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]

    const depositInstruction = new TransactionInstruction({
      programId: new PublicKey(NEON_EVM_LOADER_ID),
      data: [Number.parseInt("0x19", 16)],
      keys,
    })
    transaction.add(depositInstruction)

    if (typeof events.onBeforeSignTransaction === "function") events.onBeforeSignTransaction()

    setTimeout(async () => {
      try {
        const signedTransaction = await window.solana.signTransaction(transaction)
        const sig = await this.connection.sendRawTransaction(signedTransaction.serialize())
        if (typeof events.onSuccessSign === "function") events.onSuccessSign(sig)
      } catch (e) {
        if (typeof events.onErrorSign === "function") events.onErrorSign(e)
      }
    })
  }

  async _createApproveDepositInstruction(amount) {
    const solanaPubkey = this._getSolanaPubkey()
    const source = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      new PublicKey(NEON_TOKEN_MINT),
      solanaPubkey,
    )
    const [authority] = await this._getAuthorityPoolAddress()

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

  async _getAuthorityPoolAddress() {
    const enc = new TextEncoder()
    const authority = await PublicKey.findProgramAddress(
      [enc.encode("Deposit")],
      new PublicKey(NEON_EVM_LOADER_ID),
    )
    return authority
  }

  // #endregion

  // #region Solana -> Neon
  async createSolanaTransfer(
    events = undefined,
    amount = 0,
    splToken = {
      chainId: 0,
      address_spl: "",
      address: "",
      decimals: 1,
      name: "",
      symbol: "",
      logoURI: "",
    },
  ) {
    events = events === undefined ? this.events : events
    if (typeof events.onBeforeSignTransaction === "function") events.onBeforeSignTransaction()
    try {
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [this.getEthereumTransactionParams(amount, splToken)],
      })
      if (typeof events.onSuccessSign === "function") events.onSuccessSign(undefined, txHash)
    } catch (e) {
      if (typeof events.onErrorSign === "function") events.onErrorSign(e)
    }
  }

  getEthereumTransactionParams(amount, token) {
    return {
      to: "0x053e3d1b12726f648B2e45CEAbDF9078B742576D",
      from: this.neonWalletAddress,
      value: this._computeWithdrawAmountValue(amount, token),
      data: this._computeWithdrawEthTransactionData(),
    }
  }

  _computeWithdrawEthTransactionData() {
    const withdrawMethodID = "0x8e19899e"
    const solanaPubkey = this._getSolanaPubkey()
    const solanaStr = ab2str(solanaPubkey.toBytes(), "hex")
    return `${withdrawMethodID}${solanaStr}`
  }

  _computeWithdrawAmountValue(amount, splToken) {
    const result = Number(amount) * Math.pow(10, splToken.decimals)
    return "0x" + result.toString(16)
  }
  // #endregion
}

export default NeonPortal
