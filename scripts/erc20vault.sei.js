
const { ethers } = require("hardhat");

async function main() {
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Define constructor params
  const name = "Vault Token";
  const symbol = "vTOKEN";
  const asset = "0xc9C0Fb76a50eAb570665977703cC8f7185c082b5"; 

  const feeConfig = {
    depositFeeBasisPoints: 0,
    withdrawalFeeBasisPoints: 0,
    performanceFeeBasisPoints: 2000 // 20%
  };

  const owner = deployer.address;

  // Deploy contract
  console.log("Deploying ERC20VaultToken...");
  const ERC20VaultToken = await ethers.getContractFactory("ERC20VaultToken");
  const vault = await ERC20VaultToken.deploy(
    name,
    symbol,
    asset,
    feeConfig,
    owner,
    
  );

  await vault.waitForDeployment();
  console.log("✅ ERC20VaultToken deployed at:", vault.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
