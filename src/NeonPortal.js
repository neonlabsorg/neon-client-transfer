import {
  clusterApiUrl,
  Connection
} from '@solana/web3.js';
import {PublicKey, Transaction, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY} from '@solana/web3.js'
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

const web3 = require('web3')
const ab2str = require('arraybuffer-to-string')

const mergeTypedArraysUnsafe = (a, b) => {
  const c = new a.constructor(a.length + b.length)
  c.set(a)
  c.set(b, a.length)
  return c
}

const NEON_EVM_LOADER_ID = 'eeLSJgWzzxrqKv1UxtRVVH8FX3qCQWUs9QuAjJpETGU'
const NEON_MINT_TOKEN = '89dre8rZjLNft7HoupGiyxu3MNftR577ZYu8bHe2kK7g'

class NeonPortal {
  solanaWalletAddress = ''
  constructor(options) {
    this.broken = false
    if (!options.solanaWalletAddress) {
      this.broken = true;
      const errorText = `Phantom wallet address is required, but don't pass to options. Please fill required props!`
      throw Error(errorText)
    }
    if (!options.neonWalletAddress) {
      this.broken = true;
      const errorText = `Metamask (Neon) wallet address is required, but don't pass to options. Please fill required props!`
      throw Error(errorText)
    }
    this.network = 'mainnet-beta'
    if (this._isCorrectNetworkOption(options.network)) this.network = options.network
    this.solanaWalletAddress = options.solanaWalletAddress || ''
    this.neonWalletAddress = options.neonWalletAddress || ''
    this.connection = options.customConnection || new Connection(clusterApiUrl(this.network))
    this.events = {
      onBeforeCreateInstructions: options.onBeforeCreateInstructions || function() {},
      onCreateNeonAccountInstruction: options.onCreateNeonAccountInstruction || function () {},
      onBeforeSignTransaction: options.onBeforeSignTransaction || function () {},
      onBeforeNeonSign: options.onBeforeNeonSign || function () {},
      onSuccessSign: options.onSuccessSign || function () {},
      onErrorSign: options.onErrorSign || function () {}
    }
    if (!window.solana) {
      this.broken = true
      const errorText = `Phantom wallet don't exist. Please install Phantom and try again`
      throw Error(errorText)
    }
    if (!window.ethereum) {
      this.broken = true
      const errorText = `Metamask wallet don't exist. Please install Metamask and try again`
      throw Error(errorText)
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
    return this._getSolanaPubkey(NEON_MINT_TOKEN)
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
    const {erc20Address} = await this._getERC20WrapperAddress()
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
    const mintTokenPubkey = this._getNeonMintTokenPubkey()
    const solanaWalletPubkey = this._getSolanaWalletPubkey()
    const associatedAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintTokenPubkey,
      neonAddress,
      true
    )
    return [
      { pubkey: solanaWalletPubkey, isSigner: true, isWritable: true },
      { pubkey: neonAddress, isSigner: false, isWritable: true },
      { pubkey: associatedAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: mintTokenPubkey, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
    ]
  }

  async _createNeonAccountInstruction () {
    const accountSeed = this._getNeonAccountSeed()
    const {neonAddress, neonNonce} = await this._getNeonAccountAddress()
    const keys = await this._getNeonAccountInstructionKeys(neonAddress)
    const pattern = new Uint8Array([0x2,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0])
    const instructionData = mergeTypedArraysUnsafe(mergeTypedArraysUnsafe(pattern, accountSeed), new Uint8Array([neonNonce]))
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

  async createNeonTransfer(amount = 0, splToken = {
    chainId: 0,
    address_spl: "",
    address: "",
    decimals: 1,
    name: "",
    symbol: "",
    logoURI: ""
  }) {
    if (this.broken === true) {
      console.warn('Create Neon Transfer: You try to transfer after configuring errors. Please, fix it first')
      return
    }
    this.events.onBeforeCreateInstructions()
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
      this.events.onCreateNeonAccountInstruction()
    }
    const ERC20WrapperAccount = await this._getERC20WrapperAccount(splToken)
    if (!ERC20WrapperAccount) {
      const ERC20WrapperInstruction = await this._createERC20AccountInstruction(splToken)
      transaction.add(ERC20WrapperInstruction)
    }
    const transferInstruction = await this._createTransferInstruction(amount, splToken)
    transaction.add(transferInstruction)
    this.events.onBeforeSignTransaction()
    setTimeout(async () => {
      try {
        const signedTransaction = await window.solana.signTransaction(transaction)
        const sig = await this.connection.sendRawTransaction(signedTransaction.serialize())
        this.events.onSuccessSign(sig)
      } catch (e) {
        this.events.onErrorSign(e)
      }
    }, 0)
  }

  async createSolanaTransfer (amount = 0, splToken = {
    chainId: 0,
    address_spl: "",
    address: "",
    decimals: 1,
    name: "",
    symbol: "",
    logoURI: ""
  }) {
    if (this.broken === true) {
      console.warn('Create Solana Transfer: You try to transfer after configuring errors. Please, fix it first')
      return
    }
    this.events.onBeforeCreateInstructions()
    const solanaPubkey = this._getSolanaPubkey()
    const recentBlockhash = await this.connection.getRecentBlockhash()
    const transactionParameters = {
      to: splToken.address, // Required except during contract publications.
      from: this.neonWalletAddress, // must match user's active address.
      value: '0x00', // Only required to send ether to the recipient from the initiating external account.
      data: this._computeEthTransactionData(amount, splToken)
    };
    this.events.onBeforeNeonSign()
    // txHash is a hex string
    // As with any RPC call, it may throw an error
    let txHash
    try {
      txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      })
    } catch (e) {
      this.events.onErrorSign(e)
      throw Error(e)
    }
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
    this.events.onBeforeSignTransaction()
    setTimeout(async () => {
      try {
        const signedTransaction = await window.solana.signTransaction(transaction)
        const sig = await this.connection.sendRawTransaction(signedTransaction.serialize())
        this.events.onSuccessSign(sig, txHash)
      } catch (e) {
        this.events.onErrorSign(e)
        throw Error(e)
      }
    }, 0)
  }
}

export default NeonPortal