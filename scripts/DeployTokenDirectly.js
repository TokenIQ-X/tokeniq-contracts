// Direct deployment script for TestToken
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log("Deploying TestToken...");
  
  // Get the contract factory
  const SimpleToken = await ethers.getContractFactory("SimpleToken");
  
  // Deploy with specific gas settings
  const gasPrice = ethers.utils.parseUnits('2', 'gwei');
  const gasLimit = 5000000;
  
  console.log("Deploying with gas price:", gasPrice.toString());
  
  // Deploy the contract
  const simpleToken = await SimpleToken.deploy({
    gasPrice: gasPrice,
    gasLimit: gasLimit
  });
  
  console.log("Waiting for deployment transaction...");
  
  // Wait for the deployment transaction to be mined
  const receipt = await simpleToken.deployTransaction.wait();
  
  console.log(`SimpleToken deployed to: ${simpleToken.address}`);
  console.log(`Transaction hash: ${receipt.transactionHash}`);
  console.log(`Gas used: ${receipt.gasUsed.toString()}`);
  
  // Save deployment info
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentPath = path.join(deploymentsDir, 'simple-token-deployment.json');
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify({
      address: simpleToken.address,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      network: hre.network.name,
      timestamp: new Date().toISOString()
    }, null, 2)
  );
  
  console.log(`Deployment info saved to: ${deploymentPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
