// Deployment script for ERC20VaultToken on Sei Testnet
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying ERC20VaultToken with account:", deployer.address);
  
  // We need to deploy the underlying asset first (WBTC)
  console.log("Deploying WBTC token...");
  const WBTC = await hre.ethers.getContractFactory("WBTC");
  const wbtc = await WBTC.deploy();
  await wbtc.waitForDeployment();
  const wbtcAddress = await wbtc.getAddress();
  console.log("WBTC deployed to:", wbtcAddress);
  
  // Now deploy the ERC20VaultToken with WBTC as the underlying asset
  console.log("Deploying ERC20VaultToken...");
  const ERC20VaultToken = await hre.ethers.getContractFactory("ERC20VaultToken");
  
  // Define the fee configuration
  const feeConfig = {
    depositFeeBasisPoints: 10,      // 0.1%
    withdrawalFeeBasisPoints: 10,   // 0.1%
    performanceFeeBasisPoints: 2000 // 20%
  };
  
  // Deploy the contract
  const erc20VaultToken = await ERC20VaultToken.deploy(
    "WBTC Vault Token",
    "vWBTC",
    wbtc.address,  // WBTC as the underlying asset
    feeConfig,     // Fee configuration
    deployer.address  // Owner of the vault
  );
  
  console.log("Transaction hash:", erc20VaultToken.deployTransaction.hash);
  console.log("Waiting for deployment confirmation...");
  
  await erc20VaultToken.deployed();
  console.log("ERC20VaultToken deployed to:", erc20VaultToken.address);
  
  // Save deployment info
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '../../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentPath = path.join(deploymentsDir, 'erc20-vault-token-sei.json');
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify({
      network: 'seitestnet',
      wbtcAddress: wbtcAddress,
      vaultTokenAddress: erc20VaultToken.address,
      deployer: deployer.address,
      timestamp: new Date().toISOString()
    }, null, 2)
  );
  
  console.log("Deployment info saved to:", deploymentPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
