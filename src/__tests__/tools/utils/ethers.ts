import {SPLToken} from "../../../models";
import {erc20Abi} from "../../../data";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Contract } from "@ethersproject/contracts";

export async function getTokenBalance(provider: JsonRpcProvider, account: string, token: SPLToken, contractAbi: any = erc20Abi): Promise<number> {
  const tokenInstance = new Contract(token.address, contractAbi, provider);
  const balance = await tokenInstance.balanceOf(account);
  return balance.toNumber() / Math.pow(10, token.decimals);
}
