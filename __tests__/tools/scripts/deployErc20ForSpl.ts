import { Contract, JsonRpcProvider } from 'ethers';
import { erc20ForSplAbi } from '../../data/abi/erc20ForSplFactory';
import { base58ToHex, walletSigner } from '../utils';
import { NEON_PRIVATE } from '../../tools';
import { zeroAddress } from '../artifacts';

export function erc20ForSPLFactoryContract(contractAddress: string, provider: JsonRpcProvider): Contract {
  return new Contract(contractAddress, erc20ForSplAbi, provider);
}

export async function deployErc20ForSplWrapper(contractAddress: string, proxyUrl: string, tokenMint: string): Promise<string | null> {
  const provider = new JsonRpcProvider(proxyUrl);
  const contract = erc20ForSPLFactoryContract(contractAddress, provider);
  const wallet = walletSigner(provider, NEON_PRIVATE);
  const hexAddr = base58ToHex(tokenMint);

  const contractWithSigner = contract.connect(wallet);

  //Check if ERC20 wrapper already exists
  let ecr20Address = await contract.getErc20ForSpl(hexAddr);

  if (nonZeroAddress(ecr20Address)) {
    return ecr20Address;
  }

  // @ts-ignore
  const tx = await contractWithSigner.createErc20ForSpl(hexAddr);
  console.log(`Transaction hash: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

  //Get erc20 wrapper Address
  ecr20Address = await contract.getErc20ForSpl(hexAddr);
  return nonZeroAddress(ecr20Address) ? ecr20Address : null;
}

function nonZeroAddress(address: string): boolean {
  return address !== zeroAddress;
}
