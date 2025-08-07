// Script for deploying the template contracts to Core Testnet
// npx hardhat run --network coreTestnet2 scripts/deploy/DeployTemplates.coreTestnet.js

const { ethers, upgrades } = require("hardhat");
const { ZeroAddress } = ethers;

// Wrapped CORE token address on Core Testnet (checksummed format)
const WCORE_ADDRESS = "0x40375c71dfa051a6b8ca1241df8cb4be557ccecd";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Starting deployment of template contracts with account:", deployer.address);
  
  // Deploy ERC20VaultToken template
  console.log("Deploying ERC20VaultToken template...");
  const ERC20VaultToken = await ethers.getContractFactory("ERC20VaultToken");
  
  // Deploy with constructor parameters (dummy values for now, will be set by factory)
  const erc20VaultToken = await ERC20VaultToken.deploy(
    "Vault Token Template",
    "VLT",
    WCORE_ADDRESS, // Using Wrapped CORE as the underlying asset for testing
    {
      depositFeeBasisPoints: 0,
      withdrawalFeeBasisPoints: 0,
      performanceFeeBasisPoints: 0
    },
    deployer.address // Using deployer's address as owner
  );
  await erc20VaultToken.waitForDeployment();
  console.log("ERC20VaultToken template deployed to:", await erc20VaultToken.getAddress());

  // Deploy ERC721CollateralNFT template as upgradeable
  console.log("\nDeploying ERC721CollateralNFT template...");
  const ERC721CollateralNFT = await ethers.getContractFactory("ERC721CollateralNFT");
  
  // Deploy the upgradeable proxy
  const erc721CollateralNFT = await upgrades.deployProxy(
    ERC721CollateralNFT,
    [
      "Collateral NFT", // name
      "CNFT",                    // symbol
      deployer.address,          // owner
      "https://api.tokeniq.xyz/nfts/", // baseURI
      0,                         // mintingFee
      deployer.address           // feeRecipient
    ],
    { initializer: 'initialize' }
  );
  
  await erc721CollateralNFT.waitForDeployment();
  console.log("ERC721CollateralNFT template deployed to:", await erc721CollateralNFT.getAddress());

  // Deploy ERC1155HybridAsset template as upgradeable
  console.log("\nDeploying ERC1155HybridAsset template...");
  const ERC1155HybridAsset = await ethers.getContractFactory("ERC1155HybridAsset");
  
  // Deploy the upgradeable proxy
  const erc1155HybridAsset = await upgrades.deployProxy(
    ERC1155HybridAsset,
    [
      "https://api.tokeniq.xyz/assets/", // _uri
      deployer.address,          // _owner
      0,                         // _mintingFee
      deployer.address           // _feeRecipient
    ],
    { 
      initializer: 'initializeHybridAsset',
      kind: 'uups' // Explicitly specify UUPS proxy pattern
    }
  );
  
  await erc1155HybridAsset.waitForDeployment();
  console.log("ERC1155HybridAsset template deployed to:", await erc1155HybridAsset.getAddress());

  console.log("\nDeployment Summary:");
  console.log("==================");
  console.log("ERC20VaultToken:", erc20VaultToken.address);
  console.log("ERC721CollateralNFT:", erc721CollateralNFT.address);
  console.log("ERC1155HybridAsset:", erc1155HybridAsset.address);
  console.log("\nDeployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
