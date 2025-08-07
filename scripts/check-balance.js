// Script to check account balance and gas price on Core Testnet
// npx hardhat run --network coreTestnet2 scripts/check-balance.js

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Account:", deployer.address);
  
  // Get balance in wei
  const balanceWei = await ethers.provider.getBalance(deployer.address);
  console.log("Balance (wei):", balanceWei.toString());
  
  // Convert to CORE (18 decimals)
  const balanceCore = ethers.formatEther(balanceWei);
  console.log("Balance (CORE):", balanceCore);
  
  // Get gas price
  const gasPrice = await ethers.provider.getFeeData();
  console.log("Gas price (wei):", gasPrice.gasPrice?.toString() || "N/A");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
