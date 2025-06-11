const hre = require("hardhat");

async function main() {
  console.log("Deploying AaveVault to Sepolia...");

  // Constructor arguments for AaveVault
  const constructorArgs = [
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC token
    "0x16dA4541aD1807f4443d92D26044C1147406EB80", // aUSDC token
    "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951", // Aave Pool
    "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E"  // USDC/USD Price Feed
  ];

  // Deploy AaveVault
  const AaveVault = await hre.ethers.getContractFactory("AaveVault");
  const aaveVault = await AaveVault.deploy(...constructorArgs);
  await aaveVault.waitForDeployment();

  const aaveVaultAddress = await aaveVault.getAddress();
  console.log(`AaveVault deployed to: ${aaveVaultAddress}`);

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

  // Verify the contract
  console.log("Verifying contract on Etherscan...");
  try {
    await hre.run("verify:verify", {
      address: aaveVaultAddress,
      constructorArguments: constructorArgs,
    });
    console.log("Contract verified successfully");
  } catch (error) {
    console.error("Error verifying contract:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 