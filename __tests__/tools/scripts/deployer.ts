import {
  contractAddressByData,
  deployErc20ForSplWrapper,
  DeploySystemContract,
  SplTokenDeployer
} from '@neonevm/contracts-deployer';
import { NeonAddress, SPLToken } from '@neonevm/token-transfer-core';
import { join } from 'path';
import { Connection, Keypair } from '@solana/web3.js';
import { JsonRpcProvider, Wallet } from 'ethers';
import { WNEON_TOKEN_MODEL, WSOL_TOKEN_MODEL } from '../artifacts';

export class Deployer {
  solanaWallet: Keypair;
  neonWallet: Wallet;
  provider: JsonRpcProvider;
  connection: Connection;
  deploySystemContract: DeploySystemContract;
  chainId: number;

  constructor(provider: JsonRpcProvider, connection: Connection, neonWallet: Wallet, solanaWallet: Keypair, chainId: number) {
    this.solanaWallet = solanaWallet;
    this.neonWallet = neonWallet;
    this.provider = provider;
    this.connection = connection;
    this.chainId = chainId;
    this.deploySystemContract = new DeploySystemContract(provider, chainId);
  }

  private contractPath(bin: string): string {
    return join(process.cwd(), '__tests__/data/contracts', bin);
  }

  async deployFactoryContract(): Promise<NeonAddress | null> {
    console.log(`Compile and deploy ERC20ForSplFactory.bin contract`);
    const contractPath = this.contractPath('ERC20ForSplFactory.bin');
    const contractData = this.deploySystemContract.readContract(contractPath);
    const factoryAddress = contractAddressByData(this.chainId, contractData);
    if(factoryAddress) return factoryAddress;
    try {
      return await this.deploySystemContract.deployContract(contractData, this.neonWallet);
    } catch (e) {
      console.log('Error deploying Factory contract', e);
      return null;
    }
  }

  //For other fungible tokens, different from wSOL
  async deploySplToken(token: SPLToken, factoryAddress: NeonAddress): Promise<SPLToken | null> {
    token.chainId = this.chainId;
    const deployer = new SplTokenDeployer(this.provider, this.connection, this.neonWallet, this.solanaWallet);
    try {
      return await deployer.deploy(factoryAddress, token, 1e9);
    }catch (e) {
      console.log('Error deploying SPL Token', e);
      return null;
    }
  }

  //For wSOL token, we don't need to mint it
  async deployMintedToken(factoryAddress: string, token: SPLToken = WSOL_TOKEN_MODEL): Promise<SPLToken | null> {
    const tokenMint = token.address_spl;
    try {
      const ecr20Address = await deployErc20ForSplWrapper(this.provider, this.neonWallet, factoryAddress, tokenMint);
      token.address = ecr20Address ?? '';
      token.chainId = this.chainId;
      return token;
    } catch (e) {
      console.log('Error deploying Minted Token', e);
      return null;
    }
  }

  async deployNeonTokenContract(): Promise<NeonAddress | null> {
    console.log(`Deploy NeonToken.bin contract - NEON_TRANSFER_CONTRACT`);
    const contractPath = this.contractPath('NeonToken.bin');
    const contractData = this.deploySystemContract.readContract(contractPath);
    try {
      return await this.deploySystemContract.deployContract(contractData, this.neonWallet);
    } catch (e) {
      console.log('Error deploying NeonToken contract', e);
      return null;
    }
  }

  async deployWNeonTokenContract(): Promise<SPLToken | null> {
    console.log(`Deploy WNEON.bin contract`);
    const wNEON = { ...WNEON_TOKEN_MODEL, chainId: this.chainId };
    const contractPath = this.contractPath('WNEON.bin');
    const contractData = this.deploySystemContract.readContract(contractPath);
    try {
      wNEON.address = await this.deploySystemContract.deployContract(contractData, this.neonWallet);
      return wNEON;
    } catch (e) {
      console.log('Error deploying WNEON contract', e);
      return null;
    }
  }
}
