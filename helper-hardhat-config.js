// local chains
const developmentChains = ["hardhat", "localhost"];

// number of blocks for confirmation
const blockConfirmation = {
  sepolia: 6,
  mumbai: 6,
  etherlink: 2,
  nightly: 2
}

module.exports = {
  developmentChains,
  blockConfirmation
}
