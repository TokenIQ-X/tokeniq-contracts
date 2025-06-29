const hre = require("hardhat");

async function main() {
  console.log("Deploying AaveVault to Avalanche Fuji...");

  // Fuji Testnet addresses
  const fujiAddresses = {
    USDC: "0x5425890298aed601595a70AB815c96711a31Bc65",  // Fuji USDC
    aUSDC: "0x7bA2e5c37C4151d654Fcc4b41ffF3Fe693c23852",  // Fuji aUSDC
    aavePool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",  // Fuji Aave Pool
    priceFeed: "0x97FE42a7E96640D932bbc0e1580c73E705A8EB73"   // Fuji USDC/USD Price Feed
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
