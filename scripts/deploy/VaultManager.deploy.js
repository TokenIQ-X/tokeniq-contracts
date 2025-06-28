const hre = require("hardhat");

async function main() {
  console.log("Deploying VaultManager...");

  // Deploy VaultManager
  const VaultManager = await hre.ethers.getContractFactory("VaultManager");
  const vaultManager = await VaultManager.deploy();
  await vaultManager.waitForDeployment();

  const vaultManagerAddress = await vaultManager.getAddress();
  console.log(`VaultManager deployed to: ${vaultManagerAddress}`);

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  // In a real deployment, you might want a more robust waiting mechanism
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

  // Verify the contract on Etherscan
  console.log("Verifying contract on Etherscan...");
  try {
    await hre.run("verify:verify", {
      address: vaultManagerAddress,
      constructorArguments: [], // No constructor arguments
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
