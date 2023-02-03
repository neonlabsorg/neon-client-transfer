import { SPLToken } from '../../../models';
import { ChainId } from '../models';
import { post } from './crud';

const tokenList = require('token-list/tokenlist.json');

const FAUCET_URL = `https://api.neonfaucet.org`;
const TOKEN_LIST = `https://raw.githubusercontent.com/neonlabsorg/token-list/v1.0.0/tokenlist.json`;

export class FaucetDropper {
  public tokens: SPLToken[] = [];
  public supportedTokens: SPLToken[] = [];
  private _tokens: string[] = ['USDT', 'USDC'];
  private chainId: ChainId['id'];

  constructor(chainId: ChainId['id']) {
    this.chainId = chainId;
    this.tokens = (tokenList?.tokens as SPLToken[] ?? []).filter(t => t.chainId === this.chainId);
    this.supportedTokens = this.tokens.filter(t => this._tokens.includes(t.symbol));
  }

  async requestERC20(wallet: string, { address_spl }: SPLToken, amount: number): Promise<any> {
    return post(`${FAUCET_URL}/request_erc20`, { amount, wallet, address_spl });
  }

  async requestNeon(wallet: string, amount: number): Promise<any> {
    try {
      return await post(`${FAUCET_URL}/request_neon`, { amount, wallet });
    } catch (e) {
      return 0;
    }
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
