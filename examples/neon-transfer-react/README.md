# Neon Token Transfer Demo

This code demonstrates how to use [neon-portal](https://github.com/neonlabsorg/neon-client-transfer) package in your project.

You can see [Live Demo](https://gnytck-5173.csb.app/).

Before running rename `.env.example` to `.env`, then add your `Solana` and `MetaMask` wallets private keys:

```dotenv
REACT_APP_NEON_PRIVATE: '<your neon private key>' // Private key from your MM wallet
REACT_APP_SOLANA_PRIVATE: '<your solana private key>' // Private key from your Solana wallet in base58
```

For running install `vendors` and run `dev-server`:

```bash
yarn install
yarn start
```

For building run command:

```bash
yarn build
```
