import { SPLToken } from '@neonevm/token-transfer-core';
import { transferNeonToNeon, transferNeonToSolana } from './neon';
import { transferERC20TokenToSolana, transferSPLTokenToNeonEvm } from './erc20';
import { delay } from './utils';

const tokensData = require('token-list/tokenlist.json');

const chainId = parseInt(`0xe9ac0ce`);
const supportedTokens = ['USDT', 'USDC'];
const tokens = (tokensData?.tokens as SPLToken[] ?? []).filter(t => t.chainId === chainId).filter(t => supportedTokens.includes(t.symbol));

(async function main() {
  await transferNeonToSolana(0.1);
  await delay(10);
  await transferNeonToNeon(0.1);
  await delay(10);

  for (const token of tokens) {
    await transferERC20TokenToSolana(token, 0.1);
    await delay(10);
    await transferSPLTokenToNeonEvm(token, 0.1);
    await delay(10);
  }
})();
