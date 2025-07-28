import { ethers, upgrades } from "hardhat";
import { BTCfiVault, VaultFactory } from "../typechain-types";
import { getAddresses } from "./utils/addresses";

async function main() {
  console.log("Starting BTCfi Vault deployment...");

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  // Get contract addresses
  const addresses = getAddresses();
  
  // Deploy BTCfiVault implementation
  console.log("Deploying BTCfiVault implementation...");
  const BTCfiVault = await ethers.getContractFactory("BTCfiVault");
  const btcfiVault = await BTCfiVault.deploy(
    addresses.tokens.WBTC,      // WBTC address
    addresses.tokens.BTCFI,     // BTCFI token address
    addresses.chainlink.BTC_USD // BTC/USD price feed
  );
  await btcfiVault.deployed();
  console.log(`BTCfiVault implementation deployed to: ${btcfiVault.address}`);

  // Get VaultFactory instance
  const VaultFactory = await ethers.getContractFactory("VaultFactory");
  const vaultFactory = VaultFactory.attach(addresses.contracts.VaultFactory) as VaultFactory;

  // Set BTCfi vault implementation in VaultFactory
  console.log("Setting BTCfi vault implementation in VaultFactory...");
  const tx = await vaultFactory.setVaultImplementation("btcfi", btcfiVault.address);
  await tx.wait();
  console.log("BTCfi vault implementation set in VaultFactory");

  console.log("\nDeployment complete!");
  console.log(`- BTCfiVault implementation: ${btcfiVault.address}`);
  console.log(`- VaultFactory updated with BTCfi implementation`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
