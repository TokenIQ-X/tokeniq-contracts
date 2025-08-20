const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    
    // Get the current gas price and add a small buffer
    const gasPrice = await ethers.provider.getGasPrice();
    console.log("Current gas price:", ethers.utils.formatUnits(gasPrice, 'gwei'), "gwei");
    
    // Deploy TestToken with explicit gas settings
    console.log("Deploying TestToken...");
    const TestToken = await ethers.getContractFactory("TestToken");
    
    // Deploy with explicit gas settings
    const token = await TestToken.deploy({
      gasLimit: 2000000,
      gasPrice: gasPrice.mul(2) // Use 2x the current gas price to ensure inclusion
    });
    
    console.log("Transaction hash:", token.deployTransaction.hash);
    console.log("Waiting for confirmations...");
    
    // Wait for 1 confirmation
    const receipt = await token.deployTransaction.wait(1);
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    console.log("TestToken deployed to:", token.address);
    
    // Save the address to a file
    const deploymentsDir = path.join(__dirname, '../../deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentPath = path.join(deploymentsDir, 'sei_testnet.json');
    const deployments = fs.existsSync(deploymentPath) 
      ? JSON.parse(fs.readFileSync(deploymentPath))
      : {};
    
    deployments.testToken = token.address;
    fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
    console.log("Deployment info saved to:", deploymentPath);
    
    return token.address;
  } catch (error) {
    console.error("Deployment failed:", error);
    if (error.reason) console.error("Reason:", error.reason);
    if (error.transaction) console.error("Transaction:", error.transaction);
    process.exit(1);
  }
}

main();
