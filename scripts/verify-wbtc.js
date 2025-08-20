// Script to verify WBTC contract on Sei testnet
const hre = require("hardhat");

async function main() {
  const contractAddress = "0xc9C0Fb76a50eAb570665977703cC8f7185c082b5";
  
  console.log(`Verifying WBTC contract at ${contractAddress}...`);
  
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("✅ Contract is already verified");
    } else {
      console.error("❌ Verification failed:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
