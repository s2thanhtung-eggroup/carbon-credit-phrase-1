// scripts/deploy-verify.js

require('dotenv').config();
const hre = require('hardhat');
const { verify } = require('./utils/verify');
const { developmentChains } = require('../helper-hardhat-config');

async function main() {

  // --- Deploy SCF37ContributionTracker on PioneChain ---
  console.log('--- Deploying SCF37ContributionTracker on PioneChain ---');
  const trackerNetwork = 'pione';
  const trackerProvider = new hre.ethers.JsonRpcProvider(hre.config.networks[trackerNetwork].url);
  const trackerWallet = new hre.ethers.Wallet(process.env.PRIVATE_KEY, trackerProvider);

  const TrackerFactory = await hre.ethers.getContractFactory('SCF37ContributionTracker', trackerWallet);
  const trackerContract = await TrackerFactory.deploy();
  await trackerContract.waitForDeployment();
  const trackerAddress = await trackerContract.getAddress();
  console.log(`SCF37ContributionTracker deployed at: ${trackerAddress}`);

  if (!developmentChains.includes(hre.network.name)) {
    console.log("Wait before verifying");
    await verify(trackerAddress, []);
  }

  console.log('\n--- Deployment and verification completed! ---');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
