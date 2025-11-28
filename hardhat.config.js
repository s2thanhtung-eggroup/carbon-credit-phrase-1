require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require('dotenv').config();

const INFURA_KEY = process.env.INFURA_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      }, 
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      }
    ]
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
      chainId: 11155111,
      accounts: [PRIVATE_KEY], 
    },
    bscTestnet: {
      url: `https://bsc-testnet.infura.io/v3/${INFURA_KEY}`,
      accounts: [PRIVATE_KEY], 
      chainId: 97,
    },
    bscMainnet: {
      url: `https://bsc-mainnet.infura.io/v3/${INFURA_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 56,
    },
    pione: {
      url: "https://rpc.pionescan.com",
      chainId: 5090,
      accounts: [PRIVATE_KEY],
    },
    pioneZero: {
      url: "https://rpc.zeroscan.org",
      chainId: 5080,
      accounts: [PRIVATE_KEY],
    },
  },
  sourcify: {
    enabled: true
  },
  etherscan: {
    apiKey: {
      bscMainnet: ETHERSCAN_API_KEY,
      pione: ETHERSCAN_API_KEY,
      pioneZero: ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "pione",
        chainId: 5090,
        urls: {
          apiURL: "https://pionescan.com/api/",
          browserURL: "https://pionescan.com/",
        },
      },
      {
        network: "pioneZero",
        chainId: 5080,
        urls: {
          apiURL: "https://zeroscan.org/api/",
          browserURL: "https://zeroscan.org/"
        }
      }
    ]
  }
};
