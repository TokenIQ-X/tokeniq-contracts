import { ethers, upgrades } from "hardhat";

async function main() {
  console.log("Starting Asset Tokenization deployment...");

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  // Deploy AssetTokenizationFactory
  console.log("Deploying AssetTokenizationFactory...");
  const AssetTokenizationFactory = await ethers.getContractFactory("AssetTokenizationFactory");
  const factory = await AssetTokenizationFactory.deploy();
  await factory.deployed();
  
  console.log(`AssetTokenizationFactory deployed to: ${factory.address}`);
  
  console.log("\nDeployment complete!");
  console.log(`- AssetTokenizationFactory: ${factory.address}`);
  
  // Example: How to create a new tokenization contract
  // const tx = await factory.createTokenizationContract("MyAssetCollection", "MAC");
  // const receipt = await tx.wait();
  // const event = receipt.events?.find((e: any) => e.event === "TokenizationContractCreated");
  // console.log(`- New tokenization contract deployed at: ${event?.args?.contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
