// scripts/deployAssetFactory.js
// Usage: npx hardhat run --network seitestnet scripts/deployAssetFactory.js

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying AssetFactory with deployer:", deployer.address);

  const erc20TemplateAddr = "0xCaFF129Ec344A98Da8C9a4091a239DF158Cf31A5";  
  const erc721TemplateAddr = "0x8e827a12C78dED9459268eb05cce2C5d709FE6AF";  
  const erc1155TemplateAddr = "0xd6D6fBc6c0ebbB07411acB0EDad6373db389aC13";  

  const AssetFactory = await ethers.getContractFactory("AssetFactory");

  console.log("Deploying AssetFactory proxy...");
  const factory = await upgrades.deployProxy(
    AssetFactory,
    [erc20TemplateAddr, erc721TemplateAddr, erc1155TemplateAddr, deployer.address],
    { initializer: "initialize", kind: "uups" }
  );

  await factory.waitForDeployment();

  console.log("✅ AssetFactory Proxy deployed at:", factory.target);

  const implAddress = await upgrades.erc1967.getImplementationAddress(factory.target);
  console.log("AssetFactory Implementation deployed at:", implAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
