require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_API_KEY = process.env.INFURA_API_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

module.exports = {
  networks: {
    coreTestnet2: {
      url: "https://rpc.test2.btcs.network",
      accounts: [PRIVATE_KEY],
      chainId: 1114
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 11155111
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [PRIVATE_KEY],
      chainId: 43113
    },
    arbitrumSepolia: {
      url: `https://arb-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 421614
    },
    baseSepolia: {
      url: `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 84532
    }
  },

  etherscan: {
    apiKey: {
      coreTestnet2: process.env.BTCS_API_KEY,
      sepolia: ETHERSCAN_API_KEY,
      fuji: process.env.SNOWTRACE_API_KEY,
      arbitrumSepolia: process.env.ARBISCAN_API_KEY,
      baseSepolia: process.env.BASESCAN_API_KEY
    },
    customChains: [
      {
        network: "coreTestnet2",
        chainId: 1114,
        urls: {
          apiURL: "https://api.test2.btcs.network/api",
          browserURL: "https://scan.test2.btcs.network"
        }
      },
      {
        network: "fuji",
        chainId: 43113,
        urls: {
          apiURL: "https://api-testnet.snowtrace.io/api",
          browserURL: "https://testnet.snowtrace.io"
        }
      },
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io"
        }
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  },

  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },

  mocha: {
    timeout: 40000
  }
};


// /** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//   // Etherscan verification configuration
//   etherscan: {
//     customChains: [
//       {
//         network: "coreTestnet2",
//         chainId: 1114,
//         urls: {
//           apiURL: "https://scan.test2.btcs.network/api",
//           browserURL: "https://scan.test2.btcs.network"
//         }
//       }
//     ],
//     apiKey: {
//       coreTestnet2: process.env.BTCS_API_KEY || "dummy-api-key"
//     }
//   },
  
//   // Add network configuration for hardhat-verify
//   networks: {
//     coreTestnet2: {
//       url: "https://rpc.test2.btcs.network",
//       chainId: 1114,
//       accounts: [PRIVATE_KEY]
//     }
//   },
  
//   solidity: {
//     version: "0.8.27",
//     settings: {
//       optimizer: {
//         enabled: true,
//         runs: 200
//       }
//     }
//   },
//   networks: {
//     // Core Testnet 2
//     coreTestnet2: {
//       url: "https://rpc.test2.btcs.network",
//       accounts: [PRIVATE_KEY],
//       chainId: 1114,
//       verify: {
//         etherscan: {
//           apiKey: process.env.BTCS_API_KEY || "dummy-api-key", // API key for Core Testnet
//           apiUrl: "https://scan.test2.btcs.network/api"
//         }
//       }
//     },
//     // Ethereum Sepolia
//     sepolia: {
//       url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
//       accounts: [PRIVATE_KEY],
//       chainId: 11155111,
//       verify: {
//         etherscan: {
//           apiKey: ETHERSCAN_API_KEY
//         }
//       }
//     },
//     // Avalanche Fuji
//     // npx hardhat verify <contract address> <arguments> --network <network>
//     fuji: {
//       url: "https://api.avax-test.network/ext/bc/C/rpc",
//       accounts: [PRIVATE_KEY],
//       chainId: 43113,
//       verify: {
        
//       }
//     },
//     // Arbitrum Sepolia
//     arbitrumSepolia: {
//       url: `https://arb-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
//       accounts: [PRIVATE_KEY],
//       chainId: 421614,
//       verify: {
//         etherscan: {
//           apiKey: process.env.ARBISCAN_API_KEY
//         }
//       }
//     },
//     // Base Sepolia
//     baseSepolia: {
//       url: `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
//       accounts: [PRIVATE_KEY],
//       chainId: 84532,
//       verify: {
//         etherscan: {
//           apiKey: process.env.BASESCAN_API_KEY
//         }
//       }
//     }
//   },
//   etherscan: {
//     apiKey: {
//       sepolia: ETHERSCAN_API_KEY,
//       fuji: process.env.SNOWTRACE_API_KEY,
//       arbitrumSepolia: process.env.ARBISCAN_API_KEY,
//       baseSepolia: process.env.BASESCAN_API_KEY
//     },
//     customChains: [
//       {
//         network: "fuji",
//         chainId: 43113,
//         urls: {
//           apiURL: "https://api-testnet.snowtrace.io/api",
//           browserURL: "https://testnet.snowtrace.io"
//         }
//       },
//       {
//         network: "arbitrumSepolia",
//         chainId: 421614,
//         urls: {
//           apiURL: "https://api-sepolia.arbiscan.io/api",
//           browserURL: "https://sepolia.arbiscan.io"
//         }
//       },
//       {
//         network: "baseSepolia",
//         chainId: 84532,
//         urls: {
//           apiURL: "https://api-sepolia.basescan.org/api",
//           browserURL: "https://sepolia.basescan.org"
//         }
//       }
//     ]
//   },
//   paths: {
//     sources: "./contracts",
//     tests: "./test",
//     cache: "./cache",
//     artifacts: "./artifacts"
//   },
//   mocha: {
//     timeout: 40000
//   }
// };
