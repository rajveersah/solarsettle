# SolarSettle Free Deployment

This repo deploys in two parts:

1. Smart contract on a free testnet, recommended here: MST Testnet.
2. React frontend on Vercel free hosting.

## 1. Prepare Wallet

Create or use a testnet-only MetaMask wallet. Do not use a wallet holding real funds.

Add MST Testnet in MetaMask:

- Network name: `MST Testnet`
- RPC URL: `https://testnetrpc.mstblockchain.com`
- Chain ID: `91562037`
- Currency symbol: `MST`

Get free testnet MST from the MST faucet if the network requires gas.

## 2. Install Dependencies

From the repo root:

```bash
npm install
cd frontend
npm install
cd ..
```

## 3. Configure Contract Deployment

Create a root `.env` file:

```bash
PRIVATE_KEY=0xYOUR_TESTNET_PRIVATE_KEY
```

Use a fresh testnet wallet private key. Never commit `.env`.

## 4. Deploy Contract

Deploy to MST Testnet:

```bash
npm run deploy:mst
```

The deploy script automatically updates:

- `frontend/src/SolarSettleABI.json`
- `frontend/src/deployedAddress.json`
- `frontend/.env.production`

Copy the deployed contract address printed in the terminal.

## 5. Test Production Build Locally

```bash
cd frontend
npm run build
```

## 6A. Deploy Frontend on Render

1. Push this repo to GitHub.
2. Go to Render and create a new **Blueprint** from the GitHub repo.
3. Render will read `render.yaml` automatically.
4. When Render asks for environment variables, set:

```bash
REACT_APP_MST_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

5. Deploy.

The `render.yaml` file builds from `frontend/`, publishes `frontend/build`, and rewrites all routes to `index.html` so `/govt`, `/buyer`, and `/prosumer` work after refresh.

### Render Manual Static Site Setup

If you do not use Blueprint, create a new **Static Site** manually:

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `build`
- Environment variable:

```bash
REACT_APP_MST_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

Add this rewrite rule in Render:

- Source: `/*`
- Destination: `/index.html`
- Action: `Rewrite`

## 6B. Deploy Frontend on Vercel

1. Push this repo to GitHub.
2. Go to Vercel and create a new project from the GitHub repo.
3. Keep the project root as the repository root.
4. Vercel will use `vercel.json`:
   - Install command: `cd frontend && npm install`
   - Build command: `cd frontend && npm run build`
   - Output directory: `frontend/build`
5. Add this environment variable in Vercel Project Settings:

```bash
REACT_APP_MST_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

6. Deploy.

## 7. Use the Live App

Open the deployed Vercel URL.

In MetaMask:

1. Select MST Testnet.
2. Use the same deployer wallet for Government actions.
3. Use another wallet for Buyer or Prosumer actions.

Real MetaMask transactions:

- Prosumer registration: `registerProsumer`
- Government approval: `approveProsumer`
- Prosumer meter log: `logEnergyGeneration`
- Prosumer listing: `listEnergy`
- Buyer purchase: `buyEnergy`
- Seller cancellation: `cancelListing`
- Government inactivity enforcement: `checkInactivity`

## Troubleshooting

- If MetaMask does not open, check that the browser has the MetaMask extension enabled.
- If MetaMask opens but rejects before confirmation, the action may be invalid for the current wallet. For example, only approved prosumers can log or list energy.
- If reads work but writes fail, confirm MetaMask is on MST Testnet and the contract address matches `REACT_APP_MST_CONTRACT_ADDRESS`.
- If a direct route such as `/govt` shows a 404 after refresh, confirm Vercel is using the root `vercel.json` rewrites.
