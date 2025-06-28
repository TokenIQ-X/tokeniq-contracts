const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts to Fuji...");

  // 1. Deploy TreasuryAIManager
  const TreasuryAIManager = await hre.ethers.getContractFactory("TreasuryAIManager");
  const treasuryAIManager = await TreasuryAIManager.deploy();
  await treasuryAIManager.waitForDeployment();
  const treasuryAIManagerAddress = await treasuryAIManager.getAddress();
  console.log(`TreasuryAIManager deployed to: ${treasuryAIManagerAddress}`);

  // 2. Deploy VaultFactory
  const VaultFactory = await hre.ethers.getContractFactory("VaultFactory");
  const vaultFactory = await VaultFactory.deploy(); // Deploy with no arguments
  await vaultFactory.waitForDeployment();
  const vaultFactoryAddress = await vaultFactory.getAddress();
  console.log(`VaultFactory deployed to: ${vaultFactoryAddress}`);

  // 2.1 Set the TreasuryAIManager address
  console.log("Setting TreasuryAIManager address in VaultFactory...");
  await vaultFactory.setTreasuryAIManager(treasuryAIManagerAddress);
  console.log("TreasuryAIManager address set successfully.");

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

  // 3. Deploy vault implementations
  console.log("Deploying vault implementations...");

  // AaveVault implementation for Fuji
  const AaveVault = await hre.ethers.getContractFactory("AaveVault");
  const aaveVaultImpl = await AaveVault.deploy(
    "0x5425890298aed601595a70AB815c96711a31Bc65", // USDC token on Fuji
    "0x4a7255e1354515d532211831231f5124115a7a54", // aAvaUSDC token on Fuji
    "0x052A440075A4126418C5176244215f204515E868", // Aave Pool V3 on Fuji
    "0x5722A3F64fa252b4122A13a4614A7831A5C15512"  // USDC/USD Price Feed on Fuji
  );
  await aaveVaultImpl.waitForDeployment();
  const aaveVaultImplAddress = await aaveVaultImpl.getAddress();
  console.log(`AaveVault implementation deployed to: ${aaveVaultImplAddress}`);

  // CurveVault implementation (assuming no specific constructor args)
  const CurveVault = await hre.ethers.getContractFactory("CurveVault");
  const curveVaultImpl = await CurveVault.deploy();
  await curveVaultImpl.waitForDeployment();
  const curveVaultImplAddress = await curveVaultImpl.getAddress();
  console.log(`CurveVault implementation deployed to: ${curveVaultImplAddress}`);

  // RWAInvoiceVault implementation (assuming no specific constructor args)
  const RWAInvoiceVault = await hre.ethers.getContractFactory("RWAInvoiceVault");
  const rwaVaultImpl = await RWAInvoiceVault.deploy();
  await rwaVaultImpl.waitForDeployment();
  const rwaVaultImplAddress = await rwaVaultImpl.getAddress();
  console.log(`RWAInvoiceVault implementation deployed to: ${rwaVaultImplAddress}`);

  // 4. Set implementations in VaultFactory
  console.log("Setting vault implementations in VaultFactory...");
  await vaultFactory.setVaultImplementation("aave", aaveVaultImplAddress);
  await vaultFactory.setVaultImplementation("curve", curveVaultImplAddress);
  await vaultFactory.setVaultImplementation("rwa", rwaVaultImplAddress);

  // Verify the contracts
  console.log("Verifying contracts on Etherscan...");
  try {
    await hre.run("verify:verify", {
      address: vaultFactoryAddress,
      constructorArguments: [],
    });
    console.log("VaultFactory verified successfully");

    await hre.run("verify:verify", {
      address: aaveVaultImplAddress,
      constructorArguments: [
        "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        "0x16dA4541aD1807f4443d92D26044C1147406EB80",
        "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
        "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E"
      ],
    });
    console.log("AaveVault implementation verified successfully");

    await hre.run("verify:verify", {
      address: curveVaultImplAddress,
      constructorArguments: [],
    });
    console.log("CurveVault implementation verified successfully");

    await hre.run("verify:verify", {
      address: rwaVaultImplAddress,
      constructorArguments: [],
    });
    console.log("RWAInvoiceVault implementation verified successfully");
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