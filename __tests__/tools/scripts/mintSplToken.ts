import { percentAmount, generateSigner } from '@metaplex-foundation/umi'
import { TokenStandard, createAndMint } from '@metaplex-foundation/mpl-token-metadata'
import { mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { setupUmiClient } from "./utils/setupClient";

export async function mintSplToken(): Promise<any> {
  const {umi, wallet} = setupUmiClient();

  const metadata = {
    name: "$FunGible Token 1",
    symbol: "$FT1",
    uri: "https://ipfs.io/ipfs/QmdCQ63AhRdiHHvBGxkvo5eMmxrweXdkgZEw6ifeq2KEkP"
  };

  //Create a new Mint PDA
  const mint = generateSigner(umi);
  umi.use(mplCandyMachine());

  //Send a transaction to deploy the Mint PDA and mint 1 million of our tokens
  try {
    const response = await (createAndMint(umi, {
      mint,
      authority: umi.identity,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: percentAmount(0),
      decimals: 9,
      amount: 1000000_000000000,
      tokenOwner: wallet.publicKey,
      tokenStandard: TokenStandard.Fungible,
    }).sendAndConfirm(umi));
    console.log("Successfully minted 1 million tokens (", mint.publicKey, ")");
    return mint.publicKey;
  } catch (err) {
    console.error(err);
    return null;
  }
}

