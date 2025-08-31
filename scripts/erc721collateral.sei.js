
const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with deployer:", deployer.address);

  const name = "Collateral NFT";
  const symbol = "cNFT";
  const owner = deployer.address;
  const baseURI = "https://tokeniq.vercel.app/nfts/";
  const mintingFeeBps = 0; // 0% fee
  const feeRecipient = deployer.address;

  console.log("Deploying ERC721CollateralNFT proxy...");
  const ERC721CollateralNFT = await ethers.getContractFactory("ERC721CollateralNFT");
  const collateralNFT = await upgrades.deployProxy(
    ERC721CollateralNFT,
    [name, symbol, owner, baseURI, mintingFeeBps, feeRecipient],
    { initializer: "initialize" }
  );

  await collateralNFT.waitForDeployment();

  console.log("✅ ERC721CollateralNFT deployed at:", collateralNFT.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
