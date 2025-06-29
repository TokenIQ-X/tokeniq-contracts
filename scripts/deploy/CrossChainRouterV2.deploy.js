const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying CrossChainRouterV2...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  // Network configuration
  const network = hre.network.name;
  console.log(`Network: ${network}`);

  // Default constructor arguments (for Sepolia testnet)
  let constructorArgs = [
    "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93", // CCIP Router
    "0xE4aB69C077896252FAFBD49EFD26B5D171A32410"  // LINK Token
  ];

  // Override for different networks if needed
  if (network === 'sepolia') {
    constructorArgs = [
      "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93", // CCIP Router
      "0xE4aB69C077896252FAFBD49EFD26B5D171A32410"  // LINK Token
    ];
  } else if (network === 'fuji') {
    constructorArgs = [
      "0xF694E193200268f9a4868e4Aa017A0118C9a8177", // CCIP Router on Fuji
      "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846"  // LINK Token on Fuji
    ];
  }

  console.log("\n🔧 Constructor arguments:", JSON.stringify(constructorArgs, null, 2));

  // Deploy CrossChainRouterV2
  console.log("\n🚀 Deploying CrossChainRouterV2...");
  const CrossChainRouterV2 = await hre.ethers.getContractFactory("CrossChainRouterV2");
  const crossChainRouter = await CrossChainRouterV2.deploy(...constructorArgs);
  
  console.log("⏳ Waiting for deployment transaction...");
  const deploymentReceipt = await crossChainRouter.waitForDeployment();
  const crossChainRouterAddress = await crossChainRouter.getAddress();
  
  console.log(`✅ CrossChainRouterV2 deployed to: ${crossChainRouterAddress}`);
  console.log(`📝 Deployment transaction hash: ${deploymentReceipt.deploymentTransaction().hash}`);

  // Wait for block confirmations
  const WAIT_BLOCK_CONFIRMATIONS = 5;
  console.log(`\n⏳ Waiting for ${WAIT_BLOCK_CONFIRMATIONS} block confirmations...`);
  await deploymentReceipt.deploymentTransaction().wait(WAIT_BLOCK_CONFIRMATIONS);

  // Verify the contract on Etherscan
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\n🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: crossChainRouterAddress,
        constructorArguments: constructorArgs,
      });
      console.log("✅ Contract verified successfully");
    } catch (error) {
      if (error.message.toLowerCase().includes("already verified")) {
        console.log("✅ Contract is already verified");
      } else {
        console.error("❌ Error verifying contract:", error);
      }
    }
  } else {
    console.log("ℹ️ ETHERSCAN_API_KEY not set, skipping verification");
  }

  console.log("\n✨ Deployment completed!");
  console.log(`🔗 Contract address: ${crossChainRouterAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
