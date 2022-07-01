import InstructionService from "./InstructionService";
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Transaction } from '@solana/web3.js'

class MintPortal extends InstructionService {
  async createNeonTransfer(events = undefined, amount = 0, splToken = {
    chainId: 0,
    address_spl: "",
    address: "",
    decimals: 1,
    name: "",
    symbol: "",
    logoURI: ""
  }): void {
    events  = events === undefined ? this.events : events
    if (typeof events.onBeforeCreateInstruction === 'function') events.onBeforeCreateInstruction()
    const { blockhash } = await this.connection.getRecentBlockhash()
    const solanaKey = this._getSolanaWalletPubkey()
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: solanaKey
    })
    const neonAccount = await this.getNeonAccount()
    if (!neonAccount) {
      const neonAccountInstruction = await this._createNeonAccountInstruction()
      transaction.add(neonAccountInstruction)
      if (typeof events.onCreateNeonAccountInstruction === 'function') events.onCreateNeonAccountInstruction()
    }
    const ERC20WrapperAccount = await this._getERC20WrapperAccount(splToken)
    if (!ERC20WrapperAccount) {
      const ERC20WrapperInstruction = await this._createERC20AccountInstruction(splToken)
      transaction.add(ERC20WrapperInstruction)
    }
    const transferInstruction = await this._createTransferInstruction(amount, splToken)
    transaction.add(transferInstruction)
    if (typeof events.onBeforeSignTransaction === 'function') events.onBeforeSignTransaction()
    setTimeout(async () => {
      try {
        const signedTransaction = await window.solana.signTransaction(transaction)
        const sig = await this.connection.sendRawTransaction(signedTransaction.serialize())
        if (typeof events.onSuccessSign === 'function') events.onSuccessSign(sig)
      } catch (e) {
        if (typeof events.onErrorSign === 'function') events.onErrorSign(e)
      }
    })
  }

  async createSolanaTransfer (events = undefined, amount = 0, splToken = {
    chainId: 0,
    address_spl: "",
    address: "",
    decimals: 1,
    name: "",
    symbol: "",
    logoURI: ""
  }) {
    events  = events === undefined ? this.events : events
    const solanaPubkey = this._getSolanaPubkey()
    const recentBlockhash = await this.connection.getRecentBlockhash()
    if (typeof events.onBeforeNeonSign === 'function') events.onBeforeNeonSign()
    // txHash is a hex string
    // As with any RPC call, it may throw an error
    let txHash
    try {
      txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [this.getEthereumTransactionParams(amount, splToken)],
      })
    } catch (e) {
      if (typeof events.onErrorSign === 'function') events.onErrorSign(e)
    }
    if (txHash === undefined) return false
    const liquidityInstruction = await this._createTransferInstruction(amount, splToken, true)
    const transaction = new Transaction({
      recentBlockhash: recentBlockhash.blockhash,
      feePayer: solanaPubkey
    })
    const mintPubkey = this._getSolanaPubkey(splToken.address_spl)
    const assocTokenAccountAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintPubkey,
      solanaPubkey
    )
    const associatedTokenAccount = await this.connection.getAccountInfo(assocTokenAccountAddress)
    if (!associatedTokenAccount) {
      // Create token account if it not exists
      const createAccountInstruction = Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mintPubkey,               // token mint
        assocTokenAccountAddress, // account to create
        solanaPubkey,             // new account owner
        solanaPubkey              // payer
      )
      transaction.add(createAccountInstruction)
    }
    transaction.add(liquidityInstruction)
    if (typeof events.onBeforeSignTransaction === 'function') events.onBeforeSignTransaction()
    setTimeout(async () => {
      try {
        const signedTransaction = await window.solana.signTransaction(transaction)
        const sig = await this.connection.sendRawTransaction(signedTransaction.serialize())
        if (typeof events.onSuccessSign === 'function') events.onSuccessSign(sig, txHash)
      } catch (e) {
        if (typeof events.onErrorSign === 'function') events.onErrorSign(e)
      }
    })
  }
}

export default MintPortal
