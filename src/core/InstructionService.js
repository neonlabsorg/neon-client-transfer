import {
  clusterApiUrl,
  Connection
} from '@solana/web3.js';
import {PublicKey, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY} from '@solana/web3.js'
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import web3 from "web3"
import ab2str from "arraybuffer-to-string"
import { NEON_TOKEN_MINT, NEON_EVM_LOADER_ID } from "../constants"

const mergeTypedArraysUnsafe = (a, b) => {
  const c = new a.constructor(a.length + b.length)
  c.set(a)
  c.set(b, a.length)
  return c
}

class InstructionService {
  constructor(options) {
    this.broken = false
    if (!options.solanaWalletAddress) {
      this.broken = true;
      const errorText = `Phantom wallet address is required, but don't pass to options. Please fill required props!`
      console.error(errorText)
    }
    if (!options.neonWalletAddress) {
      this.broken = true;
      const errorText = `Metamask (Neon) wallet address is required, but don't pass to options. Please fill required props!`
      console.error(errorText)
    }
    this.network = 'mainnet-beta'
    if (this._isCorrectNetworkOption(options.network)) this.network = options.network
    this.solanaWalletAddress = options.solanaWalletAddress || ''
    this.neonWalletAddress = options.neonWalletAddress || ''
    this.connection = options.customConnection || new Connection(clusterApiUrl(this.network))
    this.events = {
      onBeforeCreateInstruction: options.onBeforeCreateInstruction || function() {},
      onCreateNeonAccountInstruction: options.onCreateNeonAccountInstruction || function () {},
      onBeforeSignTransaction: options.onBeforeSignTransaction || function () {},
      onBeforeNeonSign: options.onBeforeNeonSign || function () {},
      onSuccessSign: options.onSuccessSign || function () {},
      onErrorSign: options.onErrorSign || function () {}
    }
    if (!window.solana) {
      this.broken = true
      const errorText = `Phantom wallet don't exist. Please install Phantom and try again`
      console.error(errorText)
    }
    if (!window.ethereum) {
      this.broken = true
      const errorText = `Metamask wallet don't exist. Please install Metamask and try again`
      console.error(errorText)
    }
  }

  async _getNeonAccountAddress () {
    const accountSeed = this._getNeonAccountSeed()
    const programAddress = await PublicKey.findProgramAddress([new Uint8Array([1]), accountSeed], new PublicKey(NEON_EVM_LOADER_ID))
    const neonAddress = programAddress[0]
    const neonNonce = programAddress[1]
    return {neonAddress, neonNonce}
  }

  _getEthSeed (hex = '') {
    return web3.utils.hexToBytes(hex)
  }

  _getNeonAccountSeed () {
    return this._getEthSeed(this.neonWalletAddress)
  }

  async getNeonAccount () {
    const {neonAddress} = await this._getNeonAccountAddress()
    const neonAccount = await this.connection.getAccountInfo(neonAddress)
    return neonAccount
  }

  async getAuthorityPoolAddress() {
    const enc = new TextEncoder()
    const authority = await PublicKey.findProgramAddress(
      [enc.encode("Deposit")],
      new PublicKey(NEON_EVM_LOADER_ID),
    )
    return authority
  }

  _getSolanaWalletPubkey () {
    return new PublicKey(this.solanaWalletAddress)
  }

  _isCorrectNetworkOption(network = '') {
    if (!network.length) return false
    if (network === 'mainnet-beta' || network === 'testnet' || network === 'devnet') return true
    else {
      console.warn(`Your network property ${network} is wrong. Please, apply right name of network: 'devnet', 'testnet' or 'mainnet-beta'.\n Network will fallback to mainnet-beta`)
      return false
    }
  }

  _getSolanaPubkey (address = '') {
    if (!address) return this._getSolanaWalletPubkey()
    return new PublicKey(address)
  }

  _getNeonMintTokenPubkey () {
    return this._getSolanaPubkey(NEON_TOKEN_MINT)
  }

