const hre = require("hardhat");

async function main() {
  console.log("Deploying InvoiceRegistry to Sepolia...");

  // Deploy InvoiceRegistry
  const InvoiceRegistry = await hre.ethers.getContractFactory("InvoiceRegistry");
  const invoiceRegistry = await InvoiceRegistry.deploy();
  await invoiceRegistry.waitForDeployment();

  const invoiceRegistryAddress = await invoiceRegistry.getAddress();
  console.log(`InvoiceRegistry deployed to: ${invoiceRegistryAddress}`);

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

  // Verify the contract
  console.log("Verifying contract on Etherscan...");
  try {
    await hre.run("verify:verify", {
      address: invoiceRegistryAddress,
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