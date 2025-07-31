const hre = require("hardhat");

async function main() {
  console.log("Deploying LSTBTCVault to Core Testnet 2...");

  // Core Testnet 2 addresses
  // These addresses need to be updated with the actual Core Testnet 2 addresses
  const coreTestnet2Addresses = {
    WBTC: "0x0000000000000000000000000000000000000000", // Replace with actual WBTC address on Core Testnet 2
    aWBTC: "0x0000000000000000000000000000000000000000", // Replace with actual aWBTC address on Core Testnet 2
    aavePool: "0x0000000000000000000000000000000000000000", // Replace with actual Aave Pool address on Core Testnet 2
    priceFeed: "0x0000000000000000000000000000000000000000"  // Replace with actual WBTC/USD Price Feed on Core Testnet 2
  };

  // Deploy AaveVault first
  console.log("Deploying AaveVault...");
  const AaveVault = await hre.ethers.getContractFactory("AaveVault");
  const aaveVault = await AaveVault.deploy(
    coreTestnet2Addresses.WBTC,
    coreTestnet2Addresses.aWBTC,
    coreTestnet2Addresses.aavePool,
    coreTestnet2Addresses.priceFeed
  );
  await aaveVault.waitForDeployment();
  const aaveVaultAddress = await aaveVault.getAddress();
  console.log(`✅ AaveVault deployed to: ${aaveVaultAddress}`);

  // Deploy LSTBTCVault
  console.log("Deploying LSTBTCVault...");
  const LSTBTCVault = await hre.ethers.getContractFactory("LSTBTCVault");
  const lstbtcVault = await LSTBTCVault.deploy(
    coreTestnet2Addresses.WBTC,
    aaveVaultAddress
  );
  await lstbtcVault.waitForDeployment();
  const lstbtcVaultAddress = await lstbtcVault.getAddress();
  console.log(`✅ LSTBTCVault deployed to: ${lstbtcVaultAddress}`);

  // Set the vault address in the strategy
  console.log("Setting vault address in AaveVault...");
  await aaveVault.initialize(lstbtcVaultAddress);
  console.log("✅ Vault address set in AaveVault");

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Verify the contracts
  console.log("Verifying contracts on BTCS Explorer...");
  try {
    // Verify AaveVault
    await hre.run("verify:verify", {
      address: aaveVaultAddress,
      constructorArguments: [
        coreTestnet2Addresses.WBTC,
        coreTestnet2Addresses.aWBTC,
        coreTestnet2Addresses.aavePool,
        coreTestnet2Addresses.priceFeed
      ],
    });
    console.log("✅ AaveVault verified successfully");

    // Verify LSTBTCVault
    await hre.run("verify:verify", {
      address: lstbtcVaultAddress,
      constructorArguments: [
        coreTestnet2Addresses.WBTC,
        aaveVaultAddress
      ],
    });
    console.log("✅ LSTBTCVault verified successfully");
  } catch (error) {
    console.error("Error verifying contracts:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
