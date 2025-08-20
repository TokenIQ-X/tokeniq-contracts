// scripts/deploy-test-vault.js
const hre = require("hardhat");

async function main() {
  // Get the contract factories
  const MockWBTC = await hre.ethers.getContractFactory("MockWBTC");
  const MockStakingStrategy = await hre.ethers.getContractFactory("MockStakingStrategy");
  const LSTBTCVault = await hre.ethers.getContractFactory("LSTBTCVault");

  // Deploy MockWBTC
  console.log("Deploying MockWBTC...");
  const mockWBTC = await MockWBTC.deploy();
  await mockWBTC.waitForDeployment();
  const mockWBTCAddress = await mockWBTC.getAddress();
  console.log("MockWBTC deployed to:", mockWBTCAddress);

  // Deploy MockStakingStrategy
  console.log("Deploying MockStakingStrategy...");
  const mockStrategy = await MockStakingStrategy.deploy(mockWBTCAddress);
  await mockStrategy.waitForDeployment();
  const mockStrategyAddress = await mockStrategy.getAddress();
  console.log("MockStakingStrategy deployed to:", mockStrategyAddress);

  // Deploy LSTBTCVault
  console.log("Deploying LSTBTCVault...");
  const vault = await LSTBTCVault.deploy(mockWBTCAddress, mockStrategyAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("LSTBTCVault deployed to:", vaultAddress);

  // Setup
  console.log("Setting up vault in strategy...");
  const tx = await mockStrategy.setVault(vaultAddress);
  await tx.wait();
  console.log("Vault address set in strategy");

  // Mint test WBTC to deployer
  const [deployer] = await hre.ethers.getSigners();
  const amount = hre.ethers.parseUnits("1000", 8);
  console.log(`Minting 1000 mock WBTC to ${deployer.address}...`);
  const mintTx = await mockWBTC.mint(deployer.address, amount);
  await mintTx.wait();
  console.log("Minting complete");

  console.log("\nDeployment complete!");
  console.log("====================");
  console.log("MockWBTC:", mockWBTCAddress);
  console.log("MockStakingStrategy:", mockStrategyAddress);
  console.log("LSTBTCVault:", vaultAddress);
  console.log("Deployer:", deployer.address);
  console.log("====================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });