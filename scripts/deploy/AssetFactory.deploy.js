// Script for deploying the AssetFactory and template contracts
// npx hardhat run --network <network> scripts/deploy/AssetFactory.deploy.js

const { ethers, upgrades } = require("hardhat");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core");

async function main() {
  // Get deployer address
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy ERC20VaultToken template
  console.log("Deploying ERC20VaultToken template...");
  const ERC20VaultToken = await ethers.getContractFactory("ERC20VaultToken");
  const erc20VaultToken = await ERC20VaultToken.deploy();
  await erc20VaultToken.deployed();
  console.log("ERC20VaultToken template deployed to:", erc20VaultToken.address);

  // Deploy ERC721CollateralNFT template
  console.log("Deploying ERC721CollateralNFT template...");
  const ERC721CollateralNFT = await ethers.getContractFactory("ERC721CollateralNFT");
  const erc721CollateralNFT = await ERC721CollateralNFT.deploy();
  await erc721CollateralNFT.deployed();
  console.log("ERC721CollateralNFT template deployed to:", erc721CollateralNFT.address);

  // Deploy ERC1155HybridAsset template
  console.log("Deploying ERC1155HybridAsset template...");
  const ERC1155HybridAsset = await ethers.getContractFactory("ERC1155HybridAsset");
  const erc1155HybridAsset = await ERC1155HybridAsset.deploy();
  await erc1155HybridAsset.deployed();
  console.log("ERC1155HybridAsset template deployed to:", erc1155HybridAsset.address);

  // Deploy AssetFactory
  console.log("Deploying AssetFactory...");
  const AssetFactory = await ethers.getContractFactory("AssetFactory");
  const assetFactory = await upgrades.deployProxy(AssetFactory, [
    erc20VaultToken.address,
    erc721CollateralNFT.address,
    erc1155HybridAsset.address,
    deployer.address // Initial owner
  ]);
  await assetFactory.deployed();
  
  console.log("AssetFactory deployed to:", assetFactory.address);
  
  // Get the implementation address
  const implementationAddress = await getImplementationAddress(
    ethers.provider,
    assetFactory.address
  );
  console.log("AssetFactory implementation deployed to:", implementationAddress);

  // Verify ownership
  console.log("AssetFactory owner:", await assetFactory.owner());
  
  // Verify template addresses
  console.log("\nTemplate addresses:");
  console.log("ERC20VaultToken:", erc20VaultToken.address);
  console.log("ERC721CollateralNFT:", erc721CollateralNFT.address);
  console.log("ERC1155HybridAsset:", erc1155HybridAsset.address);
  
  // Prepare verification info
  const verificationInfo = {
    network: network.name,
    assetFactory: {
      address: assetFactory.address,
      implementation: implementationAddress,
      constructorArguments: []
    },
    templates: {
      erc20VaultToken: erc20VaultToken.address,
      erc721CollateralNFT: erc721CollateralNFT.address,
      erc1155HybridAsset: erc1155HybridAsset.address
    },
    timestamp: new Date().toISOString()
  };
  
  console.log("\nVerification info:");
  console.log(JSON.stringify(verificationInfo, null, 2));
  
  return verificationInfo;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
