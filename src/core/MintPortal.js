import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import {
  Transaction,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js"
import { NEON_EVM_LOADER_ID } from "../constants"
import { InstructionService } from "./InstructionService"

// ERC-20 tokens
export class MintPortal extends InstructionService {
  // #region Solana -> Neon
  async createNeonTransfer(
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
      if (typeof events.onCreateNeonAccountInstruction === "function") {
        events.onCreateNeonAccountInstruction()
      }
    }

    const ERC20WrapperAccount = await this._getERC20WrapperAccount(splToken)
    if (!ERC20WrapperAccount) {
      const ERC20WrapperInstruction = await this._createERC20AccountInstruction(splToken)
      transaction.add(ERC20WrapperInstruction)
    }

    const transferInstruction = await this._createTransferInstruction(amount, splToken)
    transaction.add(transferInstruction)

    if (typeof events.onBeforeSignTransaction === "function") events.onBeforeSignTransaction()

    setTimeout(async () => {
      try {
        const signedTransaction = await window.solana.signTransaction(transaction)
        const sig = await this.connection.sendRawTransaction(signedTransaction.serialize())
        if (typeof events.onSuccessSign === "function") events.onSuccessSign(sig)
      } catch (error) {
        if (typeof events.onErrorSign === "function") events.onErrorSign(error)
      }
    })
  }

  async _createERC20AccountInstruction(splToken) {
    const data = new Uint8Array([0x0f])
    const solanaPubkey = this._getSolanaWalletPubkey()
    const mintPublicKey = this._getSolanaPubkey(splToken.address_spl)
    const { erc20Address } = await this._getERC20WrapperAddress(splToken)
    const { neonAddress } = await this._getNeonAccountAddress()
    const contractAddress = await PublicKey.findProgramAddress(
      [new Uint8Array([1]), this._getEthSeed(splToken.address)],
      new PublicKey(NEON_EVM_LOADER_ID),
    )

    const keys = [
      { pubkey: solanaPubkey, isSigner: true, isWritable: true },
      { pubkey: erc20Address, isSigner: false, isWritable: true },
      { pubkey: neonAddress, isSigner: false, isWritable: true },
      { pubkey: contractAddress[0], isSigner: false, isWritable: true },
      { pubkey: mintPublicKey, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ]

    return new TransactionInstruction({
      programId: new PublicKey(NEON_EVM_LOADER_ID),
      data,
      keys,
    })
  }

  async _getERC20WrapperAccount(splToken) {
    const { erc20Address } = await this._getERC20WrapperAddress(splToken)

    return this.connection.getAccountInfo(erc20Address)
  }
  // #endregion

  // #region Neon -> Solana
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
    if (typeof events.onBeforeNeonSign === "function") events.onBeforeNeonSign()

    try {
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [this.getEthereumTransactionParams(amount, splToken)],
      })
      if (typeof events.onSuccessSign === "function") events.onSuccessSign(txHash)
    } catch (error) {
      if (typeof events.onErrorSign === "function") events.onErrorSign(error)
    }
  }
  // #endregion

  async _getERC20WrapperAddress(splToken) {
    const enc = new TextEncoder()
    const tokenPubkey = this._getSolanaPubkey(splToken.address_spl)
    const erc20Seed = this._getEthSeed(splToken.address)
    const accountSeed = this._getNeonAccountSeed()
    const erc20addr = await PublicKey.findProgramAddress(
      [
        new Uint8Array([1]),
        enc.encode("ERC20Balance"),
        tokenPubkey.toBytes(),
        erc20Seed,
        accountSeed,
      ],
      new PublicKey(NEON_EVM_LOADER_ID),
    )

    return { erc20Address: erc20addr[0], erc20Nonce: erc20addr[1] }
  }
}
