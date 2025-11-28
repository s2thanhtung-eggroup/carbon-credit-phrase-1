// local chains
const developmentChains = ["hardhat", "localhost"];

// number of blocks for confirmation
const blockConfirmation = {
  sepolia: 6,
  pione: 6,
  pionezero: 3,
  bscTestnet: 12,
  bscMainnet: 15,
}

module.exports = {
  developmentChains,
  blockConfirmation
}