  async _getERC20WrapperAddress (splToken) {
    const enc = new TextEncoder()
    const tokenPubkey = this._getSolanaPubkey(splToken.address_spl)
    const erc20Seed = this._getEthSeed(splToken.address)
    const accountSeed = this._getNeonAccountSeed()
    const erc20addr = await PublicKey.findProgramAddress([
      new Uint8Array([1]),
      enc.encode('ERC20Balance'),
      tokenPubkey.toBytes(),
      erc20Seed,
      accountSeed
    ],new PublicKey(NEON_EVM_LOADER_ID))
    return {erc20Address: erc20addr[0], erc20Nonce: erc20addr[1]}
  }

  async _getERC20WrapperAccount (splToken) {
    const {erc20Address} = await this._getERC20WrapperAddress(splToken)
    const ERC20WrapperAccount = await this.connection.getAccountInfo(erc20Address)
    return ERC20WrapperAccount
  }

  async _createERC20AccountInstruction (splToken) {
    const data = new Uint8Array([0x0f])
    const solanaPubkey = this._getSolanaWalletPubkey()
    const mintPublicKey = this._getSolanaPubkey(splToken.address_spl)
    const {erc20Address} = await this._getERC20WrapperAddress(splToken)
    const {neonAddress} = await this._getNeonAccountAddress()
    const contractAddress = await PublicKey.findProgramAddress([
      new Uint8Array([1]),
      this._getEthSeed(splToken.address)
    ], new PublicKey(NEON_EVM_LOADER_ID))
    const keys = [
      { pubkey: solanaPubkey, isSigner: true, isWritable: true },
      { pubkey: erc20Address, isSigner: false, isWritable: true },
      { pubkey: neonAddress, isSigner: false, isWritable: true },
      { pubkey: contractAddress[0], isSigner: false, isWritable: true},
      { pubkey: mintPublicKey, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
    ]
    const instruction = new TransactionInstruction({
      programId: new PublicKey(NEON_EVM_LOADER_ID),
      data,
      keys
    })
    return instruction
  }

  async _getNeonAccountInstructionKeys (neonAddress = '') {
    const solanaWalletPubkey = this._getSolanaWalletPubkey()
    return [
      { pubkey: solanaWalletPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: neonAddress, isSigner: false, isWritable: true },
    ]
  }

  async _createNeonAccountInstruction () {
    const {neonAddress, neonNonce} = await this._getNeonAccountAddress()
    const keys = await this._getNeonAccountInstructionKeys(neonAddress)
    const pattern = this._getEthSeed("0x18")
    const instructionData = mergeTypedArraysUnsafe(
      mergeTypedArraysUnsafe(
        new Uint8Array(pattern),
        this._getNeonAccountSeed()
      ),
      new Uint8Array([neonNonce])
    )

    return new TransactionInstruction({
      programId: new PublicKey(NEON_EVM_LOADER_ID),
      data: instructionData,
      keys
    })
  }

  _computeEthTransactionData (amount, splToken) {
    const approveSolanaMethodID = '0x93e29346'
    const solanaPubkey = this._getSolanaPubkey()
    const solanaStr = ab2str(solanaPubkey.toBytes(), 'hex')
    const amountBuffer = new Uint8Array(32)
    const view = new DataView(amountBuffer.buffer);
    view.setUint32(28, Number(amount) * Math.pow(10, splToken.decimals))
    const amountStr = ab2str(amountBuffer, 'hex')
    return `${approveSolanaMethodID}${solanaStr}${amountStr}`
  }

  async _createTransferInstruction (amount, splToken, toSolana = false) {
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
      toSolana ? erc20Address : solanaBalanceAccount,
      toSolana ? solanaBalanceAccount : erc20Address,
      solanaPubkey,
      [],
      Number(amount) * Math.pow(10, splToken.decimals)
    )
  }
}

export default InstructionService
