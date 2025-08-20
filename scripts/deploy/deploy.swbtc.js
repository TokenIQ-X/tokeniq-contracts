// scripts/deploy/deployWBTC.js
// Run with: npx hardhat run --network seiTestnet scripts/deploy/deployWBTC.js

const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment of sWBTC...");

  // Get the contract factory
  const WBTC = await ethers.getContractFactory("WBTC");

  // Deploy contract
  const wbtc = await WBTC.deploy();

  // Wait until deployed
  await wbtc.waitForDeployment();

  console.log(`✅ sWBTC deployed successfully!`);
  console.log(`📍 Contract address: ${wbtc.address}`);
}

// Handle errors properly
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
