const hre = require("hardhat");

async function main() {
  console.log("Deploying TreasuryAIManager to Sepolia...");

  // Deploy TreasuryAIManager
  const TreasuryAIManager = await hre.ethers.getContractFactory("TreasuryAIManager");
  const treasuryAIManager = await TreasuryAIManager.deploy();
  await treasuryAIManager.waitForDeployment();

  const treasuryAIManagerAddress = await treasuryAIManager.getAddress();
  console.log(`TreasuryAIManager deployed to: ${treasuryAIManagerAddress}`);

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

  // Verify the contract
  console.log("Verifying contract on Etherscan...");
  try {
    await hre.run("verify:verify", {
      address: treasuryAIManagerAddress,
      constructorArguments: [],
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