// scripts/erc1155.sei.js
// npx hardhat run --network seitestnet scripts/erc1155.sei.js

const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with deployer:", deployer.address);

  const baseURI = "https://tokeniq.vercel.app/hybrid/";
  const owner = deployer.address;

  console.log("Deploying ERC1155HybridAsset (proxy)...");
  const ERC1155HybridAsset = await ethers.getContractFactory("ERC1155HybridAsset");

  // ✅ Only pass baseURI and owner
  const hybridAsset = await upgrades.deployProxy(
    ERC1155HybridAsset,
    [baseURI, owner],
    { initializer: "initialize" }
  );

  await hybridAsset.waitForDeployment();
  console.log("✅ ERC1155HybridAsset deployed at:", hybridAsset.target);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
