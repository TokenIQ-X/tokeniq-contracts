const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploy TestToken with hardcoded gas price
    console.log("Deploying TestToken...");
    const TestToken = await ethers.getContractFactory("TestToken");
    
    // Deploy with hardcoded gas settings
    const token = await TestToken.deploy({
      gasPrice: 1000000000, // 1 Gwei in wei
      gasLimit: 2000000
    });

    console.log("Transaction hash:", token.deployTransaction.hash);
    console.log("Waiting for deployment to complete...");
    
    // Wait for deployment to complete
    const receipt = await token.deployTransaction.wait();
    console.log("Deployed in block:", receipt.blockNumber);
    
    console.log("TestToken deployed to:", token.address);
    
    // Save the deployment information
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
