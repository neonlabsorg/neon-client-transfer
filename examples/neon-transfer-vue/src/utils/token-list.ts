import tokenList from '../mocks/token-list.json';
import { CHAIN_ID } from './consts';

import type { SPLToken } from '@neonevm/token-transfer-core';

export const TOKEN_LIST: SPLToken[] = tokenList.tokens.filter((token) => token.chainId === CHAIN_ID) as SPLToken[];