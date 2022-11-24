import { SPLToken } from '../../../models';
import { ChainId } from '../models';
import { post } from './crud';

const tokenList = require('token-list/tokenlist.json');

const FAUCET_URL = `https://api.neonfaucet.org`;
const TOKEN_LIST = `https://raw.githubusercontent.com/neonlabsorg/token-list/v1.0.0/tokenlist.json`;

export class FaucetDropper {
  public tokens: SPLToken[] = [];
  private chainId: ChainId['id'];

  constructor(chainId: ChainId['id']) {
    this.chainId = chainId;
    this.tokens = (tokenList?.tokens as SPLToken[] ?? []).filter(t => t.chainId === this.chainId);
  }

  async requestERC20(amount: number, wallet: string, { address_spl }: SPLToken): Promise<any> {
    const data = post(`${FAUCET_URL}/request_erc20`, { amount, wallet, address_spl });
    console.log(data);
    return data;
  }

  async requestNeon(amount: number, wallet: string): Promise<any> {
    const data = await post(`${FAUCET_URL}/request_neon`, { amount, wallet });
    console.log(data);
    return data;
  }

  async tokenList(): Promise<SPLToken[]> {
    try {
      const data = await fetch(TOKEN_LIST).then(d => d.json());
      return data?.tokens ?? [];
    } catch (e) {
      console.log(e);
    }
    return [];
  }
}
