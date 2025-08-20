const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying TestToken...");
  
  // Get the contract factory
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  
  // Deploy the contract with a higher gas limit
  const testToken = await TestToken.deploy({ 
    gasLimit: 5000000 
  });
  
  console.log("Waiting for deployment...");
  
  // Wait for the deployment to complete
  await testToken.deployTransaction.wait();
  
  console.log("TestToken deployed to:", testToken.address);
  
  // Save the deployment address
  const deploymentsPath = path.join(__dirname, "../../deployments/sei_testnet.json");
  let deployments = {};
  
  if (fs.existsSync(deploymentsPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsPath));
  }
  
  deployments.testToken = testToken.address;
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("Deployment info saved to:", deploymentsPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
