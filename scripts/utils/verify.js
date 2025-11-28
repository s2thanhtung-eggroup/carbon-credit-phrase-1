// scripts/utils/verify.js
const { run } = require('hardhat');

async function verify(contractAddress, args, contractName) {
  console.log('Verifying contract...');
  try {
    await run('verify:verify', {
      address: contractAddress,
      constructorArguments: args,
      contract: contractName,
    });
  } catch (e) {
    if (e.message && e.message.toLowerCase().includes('already verified')) {
      console.log('Already verified!');
    } else {
      console.log(e);
    }
  }
}

module.exports = { verify };