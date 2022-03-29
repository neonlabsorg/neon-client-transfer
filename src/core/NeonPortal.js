import InstructionService from "./InstructionService";
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Transaction } from '@solana/web3.js'
import ab2str from "arraybuffer-to-string"
import { NEON_TOKEN_MINT } from "../constants"

class NeonPortal extends InstructionService {
  async _createApproveDepositInstruction(amount, splToken) {
    const authority = await this.getAuthorityPoolAddress()
    const pool = await Token.getAssociatedTokenAddress(
      authority,
      NEON_TOKEN_MINT
    )
    const instruction = Token.createApproveInstruction({
      delegate: authority,
      amount:  Number(amount) * Math.pow(10, splToken.decimals)
    })
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
  async createNeonTransfer(events = undefined, amount = 0, splToken = {
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

    const approveInstruction = await this._createApproveDepositInstruction()
    transaction.add(approveInstruction)

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
    const amountBuffer = new Uint8Array(32)
    const view = new DataView(amountBuffer.buffer);
    view.setUint32(28, Number(amount) * Math.pow(10, splToken.decimals))
    return ab2str(amountBuffer, 'hex')
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
    if (splToken.address_spl === NEON_TOKEN_MINT) {

      const transactionParameters = {
        to: splToken.address, // Required except during contract publications.
        from: this.neonWalletAddress, // must match user's active address.
        value: this._computeWithdrawAmountValue(), // Only required to send ether to the recipient from the initiating external account.
        data: this._computeWithDrawEthTransactionData()
      };
      if (typeof events.onBeforeNeonSign === 'function') events.onBeforeNeonSign()
      // txHash is a hex string
      // As with any RPC call, it may throw an error
      let txHash
      try {
        txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [transactionParameters],
        })
      } catch (e) {
        if (typeof events.onErrorSign === 'function') events.onErrorSign(e)
      }
    }
  }
}

export default NeonPortal