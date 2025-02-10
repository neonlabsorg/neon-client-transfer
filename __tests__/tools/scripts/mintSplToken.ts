import { SPLToken } from '@neonevm/token-transfer-core';
import {
  generateSigner,
  percentAmount,
  PublicKey
} from '@metaplex-foundation/umi';
import { createAndMint, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine';
import bs58 from 'bs58';
import { setupUmiClient } from './utils/setupClient';

export async function mintSplToken(token: SPLToken, amount = 1e6, uri = ''): Promise<PublicKey | null> {
  const { umi, wallet } = setupUmiClient();

  //Create a new Mint PDA
  const mint = generateSigner(umi);
  umi.use(mplCandyMachine());

  //Send a transaction to deploy the Mint PDA and mint 1 million of our tokens
  try {
    const response = await (createAndMint(umi, {
      mint,
      authority: umi.identity,
      name: token.name,
      symbol: token.symbol,
      uri: uri || `{image: ${token.logoURI}}`,
      sellerFeeBasisPoints: percentAmount(0),
      decimals: token.decimals,
      amount: amount * (10 ** token.decimals),
      tokenOwner: wallet.publicKey,
      tokenStandard: TokenStandard.Fungible
    }).sendAndConfirm(umi));
    const { signature: signatureBytes } = response;
    const signature = bs58.encode(signatureBytes);
    console.log(`${token.name} Mint signature: ${signature}`);
    console.log(`Successfully minted ${amount}.${(10 ** token.decimals).toString().slice(1)} tokens: (${mint.publicKey})`);
    return mint.publicKey;
  } catch (err) {
    console.error(err);
    return null;
  }
}

