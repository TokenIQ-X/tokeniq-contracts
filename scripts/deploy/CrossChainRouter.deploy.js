const hre = require("hardhat");

async function main() {
  console.log("Deploying CrossChainRouter to Sepolia...");

  // Constructor arguments for CrossChainRouter ETH
//   const constructorArgs = [
//     "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59", // CCIP Router
//     "0x779877A7B0D9E8603169DdbD7836e478b4624789"  // LINK Token
//   ];

  const constructorArgs = [
    "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93", // CCIP Router
    "0xE4aB69C077896252FAFBD49EFD26B5D171A32410"
  ];

  // Deploy CrossChainRouter
  const CrossChainRouter = await hre.ethers.getContractFactory("CrossChainRouter");
  const crossChainRouter = await CrossChainRouter.deploy(...constructorArgs);
  await crossChainRouter.waitForDeployment();

  const crossChainRouterAddress = await crossChainRouter.getAddress();
  console.log(`CrossChainRouter deployed to: ${crossChainRouterAddress}`);

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

  // Verify the contract
  console.log("Verifying contract on Etherscan...");
  try {
    await hre.run("verify:verify", {
      address: crossChainRouterAddress,
      constructorArguments: constructorArgs,
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