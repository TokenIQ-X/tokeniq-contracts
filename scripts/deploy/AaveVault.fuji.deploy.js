const hre = require("hardhat");

async function main() {
  console.log("Deploying AaveVault to Avalanche Fuji...");

  // Fuji Testnet addresses
  const fujiAddresses = {
    USDC: "0x5425890298aed601595a70AB815c96711a31Bc65",  // Fuji USDC
    aUSDC: "0x4bf77086885FfAEEe27bCBc98c2D109CA55FfE8f",  // Fuji aUSDC
    aavePool: "0x90Bf86247b6d1d6c5E8E083966ED9cf8b978E8c9",  // Fuji Aave Pool
    priceFeed: "0x7898AcCC83587C3C55116c5230C17a193aD8c03F"   // Fuji USDC/USD Price Feed
  };

  // Constructor arguments for AaveVault on Fuji
  const constructorArgs = [
    fujiAddresses.USDC,
    fujiAddresses.aUSDC,
    fujiAddresses.aavePool,
    fujiAddresses.priceFeed
  ];

  console.log("Deploying with the following parameters:");
  console.log("USDC:", fujiAddresses.USDC);
  console.log("aUSDC:", fujiAddresses.aUSDC);
  console.log("Aave Pool:", fujiAddresses.aavePool);
  console.log("Price Feed:", fujiAddresses.priceFeed);

  // Deploy AaveVault
  console.log("Deploying AaveVault...");
  const AaveVault = await hre.ethers.getContractFactory("AaveVault");
  const aaveVault = await AaveVault.deploy(...constructorArgs);
  await aaveVault.waitForDeployment();

  const aaveVaultAddress = await aaveVault.getAddress();
  console.log(`✅ AaveVault deployed to: ${aaveVaultAddress}`);

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Verify the contract
  console.log("Verifying contract on Snowtrace...");
  try {
    await hre.run("verify:verify", {
      address: aaveVaultAddress,
      constructorArguments: constructorArgs,
    });
    console.log("✅ Contract verified successfully");
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
