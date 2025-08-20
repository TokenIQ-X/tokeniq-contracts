// Deploy script for TestToken using hardhat-deploy
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying TestToken...");
  
  const testToken = await deploy('TestToken', {
    from: deployer,
    args: [],
    log: true,
    // Set gas price for Sei testnet
    gasPrice: 2000000000, // 2 gwei
    // Increase gas limit if needed
    gasLimit: 5000000,
  });

  console.log(`TestToken deployed to: ${testToken.address}`);
};

module.exports.tags = ['TestToken'];

// Only run this script on Sei testnet
module.exports.skip = ({ getChainId }) =>
  new Promise(async (resolve, reject) => {
    try {
      const chainId = await getChainId();
      resolve(chainId !== "1328"); // Skip if not Sei testnet (chainId 1328)
    } catch (error) {
      reject(error);
    }
  });
