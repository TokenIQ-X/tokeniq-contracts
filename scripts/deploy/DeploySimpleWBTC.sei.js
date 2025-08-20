const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    
    // Deploy SimpleWBTC
    console.log("Deploying SimpleWBTC...");
    const SimpleWBTC = await ethers.getContractFactory("SimpleWBTC");
    const deployTx = await SimpleWBTC.getDeployTransaction();
    console.log("Sending deployment transaction...");
    const txResponse = await deployer.sendTransaction({
      ...deployTx,
      gasLimit: 2000000 // Set a higher gas limit if needed
    });
    
    console.log("Waiting for transaction to be mined...");
    const receipt = await txResponse.wait();
    const wbtcAddress = receipt.contractAddress;
    console.log("SimpleWBTC deployed to:", wbtcAddress);
    
    // Get the contract instance
    const wbtc = await ethers.getContractAt("SimpleWBTC", wbtcAddress);
    
    // Save the address to a file
    const deploymentsDir = path.join(__dirname, '../../deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentPath = path.join(deploymentsDir, 'sei_testnet.json');
    const deployments = fs.existsSync(deploymentPath) 
      ? JSON.parse(fs.readFileSync(deploymentPath))
      : {};
    
    deployments.wbtc = wbtc.address;
    fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
    console.log("Deployment info saved to:", deploymentPath);
    
    return wbtc.address;
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

main();
