import InstructionService from "./InstructionService";
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js'
import ab2str from "arraybuffer-to-string"
import { NEON_EVM_LOADER_ID, NEON_TOKEN_DECIMALS, NEON_TOKEN_MINT } from "../constants"

class NeonPortal extends InstructionService {
  async _createApproveDepositInstruction(amount) {
    const solanaPubkey = this._getSolanaPubkey()
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

  async _createDepositTransferInstruction (amount, splToken) {
    const mintPubkey = this._getNeonMintTokenPubkey()
    const solanaPubkey = this._getSolanaWalletPubkey()
    const {erc20Address} = await this._getERC20WrapperAddress(splToken)
    const solanaBalanceAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintPubkey,
      solanaPubkey
    )
    return Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      solanaBalanceAccount,
      erc20Address,
      solanaPubkey,
      [],
      Number(amount) * Math.pow(10, splToken.decimals)
    )
  }

  async _createWithdrawTransferInstruction (amount, splToken) {
    const mintPubkey = this._getSolanaPubkey(splToken.address_spl)
    const solanaPubkey = this._getSolanaWalletPubkey()
    const {erc20Address} = await this._getERC20WrapperAddress(splToken)
    const solanaBalanceAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintPubkey,
      solanaPubkey
    )
    return Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      erc20Address,
      solanaBalanceAccount,
      solanaPubkey,
      [],
      Number(amount) * Math.pow(10, splToken.decimals)
    )
  }

  // #region
  async createNeonTransfer(events = undefined, amount = 0) {
    events  = events === undefined ? this.events : events
    if (this.broken === true) {
      console.warn('Create Neon Transfer: You try to transfer after configuring errors. Please, fix it first')
      return
    }
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

    const approveInstruction = await this._createApproveDepositInstruction(amount)
    transaction.add(approveInstruction)

    const solanaPubkey = this._getSolanaWalletPubkey()
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
    const {neonAddress} = await this._getNeonAccountAddress()

    const keys = [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: neonAddress, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]

    const depositInstruction = new TransactionInstruction({
      programId: new PublicKey(NEON_EVM_LOADER_ID),
      data: [Number.parseInt('0x19', 16)],
      keys
    })
    transaction.add(depositInstruction)

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

  _computeWithdrawEthTransactionData () {
    const withdrawMethodID = '0x8e19899e'
    const solanaPubkey = this._getSolanaPubkey()
    const solanaStr = ab2str(solanaPubkey.toBytes(), 'hex')
    return `${withdrawMethodID}${solanaStr}`
  }


  _computeWithdrawAmountValue (amount, splToken) {
    const result = Number(amount) * Math.pow(10, splToken.decimals)
    return '0x' + result.toString(16)
  }
  // #endregion

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
    if (this.broken === true) {
      console.warn('Create Solana Transfer: You try to transfer after configuring errors. Please, fix it first')
      return
    }
    if (typeof events.onBeforeCreateInstruction === 'function') events.onBeforeCreateInstruction()

    const transactionParameters = {
      to: "0x053e3d1b12726f648B2e45CEAbDF9078B742576D",
      from: this.neonWalletAddress, // must match user's active address.
      value: this._computeWithdrawAmountValue(amount, splToken), // Only required to send ether to the recipient from the initiating external account.
      data: this._computeWithdrawEthTransactionData()
    };
    if (typeof events.onBeforeNeonSign === 'function') events.onBeforeNeonSign()

    try {
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      })
      if (typeof events.onSuccessSign === 'function') events.onSuccessSign(undefined, txHash)
    } catch (e) {
      if (typeof events.onErrorSign === 'function') events.onErrorSign(e)
    }
  }
}

export default NeonPortal
