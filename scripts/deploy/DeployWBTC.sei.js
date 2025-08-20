const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Ensure deployments directory exists
  const deploymentsDir = path.join(__dirname, '../../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Deploy WBTC Mock Token
  console.log("Deploying WBTC Mock Token...");
  const MockWBTC = await ethers.getContractFactory("contracts/mocks/MockWBTC.sol:MockWBTC");
  const wbtc = await MockWBTC.deploy();
  console.log("Waiting for deployment transaction to be mined...");
  await wbtc.deployed();
  
  console.log("WBTC Mock Token deployed to:", wbtc.address);
  console.log("Deployment transaction hash:", wbtc.deployTransaction.hash);
  
  // Check balance (1M should be minted in constructor to deployer)
  const balance = await wbtc.balanceOf(deployer.address);
  console.log(`Deployer WBTC balance: ${ethers.utils.formatEther(balance)} mWBTC`);
  
  // Save the address to a file for easy reference
  const deploymentPath = path.join(deploymentsDir, 'sei_testnet.json');
  let deployments = {};
  
  if (fs.existsSync(deploymentPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentPath));
  }
  
  deployments.wbtc = wbtc.address;
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
  console.log("Deployment info saved to:", deploymentPath);
  
  return wbtc.address;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
