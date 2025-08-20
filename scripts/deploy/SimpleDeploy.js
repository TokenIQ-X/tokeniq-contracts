const hre = require("hardhat");

async function main() {
  console.log("Deploying TestToken...");
  
  // Get the contract factory
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  
  // Deploy the contract
  const testToken = await TestToken.deploy();
  
  // Wait for deployment
  await testToken.waitForDeployment();
  
  console.log("TestToken deployed to:", testToken.address);
  
  // Save the address to a file
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '../../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentPath = path.join(deploymentsDir, 'sei_testnet.json');
  const deployments = fs.existsSync(deploymentPath) 
    ? JSON.parse(fs.readFileSync(deploymentPath))
    : {};
  
  deployments.testToken = testToken.address;
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
  console.log("Deployment info saved to:", deploymentPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
