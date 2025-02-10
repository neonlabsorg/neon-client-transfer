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
import { ethers } from "ethers";

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

  get deployer() {
    return this.deploySystemContract;
  }

  private contractPath(fileName: string): string {
    return join(process.cwd(), '__tests__/data/contracts', fileName);
  }

  async deployFactoryContract(): Promise<NeonAddress | null> {
    console.log(`Compile and deploy ERC20ForSplFactory.bin contract`);
    try {
      return await this.deployContract('ERC20ForSplFactory.bin');
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
    token.chainId = this.chainId;
    const tokenMint = token.address_spl;
    try {
      const ecr20Address = await deployErc20ForSplWrapper(this.provider, this.neonWallet, factoryAddress, tokenMint);
      token.address = ecr20Address ?? '';
      return token;
    } catch (e) {
      console.log('Error deploying Minted Token', e);
      return null;
    }
  }

  async deployNeonTokenContract(): Promise<NeonAddress | null> {
    console.log(`Deploy NeonToken.bin contract - NEON_TRANSFER_CONTRACT`);
    try {
      return await this.deployContract('NeonToken.bin');
    } catch (e) {
      console.log('Error deploying NeonToken contract', e);
      return null;
    }
  }

  async deployWNeonTokenContract(): Promise<SPLToken | null> {
    console.log(`Deploy WNEON.bin contract`);
    const wNEON = { ...WNEON_TOKEN_MODEL, chainId: this.chainId };
    try {
      wNEON.address = await this.deployContract('WNEON.bin');
      return wNEON;
    } catch (e) {
      console.log('Error deploying WNEON contract', e);
      return null;
    }
  }

  async deployContract(contract: string = ''): Promise<NeonAddress | null> {
    if(!contract) {
      console.log(`Contract name wasn't provided`);
      return null;
    }
    const contractPath = this.contractPath(contract);
    const contractBinary = this.deploySystemContract.readContract(contractPath);

    const contractAddress = contractAddressByData(this.chainId, contractBinary);
    const deployedCode = await this.provider.getCode(contractAddress);

    if (deployedCode !== "0x") {
      console.log(`Contract already deployed at ${contractAddress}`);
      return contractAddress;
    }

    const accountNonce = await this.provider.getTransactionCount(this.neonWallet.address);
    const { gasPrice } = await this.provider.getFeeData();

    try {
      const deployTx = {
        chainId: this.chainId,
        nonce: accountNonce,
        data: `0x${contractBinary}`,
        gasLimit: ethers.toBeHex(1_000_000_000),
        gasPrice,
        gas: 0,
      };

      deployTx.gas = Number(await this.provider.estimateGas(deployTx));

      console.log("Deploying contract...");
      const tx = await this.neonWallet.sendTransaction(deployTx);
      console.log(`Transaction Hash: ${tx.hash}`);

      const { contractAddress } = await waitForTxConfirmation(this.provider, tx.hash);
      console.log(`Contract deployed at: ${contractAddress}`);

      return contractAddress;
    } catch (e) {
      console.log('Error deploying contract', e);
      return null;
    }
  }
}

async function waitForTxConfirmation(provider: JsonRpcProvider, txHash: string, confirmations = 1, timeout = 120000) {
  try {
    // Check if transaction is already confirmed
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) {
      console.log("Transaction already confirmed:", receipt);
      return receipt;
    }

    // Wait for transaction confirmation
    console.log(`Waiting for ${confirmations} confirmation(s)...`);
    const txReceipt = await provider.waitForTransaction(txHash, confirmations, timeout);
    console.log("Transaction confirmed:", txReceipt);

    return txReceipt;
  } catch (error) {
    console.error("Transaction confirmation failed:", error);
    return null;
  }
}
