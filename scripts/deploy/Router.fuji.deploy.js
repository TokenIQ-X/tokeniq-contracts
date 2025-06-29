const hre = require("hardhat");

async function main() {
  console.log("Deploying Router to Fuji...");

  // Fuji testnet addresses
  const fujiRouter = "0xF694E193200268f9a4868e4Aa017A0118C9a8177";  // CCIP Router on Fuji
  const fujiLink = "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846";      // LINK token on Fuji

  const constructorArgs = [fujiRouter, fujiLink];

  // Deploy Router
  const Router = await hre.ethers.getContractFactory("Router");
  const router = await Router.deploy(...constructorArgs);
  await router.waitForDeployment();

  const routerAddress = await router.getAddress();
  console.log(`Router deployed to: ${routerAddress}`);

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

  // Verify the contract
  console.log("Verifying contract on Snowtrace...");
  try {
    await hre.run("verify:verify", {
      address: routerAddress,
      constructorArguments: constructorArgs,
    });
    console.log("Contract verified successfully");
  } catch (error) {
    console.error("Error verifying contract:", error);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
