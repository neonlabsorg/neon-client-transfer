import {
  clusterApiUrl,
  Connection,
  PublicKey, 
  TransactionInstruction, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import { Events, PhantomProvider, Network, NeonPortalOptions, AcceptedToken, EthereumProvider } from './types';
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { hexToBytes } from "web3-utils"
import { NEON_TOKEN_MINT, NEON_EVM_LOADER_ID } from "../constants"

const mergeTypedArraysUnsafe = (a: any, b: any): Buffer => {
  const c = new a.constructor(a.length + b.length)
  c.set(a)
  c.set(b, a.length)
  return c
}
const getSolanaProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    const provider = (window as any).solana;
    if (provider.isPhantom) {
      return provider;
    }
  }
  window.open("https://phantom.app/", "_blank");
};

const getEthereumProvider = (): EthereumProvider | undefined => {
  if ("ethereum" in window) {
    return (window as any).ethereum;
  }
}

const bufferToString = (buffer: Buffer, encoding?: BufferEncoding): string => {
  if (!encoding) encoding = 'hex'
  return Buffer.from(buffer).toString(encoding)
}


class InstructionService {
  network: Network
  solanaWalletAddress: string
  neonWalletAddress: string
  connection: Connection
  events: Events
  solanaProvider: PhantomProvider | undefined
  ethereumProvider: EthereumProvider | undefined
  constructor(options: NeonPortalOptions) {
    this.network = Network.MainnetBeta
    this.solanaProvider = getSolanaProvider()
    this.ethereumProvider = getEthereumProvider()
    if (this.isCorrectNetworkOption(options.network)) this.network = options.network
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
  }

  public bufferToHex(buffer: Uint8Array | Buffer): string {
    return Buffer.from(buffer).toString('hex')
  }

  protected async getNeonAccountAddress () {
    const accountSeed = this.getNeonAccountSeed()
    const programAddress = await PublicKey.findProgramAddress([new Uint8Array([1]), accountSeed], new PublicKey(NEON_EVM_LOADER_ID))
    const neonAddress = programAddress[0]
    const neonNonce = programAddress[1]
    return {neonAddress, neonNonce}
  }

  private getEthSeed (hex = ''): Buffer | Uint8Array {
    const bytes = hexToBytes(hex)
    return new Uint8Array(bytes)
  }

  private getNeonAccountSeed (): Buffer | Uint8Array {
    return this.getEthSeed(this.neonWalletAddress)
  }

  async getNeonAccount () {
    const {neonAddress} = await this.getNeonAccountAddress()
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

  protected getSolanaWalletPubkey () {
    return new PublicKey(this.solanaWalletAddress)
  }

  protected isCorrectNetworkOption(network = '') {
    if (!network.length) return false
    if (network === 'mainnet-beta' || network === 'testnet' || network === 'devnet') return true
    else {
      console.warn(`Your network property ${network} is wrong. Please, apply right name of network: 'devnet', 'testnet' or 'mainnet-beta'.\n Network will fallback to mainnet-beta`)
      return false
    }
  }

  protected getSolanaPubkey (address = ''): PublicKey {
    if (!address) return this.getSolanaWalletPubkey()
    return new PublicKey(address)
  }

  protected getNeonMintTokenPubkey () {
    return this.getSolanaPubkey(NEON_TOKEN_MINT)
  }

  async _getERC20WrapperAddress (token: AcceptedToken) {
    const enc = new TextEncoder()
    const tokenPubkey = this.getSolanaPubkey(token.address_spl)
    const erc20Seed = this.getEthSeed(token.address)
    const accountSeed = this.getNeonAccountSeed()
    const erc20addr = await PublicKey.findProgramAddress([
      new Uint8Array([1]),
      enc.encode('ERC20Balance'),
      tokenPubkey.toBytes(),
      erc20Seed,
      accountSeed
    ],new PublicKey(NEON_EVM_LOADER_ID))
    return {erc20Address: erc20addr[0], erc20Nonce: erc20addr[1]}
  }

  async _getERC20WrapperAccount (token: AcceptedToken) {
    const {erc20Address} = await this._getERC20WrapperAddress(token)
    const ERC20WrapperAccount = await this.connection.getAccountInfo(erc20Address)
    return ERC20WrapperAccount
  }

  async _createERC20AccountInstruction (token: AcceptedToken) {
    const data = new Buffer(0x0f)
    const solanaPubkey = this.getSolanaWalletPubkey()
    const mintPublicKey = this.getSolanaPubkey(token.address_spl)
    const {erc20Address} = await this._getERC20WrapperAddress(token)
    const {neonAddress} = await this.getNeonAccountAddress()
    const contractAddress = await PublicKey.findProgramAddress([
      new Uint8Array([1]),
      this.getEthSeed(token.address)
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

  async _getNeonAccountInstructionKeys (neonAddress: PublicKey) {
    const solanaWalletPubkey = this.getSolanaWalletPubkey()
    return [
      { pubkey: solanaWalletPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: neonAddress, isSigner: false, isWritable: true },
    ]
  }

  async _createNeonAccountInstruction () {
    const {neonAddress, neonNonce} = await this.getNeonAccountAddress()
    const keys = await this._getNeonAccountInstructionKeys(neonAddress)
    const pattern = this.getEthSeed("0x18")
    const instructionData = mergeTypedArraysUnsafe(
      mergeTypedArraysUnsafe(
        new Uint8Array(pattern),
        this.getNeonAccountSeed()
      ),
      new Uint8Array([neonNonce])
    )

    return new TransactionInstruction({
      programId: new PublicKey(NEON_EVM_LOADER_ID),
      data: instructionData,
      keys
    })
  }

  computeWithdrawEthTransactionData (amount: number, token: AcceptedToken) {
    const approveSolanaMethodID = '0x93e29346'
    const solanaPubkey = this.getSolanaPubkey()
    const solanaStr = bufferToString(solanaPubkey.toBuffer(), 'hex')
    const amountBuffer = new Buffer(32)
    const view = new DataView(amountBuffer.buffer);
    view.setUint32(28, Number(amount) * Math.pow(10, token.decimals)) // mutate amountBuffer
    const amountStr = bufferToString(amountBuffer, 'hex')
    return `${approveSolanaMethodID}${solanaStr}${amountStr}`
  }

  getEthereumTransactionParams (amount: number, token: AcceptedToken) {
    return {
      to: token.address, // Required except during contract publications.
      from: this.neonWalletAddress, // must match user's active address.
      value: '0x00', // Only required to send ether to the recipient from the initiating external account.
      data: this.computeWithdrawEthTransactionData(amount, token)
    }
  }

  async _createTransferInstruction (amount: number, token: AcceptedToken, toSolana = false) {
    const mintPubkey = this.getSolanaPubkey(token.address_spl)
    const solanaPubkey = this.getSolanaWalletPubkey()
    const {erc20Address} = await this._getERC20WrapperAddress(token)
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
      Number(amount) * Math.pow(10, token.decimals)
    )
  }
}

export default InstructionService
