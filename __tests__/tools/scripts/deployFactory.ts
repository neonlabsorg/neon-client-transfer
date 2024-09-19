import { ContractFactory, JsonRpcProvider } from 'ethers';
import { compile, walletSigner } from '../utils';
import { NEON_PRIVATE } from '../artifacts';

export async function deployFactory(proxyUrl: string): Promise<string> {
  const provider = new JsonRpcProvider(proxyUrl);
  const wallet = walletSigner(provider, NEON_PRIVATE);

  //Compile contract
  const factoryContract = await compile('ERC20ForSplFactory.sol', '__tests__/data/contracts');

  //Deploy contract
  const bytecode = factoryContract.evm.bytecode.object;
  const abi = factoryContract.abi;
  const factory = new ContractFactory(abi, bytecode, wallet);
  const contractInstance = await factory.deploy();
  const address = await contractInstance.getAddress();
  console.log(`Contract deployed to: ${address}`);
  return address;
}
