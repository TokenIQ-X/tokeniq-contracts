// scripts/deploy/DeployAssetFactory.coreTestnet.js
const { ethers, upgrades } = require("hardhat");

// Template addresses (already deployed)
const ERC20_VAULT_TOKEN = "0xC310b43748E5303F1372Ab2C9075629E0Bb4FE54";
const ERC721_COLLATERAL_NFT = "0xc4d732199B7d21207a74CFE6CEd4d17dD330C7Ea";
const ERC1155_HYBRID_ASSET = "0xc9C0Fb76a50eAb570665977703cC8f7185c082b5";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AssetFactory with account:", deployer.address);
  console.log("Using template addresses:");
  console.log("- ERC20VaultToken:", ERC20_VAULT_TOKEN);
  console.log("- ERC721CollateralNFT:", ERC721_COLLATERAL_NFT);
  console.log("- ERC1155HybridAsset:", ERC1155_HYBRID_ASSET);

  // Deploy AssetFactory
  console.log("\nDeploying AssetFactory...");
  const AssetFactory = await ethers.getContractFactory("AssetFactory");
  
  const assetFactory = await upgrades.deployProxy(
    AssetFactory,
    [
      ERC20_VAULT_TOKEN,
      ERC721_COLLATERAL_NFT,
      ERC1155_HYBRID_ASSET,
      deployer.address // Initial owner
    ],
    { initializer: 'initialize' }
  );
  
  await assetFactory.waitForDeployment();
  const assetFactoryAddress = await assetFactory.getAddress();
  
  console.log("AssetFactory deployed to:", assetFactoryAddress);
  
  // Verify implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(assetFactoryAddress);
  console.log("Implementation address:", implementationAddress);
  
  console.log("\nAssetFactory deployment completed!");
  console.log("\nNext steps:");
  console.log(`1. Verify the implementation contract: npx hardhat verify --network coreTestnet2 ${implementationAddress}`);
  console.log(`2. Update your frontend with the new AssetFactory address: ${assetFactoryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
