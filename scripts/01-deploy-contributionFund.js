// scripts/deploy-verify.js

require('dotenv').config();
const hre = require('hardhat');
const { verify } = require('./utils/verify');
const { developmentChains } = require('../helper-hardhat-config');

const USDT_ADDRESS = process.env.USDT_ADDRESS || "";
const listTreasury = JSON.parse(process.env.LIST_TREASURY) || [];

async function main() {
  // --- Deploy SCF37ContributionFund on BNB Mainnet ---
  console.log('--- Deploying SCF37ContributionFund on BNB Mainnet ---');
  const fundNetwork = 'bscMainnet';
  const fundProvider = new hre.ethers.JsonRpcProvider(hre.config.networks[fundNetwork].url);
  const fundWallet = new hre.ethers.Wallet(process.env.PRIVATE_KEY, fundProvider);

  if (!listTreasury || !USDT_ADDRESS) {
    throw new Error('Please set LIST_TREASURY and USDT_ADDRESS in your .env file.');
  }

  const FundFactory = await hre.ethers.getContractFactory('SCF37ContributionFund', fundWallet);
  const fundContract = await FundFactory.deploy(listTreasury, USDT_ADDRESS);
  await fundContract.waitForDeployment();
  const fundAddress = await fundContract.getAddress();
  console.log(`SCF37ContributionFund deployed at: ${fundAddress}`);

  if (!developmentChains.includes(hre.network.name)) {
    console.log("Wait before verifying");
    await verify(fundAddress, [listTreasury, USDT_ADDRESS]);
  }

  console.log('\n--- Deployment and verification completed! ---');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
