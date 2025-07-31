import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

async function main() {
  console.log("Starting LSTBTC Vault deployment...");

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  // Deploy AaveStrategy
  console.log("Deploying AaveStrategy...");
  const AaveStrategy = await ethers.getContractFactory("AaveStrategy");
  
  // Mainnet addresses (replace with actual addresses for your network)
  const WBTC = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"; // Mainnet WBTC
  const AAVE_POOL = "0x794a61358D6845594F94dc1DB02A252b5b4814aD"; // Aave V3 Pool
  const A_WBTC = "0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656"; // Aave interest bearing WBTC
  
  const strategy = await AaveStrategy.deploy(
    WBTC,
    AAVE_POOL,
    A_WBTC
  );
  await strategy.deployed();
  console.log(`AaveStrategy deployed to: ${strategy.address}`);

  // Deploy LSTBTCVault
  console.log("Deploying LSTBTCVault...");
  const LSTBTCVault = await ethers.getContractFactory("LSTBTCVault");
  const wbtc = await ethers.getContractAt("IERC20", WBTC);
  
  const vault = await LSTBTCVault.deploy(wbtc.address, strategy.address);
  await vault.deployed();
  console.log(`LSTBTCVault deployed to: ${vault.address}`);
  
  // Set the vault address in the strategy
  console.log("Setting vault address in strategy...");
  await strategy.setVault(vault.address);
  console.log("Vault address set in strategy");
  
  console.log("\nDeployment complete!");
  console.log("========================================");
  console.log(`LSTBTCVault: ${vault.address}`);
  console.log(`AaveStrategy: ${strategy.address}`);
  console.log("\nNext steps:");
  console.log(`1. Verify contracts on Etherscan`);
  console.log(`2. Transfer ownership of the vault to a multisig`);
  console.log(`3. Update frontend with the new contract addresses`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
