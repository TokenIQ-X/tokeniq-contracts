const hre = require("hardhat");

async function main() {
  // --- CONFIGURE YOUR CONTRACT TO VERIFY ---
  const contractName = "VaultFactory"; // The name of the contract you want to verify
  const contractAddress = "0xE2Ea85Cc94E40cdc1Abc058373785ee6b3809183"; // The address of the deployed contract
  const constructorArguments = []; // The list of constructor arguments. Leave empty if there are none.
  // Example for AaveVault: [usdcAddress, aUsdcAddress, poolAddress, priceFeedAddress]
  // ----------------------------------------

  console.log(`Verifying ${contractName} at ${contractAddress} on network ${hre.network.name}...`);

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArguments,
      // If your contract is in a subdirectory, you might need to specify the contract path
      // contract: "contracts/factories/VaultFactory.sol:VaultFactory"
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("Contract is already verified.");
    } else {
      console.error("Verification failed:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
