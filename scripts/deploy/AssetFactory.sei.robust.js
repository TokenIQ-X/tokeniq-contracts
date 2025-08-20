// Enhanced deployment script with retry logic and better error handling
const { ethers } = require("hardhat");

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper for contract deployments
async function withRetry(contractFactory, args = [], options = {}, retries = MAX_RETRIES) {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempt ${i + 1} of ${retries}`);
      const contract = await contractFactory.deploy(...args, {
        ...options,
        gasPrice: ethers.utils.parseUnits('2', 'gwei'),
        gasLimit: 6000000
      });
      
      console.log(`Transaction hash: ${contract.deployTransaction.hash}`);
      console.log('Waiting for deployment confirmation...');
      
      const receipt = await contract.deployTransaction.wait();
      console.log(`Deployment successful in block ${receipt.blockNumber}`);
      
      return contract;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${i + 1} failed:`, error.message);
      
      if (i < retries - 1) {
        console.log(`Retrying in ${RETRY_DELAY/1000} seconds...`);
        await delay(RETRY_DELAY);
      }
    }
  }
  
  throw new Error(`All ${retries} deployment attempts failed. Last error: ${lastError.message}`);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance (wei):", balance.toString());
  
  try {
    // Deploy ERC20VaultToken template
    console.log("Deploying ERC20VaultToken template...");
    const ERC20VaultToken = await ethers.getContractFactory("ERC20VaultToken");
    const erc20VaultToken = await withRetry(
      ERC20VaultToken,
      [
        "ERC20 Vault Token",
        "EVT",
        deployer.address,
        deployer.address
      ],
      { gasLimit: 5000000 }
    );
    
    console.log("ERC20VaultToken template deployed to:", erc20VaultToken.address);
    
    // Continue with other deployments...
    // [Rest of your deployment logic]
    
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
