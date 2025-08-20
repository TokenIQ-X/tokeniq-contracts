// Simple deployment script for TestToken
const hre = require("hardhat");

async function main() {
  console.log("Starting deployment...");
  
  // Get the contract to deploy
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  console.log("Deploying TestToken...");
  
  // Deploy the contract
  const testToken = await TestToken.deploy();
  
  // Wait for deployment to complete
  const tx = await testToken.deployTransaction.wait();
  
  console.log(`TestToken deployed to: ${testToken.address}`);
  console.log(`Transaction hash: ${tx.transactionHash}`);
  
  // Save the deployment address
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, './deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentPath = path.join(deploymentsDir, 'deployment.json');
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify({
      testToken: testToken.address,
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
