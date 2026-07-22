# ZyncSwap Smart Contracts

This repository contains the ZYNC token smart contracts, Hardhat tests, and deploy scripts for the assessment.

The contract work lives under `contracts/`. The frontend is included for local testing, but the main deliverable is the Solidity and Hardhat work.

## What Is Included

- `ZyncToken.sol`
- `ZyncVesting.sol`
- Hardhat tests for token and vesting behavior
- Deploy scripts for token and vesting

## Requirements

- Node.js 18 or newer
- npm

## Install

From the repo root:

```powershell
npm install
```

## Run The Contract Checks

Compile the Solidity contracts:

```powershell
npm run compile
```

Run the full contract test suite:

```powershell
npm run test:contracts
```

Expected result:

- Solidity compiles successfully
- All tests pass

## Local Chain And Deploy

Start a local Hardhat chain in one terminal:

```powershell
npm run chain
```

Deploy the ZYNC token in another terminal:

```powershell
npm run deploy
```

The deploy script prints the token address. On Hardhat localhost this is usually:

```text
0x5fbdb2315678afecb367f032d93f642f64180aa3
```

## Deploy Vesting

Set the token address for the current PowerShell session:

```powershell
$env:ZYNC_TOKEN_ADDRESS="0x5fbdb2315678afecb367f032d93f642f64180aa3"
```

Optional: fund the vesting contract during deploy:

```powershell
$env:INITIAL_FUNDING_WEI="100000000000000000000"
```

Then deploy vesting:

```powershell
npm run deploy:vesting
```

## Run The Frontend

If you want to start the local UI:

```powershell
npm run dev
```

If the app expects a token address, set `ZYNC_TOKEN_ADDRESS` first in `.env` or in the terminal session.

## Environment Variables

Typical local `.env` values:

```env
CHAIN_ID=31337
RPC_URL=http://127.0.0.1:8545
ZYNC_TOKEN_ADDRESS=0x5fbdb2315678afecb367f032d93f642f64180aa3
PORT=3000
```

Optional vesting deploy variable:

```env
INITIAL_FUNDING_WEI=100000000000000000000
```

## What The Tests Cover

### ZyncToken

- Public ETH minting
- Excess ETH refund behavior
- Zero mint price validation
- Mint price update events
- Treasury mint events
- ETH withdrawal events
- `burn`
- `burnFrom`
- Balance and allowance failure cases
- `MAX_SUPPLY` behavior after burns

### ZyncVesting

- Funding the vesting contract
- Creating schedules
- Linear release after the cliff
- Preventing double claims
- Rejecting schedules without enough funding

## Generated Caches And Build Output

These folders are safe to delete if the project gets into a bad state:

- `client/.next`
- `contracts/artifacts`
- `contracts/cache`
- `node_modules`

If the frontend gets stuck on a stale build, stop the dev server and remove `client/.next`, then start again:

```powershell
Remove-Item -Recurse -Force .\client\.next
npm run dev
```

## Project Scripts

| Command | Description |
|---|---|
| `npm run compile` | Compile the Solidity contracts |
| `npm run test:contracts` | Compile and run all Hardhat tests |
| `npm run chain` | Start a local Hardhat JSON-RPC node |
| `npm run deploy` | Deploy `ZyncToken` to the local chain |
| `npm run deploy:vesting` | Deploy `ZyncVesting` to the local chain |
| `npm run dev` | Start the frontend |

## Notes

- The Hardhat localhost address for the first deployment is deterministic, which is why the token address is often `0x5fbdb2315678afecb367f032d93f642f64180aa3`.
- `burn` reduces total supply, so burned tokens can be minted again later without breaking the max supply cap.
- `mintPriceWei` must stay above zero.

## How The Tasks Were Completed

### Task 1 - Mint Fix

- Added a zero-price guard so `setMintPrice(0)` cannot brick minting.
- Kept the ETH mint refund path intact using exact token-cost math.
- Added tests for zero-price rejection and refund behavior.

### Task 2 - Token Burn

- Added `burn(uint256 amount)` for token holders.
- Added `burnFrom(address account, uint256 amount)` with allowance checks.
- Emitted a `Burned` event on every burn.
- Verified that burned supply can be minted again without breaking `MAX_SUPPLY`.

### Task 3 - Events And Observability

- Added indexed events for mint price updates, treasury minting, and ETH withdrawals.
- Extended tests to assert emitted event names and arguments.

### Task 4 - Vesting Contract

- Added `ZyncVesting.sol` to accept funding, create vesting schedules, and release vested tokens over time.
- Protected release with `nonReentrant`.
- Added tests for funding, schedule creation, linear release, and failure cases.
- Added a separate deploy script for vesting.

