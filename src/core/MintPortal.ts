import InstructionService from "./InstructionService";
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Transaction } from '@solana/web3.js'
import { AcceptedToken } from "./types";

class MintPortal extends InstructionService {
  public async createNeonTransfer(amount:number = 0, splToken: AcceptedToken = {
    address_spl: "",
    address: "",
    decimals: 1,
    name: "",
    symbol: "",
    logoURI: ""
  }) {
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
    const ERC20WrapperAccount = await this._getERC20WrapperAccount(splToken)
    if (!ERC20WrapperAccount) {
      const ERC20WrapperInstruction = await this._createERC20AccountInstruction(splToken)
      transaction.add(ERC20WrapperInstruction)
    }
    const transferInstruction = await this._createTransferInstruction(amount, splToken)
    transaction.add(transferInstruction)
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

  public async createSolanaTransfer (amount = 0, splToken = {
    chainId: 0,
    address_spl: "",
    address: "",
    decimals: 1,
    name: "",
    symbol: "",
    logoURI: ""
  }) {
    const solanaPubkey = this._getSolanaPubkey()
    const { blockhash } = await this.connection.getRecentBlockhash()
    if (typeof this.events.onBeforeNeonSign === 'function') this.events.onBeforeNeonSign()
    // txHash is a hex string
    // As with any RPC call, it may throw an error
    let txHash: any;
    try {
      if (this.ethereumProvider === undefined) throw Error
      txHash = await this.ethereumProvider.request({
        method: 'eth_sendTransaction',
        params: [this.getEthereumTransactionParams(amount, splToken)],
      })
    } catch (e) {
      if (typeof this.events.onErrorSign === 'function') this.events.onErrorSign(e)
    }
    const liquidityInstruction = await this._createTransferInstruction(amount, splToken, true)
    const transaction = new Transaction({
      recentBlockhash: blockhash,
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
    if (typeof this.events.onBeforeSignTransaction === 'function') this.events.onBeforeSignTransaction()
    setTimeout(async () => {
      try {
        if (this.solanaProvider === undefined) throw Error
        const signedTransaction = await this.solanaProvider.signTransaction(transaction)
        const sig = await this.connection.sendRawTransaction(signedTransaction.serialize())
        if (typeof this.events.onSuccessSign === 'function') this.events.onSuccessSign(sig, txHash)
      } catch (e) {
        if (typeof this.events.onErrorSign === 'function') this.events.onErrorSign(e)
      }
    })
  }
}

export default MintPortal
