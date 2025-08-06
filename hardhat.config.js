require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require('dotenv').config();

const INFURA_KEY = process.env.INFURA_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

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
      url: `https://sepolia.infura.io/v3/${INFURA_KEY}`, //
      chainId: 11155111,
      accounts: [PRIVATE_KEY], 
    },
    bscTestnet: {
      url: `https://bsc-testnet.infura.io/v3/${INFURA_KEY}`, //
      accounts: [PRIVATE_KEY], 
      chainId: 97,
    },
    pionezero: {
      url: "https://rpc.zeroscan.org",
      chainId: 5080,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: "B5MVZ3CEJDG6IVHKA8PVPW9TBEVD9M1N6M",
    // apiKey: {
    //   sepolia: "B5MVZ3CEJDG6IVHKA8PVPW9TBEVD9M1N6M",
    //   bscTestnet: "B5MVZ3CEJDG6IVHKA8PVPW9TBEVD9M1N6M",
    //   pionezero: "6TSSEDBBMEQ4KW8HVB9HHBWHZRA3JN7GSN"
    // },
    customChains: [
      {
        network: "pionezero",
        chainId: 5080,
        urls: {
          apiURL: "https://zeroscan.org/api/", // Thay bằng API URL của mạng testnet của bạn
          browserURL: "https://zeroscan.org/", // Thay bằng URL của Etherscan cho mạng testnet của bạn
        },
      }
    ]
  }
};
