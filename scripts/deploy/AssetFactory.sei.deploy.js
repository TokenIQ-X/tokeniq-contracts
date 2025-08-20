// Script for deploying the AssetFactory and template contracts to Sei Network
// npx hardhat run --network seitestnet scripts/deploy/AssetFactory.sei.deploy.js

const { ethers, upgrades } = require("hardhat");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core");

async function main() {
  // Get deployer address
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance (wei):", balance.toString());

  // Deploy ERC20VaultToken template
  console.log("Deploying ERC20VaultToken template...");
  const ERC20VaultToken = await ethers.getContractFactory("ERC20VaultToken");
  const erc20VaultToken = await ERC20VaultToken.deploy(
    "Vault Token",  // Name
    "vTOKEN",       // Symbol
    "0xc9C0Fb76a50eAb570665977703cC8f7185c082b5", // Asset address (replace with actual asset address)
    {
      depositFeeBasisPoints: 0,      // 0% deposit fee
      withdrawalFeeBasisPoints: 0,   // 0% withdrawal fee
      performanceFeeBasisPoints: 2000 // 20% performance fee
    },
    deployer.address                 // Owner
  );
  await erc20VaultToken.waitForDeployment();
  console.log("ERC20VaultToken template deployed to:", erc20VaultToken.address);

  // Deploy ERC721CollateralNFT template
  console.log("Deploying ERC721CollateralNFT template...");
  const ERC721CollateralNFT = await ethers.getContractFactory("ERC721CollateralNFT");
  const erc721CollateralNFT = await upgrades.deployProxy(
    ERC721CollateralNFT,
    [
      "Collateral NFT",  // Name
      "cNFT",           // Symbol
      deployer.address,  // Owner
      "https://tokeniq.vercel.app/nfts/",  // Base URI
      0,                // 0% minting fee
      deployer.address   // Fee recipient
    ],
    { initializer: "initialize" }
  );
  await erc721CollateralNFT.waitForDeployment();
  console.log("ERC721CollateralNFT template deployed to:", erc721CollateralNFT.address);

  // Deploy ERC1155HybridAsset template
  console.log("Deploying ERC1155HybridAsset template...");
  const ERC1155HybridAsset = await ethers.getContractFactory("ERC1155HybridAsset");
  const erc1155HybridAsset = await upgrades.deployProxy(
    ERC1155HybridAsset,
    [
      "https://tokeniq.vercel.app/hybrid/",  // Base URI
      deployer.address,                   // Owner
      0,                                  // 0% minting fee
      deployer.address                    // Fee recipient
    ],
    { initializer: "initialize" }
  );
  await erc1155HybridAsset.waitForDeployment();
  console.log("ERC1155HybridAsset template deployed to:", erc1155HybridAsset.address);

  // Deploy AssetFactory
  console.log("Deploying AssetFactory...");
  const AssetFactory = await ethers.getContractFactory("AssetFactory");
  const assetFactory = await upgrades.deployProxy(AssetFactory, [
    erc20VaultToken.address,
    erc721CollateralNFT.address,
    erc1155HybridAsset.address,
    deployer.address // Initial owner
  ], {
    initializer: "initialize",
    kind: "uups"
  });
  await assetFactory.waitForDeployment();
  
  console.log("AssetFactory deployed to:", assetFactory.address);
  
  // Get the implementation address
  const implementationAddress = await getImplementationAddress(
    ethers.provider,
    assetFactory.address
  );
  console.log("AssetFactory implementation deployed to:", implementationAddress);

  // Verify contract addresses
  console.log("\nDeployment Summary:");
  console.log("=================");
  console.log("ERC20VaultToken Template:", erc20VaultToken.address);
  console.log("ERC721CollateralNFT Template:", erc721CollateralNFT.address);
  console.log("ERC1155HybridAsset Template:", erc1155HybridAsset.address);
  console.log("AssetFactory Proxy:", assetFactory.address);
  console.log("AssetFactory Implementation:", implementationAddress);
  console.log("\nDeployment completed successfully!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
