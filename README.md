# Carbon Credit Phrase 1 - Smart Contract Suite

## Overview

This project contains a suite of smart contracts for managing contributions and tracking user participation in a blockchain-based system. The main contracts include:
- **SCF37ContributionFund**: Manages user contributions in USDT tokens, supports multiple treasury wallets, enforces contribution limits, and provides role-based access control.
- **SCF37ContributionTracker**: Tracks and manages the history and totals of user contributions, with support for admin updates and auditability.
- **BEP20USDT (Mock Token)**: A mock implementation of the USDT token (BEP20 standard) for testing and development purposes.

The project uses [Hardhat](https://hardhat.org/) for development, testing, and deployment, and leverages [OpenZeppelin](https://openzeppelin.com/contracts/) for secure contract patterns.

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) or [yarn]
- [Git](https://git-scm.com/)

---

## Getting Started

### 1. Clone the Repository
```bash
cd carbon-credit-phrase-1
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Variables
Create a `.env` file in the project root with the following variables:
```ini
INFURA_KEY=your_infura_project_id
PRIVATE_KEY=your_private_key
USDT_ADDRESS=usdt_contract_address
LIST_TREASURY='["0xTreasury1", "0xTreasury2", "..."]'
ETHERSCAN_API_KEY=your_etherscan_or_bscscan_api_key
```
- `INFURA_KEY`: Required for contract verification.
- `PRIVATE_KEY`: The deployer's private key.
- `USDT_ADDRESS`: Address of the USDT token contract on chain.
- `LIST_TREASURY`: JSON array of treasury wallet addresses for the fund contract.
- `ETHERSCAN_API_KEY`: API key for contract verification on Etherscan, BscScan, or other block explorer services. You can obtain this key by registering at [Etherscan](https://etherscan.io/myapikey). Required for verifying contracts after deployment.

---

## Project Structure

**Project Structure (Updated):**

- `contracts/` - Contains all Solidity smart contracts
  - `SCF37ContributionFund.sol` - Main contract for managing user contributions, treasury wallets, and fund logic
  - `SCF37ContributionTracker.sol` - Contract for tracking and recording user contribution history and totals
  - `mock-token/USDT.sol` - Mock BEP20 USDT token for local testing and development
  - `interfaces/IBEP20.sol` - Interface for BEP20 token standard
- `scripts/` - Deployment and utility scripts
  - `01-deploy-contributionFund.js` - Script to deploy and verify SCF37ContributionFund
  - `02-deploy-contributionTracker.js` - Script to deploy and verify SCF37ContributionTracker
  - `utils/verify.js` - Helper for contract verification
- `ignition/modules/` - Hardhat Ignition deployment modules for automated deployments
- `test/` - JavaScript test files for smart contract unit and integration testing
- `helper-hardhat-config.js` - Helper configuration for Hardhat networks and settings
- `hardhat.config.js` - Main Hardhat configuration file
- `.env` - Environment variables for deployment and verification (not committed to source control)
- `README.md` - Project documentation

---

## Compile Contracts

```bash
npx hardhat compile
```

---

## Run Tests

```bash
npx hardhat test
```

---

## Official Deployment Process

### SCF37ContributionFund
- **Deploy and verify on BNB Mainnet**
- Make sure your `.env` is configured with the correct `PRIVATE_KEY`, `USDT_ADDRESS` (on BNB Mainnet), and `LIST_TREASURY`.

#### Deploy on BNB Mainnet
```bash
npx hardhat ignition deploy ignition/modules/SCF37ContributionFund.js --network bscMainnet
```

#### Verify on BNB Mainnet
```bash
npx hardhat verify --network bscMainnet <contract_address> <constructor_args>
```

### SCF37ContributionTracker
- **Deploy and verify on PioneChain**
- Make sure your `.env` is configured with the correct `PRIVATE_KEY` for PioneChain.

#### Deploy on PioneChain
```bash
npx hardhat ignition deploy ignition/modules/SCF37ContributionTracker.js --network pione
```

#### Verify on PioneChain
```bash
npx hardhat verify --network pione <contract_address>
```

---

## Testnet/Local Deployment (for development only)

You can still use Sepolia, BSC Testnet, or Hardhat local node for development and testing:

- Update the `network` parameter in the commands above to `sepolia`, `bscTestnet`, or `localhost` as needed.
- Deploy the mock USDT token if required:
  ```bash
  npx hardhat ignition deploy ignition/modules/USDT.js --network <network>
  ```

---

## Quick Deployment with Provided Scripts

You can quickly deploy both contracts using the provided scripts for each network. This is the fastest way to get started with deployment:

```bash
npx hardhat run scripts/01-deploy-contributionFund.js --network bscMainnet
npx hardhat run scripts/02-deploy-contributionTracker.js --network pione
```

- The first command deploys the SCF37ContributionFund contract to the BNB Mainnet.
- The second command deploys the SCF37ContributionTracker contract to the PioneChain network.

> **Note:**
> - Make sure your `.env` and Hardhat config are set up for the correct networks and accounts.
> - You can adjust the `--network` parameter to deploy to other supported networks as needed.

---

## Notes
- Always use test accounts and networks for development.
- Never commit your private keys or sensitive information.
- For custom deployment parameters, edit the corresponding module in `ignition/modules/`.
- For more details, see the comments in each contract and test file.

---