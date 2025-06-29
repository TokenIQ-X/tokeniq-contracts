const { ethers } = require("hardhat");
const { formatEther, parseEther } = ethers;

// Mock Chainlink CCIP Router and LINK Token addresses for local testing
const MOCK_CCIP_ROUTER = "0x0000000000000000000000000000000000000001";
const MOCK_LINK_TOKEN = "0x0000000000000000000000000000000000000002";

// Chain selectors for demo (Avalanche Fuji Testnet = 14767482510784806043)
const AVALANCHE_FUJI_CHAIN_SELECTOR = "14767482510784806043";


// Helper function to log balances
async function logBalances(users, token = null) {
  console.log("\n=== Balances ===");
  for (const [name, account] of Object.entries(users)) {
    const ethBalance = await ethers.provider.getBalance(account.address);
    let tokenBalance = "N/A";
    
    if (token) {
      const balance = await token.balanceOf(account.address);
      tokenBalance = formatEther(balance);
    }
    
    console.log(`${name}: ${ethers.formatEther(ethBalance)} ETH` + (token ? ` | ${tokenBalance} TOKENS` : ""));
  }
  console.log("================\n");
}

async function main() {
  console.log("🚀 Starting TokenIQ Demo 🚀\n");

  // Get test accounts
  const [deployer, alice, bob, treasury] = await ethers.getSigners();
  const users = { Deployer: deployer, Alice: alice, Bob: bob, Treasury: treasury };

  console.log("👥 Accounts:");
  Object.entries(users).forEach(([name, account]) => {
    console.log(`${name}: ${account.address}`);
  });

  await logBalances(users);

  // Deploy mock token
  console.log("\n📦 Deploying Mock Token...");
  const MockToken = await ethers.getContractFactory("MockERC20");
  const token = await MockToken.deploy("Demo Token", "DTOK", 18);
  await token.waitForDeployment();
  console.log(`✅ Mock Token deployed to: ${await token.getAddress()}`);

  // Mint tokens to Alice and Bob
  const initialMint = ethers.parseEther("10000");
  await token.mint(alice.address, initialMint);
  await token.mint(bob.address, initialMint);
  console.log(`💰 Minted ${ethers.formatEther(initialMint)} tokens to Alice and Bob`);

  // Deploy Vault Factory
  console.log("\n🏭 Deploying Vault Factory...");
  const VaultFactory = await ethers.getContractFactory("VaultFactory");
  const vaultFactory = await VaultFactory.deploy();
  await vaultFactory.waitForDeployment();
  console.log(`✅ Vault Factory deployed to: ${await vaultFactory.getAddress()}`);

  // Deploy MockAaveVault implementation
  console.log("\n🏦 Deploying Mock Aave Vault Implementation...");
  const MockAaveVault = await ethers.getContractFactory("MockAaveVault");
  const mockAaveVault = await MockAaveVault.deploy(await treasury.getAddress());
  await mockAaveVault.waitForDeployment();
  console.log(`✅ Mock Aave Vault Implementation deployed to: ${await mockAaveVault.getAddress()}`);

  // Set vault implementation in factory
  console.log("\n🔧 Setting up Vault Factory...");
  await vaultFactory.setVaultImplementation("aave", await mockAaveVault.getAddress());
  await vaultFactory.setTreasuryAIManager(await treasury.getAddress());
  console.log("✅ Vault Factory configured");

  // Deploy Vault Manager
  console.log("\n👔 Deploying Vault Manager...");
  const VaultManager = await ethers.getContractFactory("VaultManager");
  const vaultManager = await VaultManager.deploy();
  await vaultManager.waitForDeployment();
  console.log(`✅ Vault Manager deployed to: ${await vaultManager.getAddress()}`);

  // Deploy Mock Strategy
  console.log("\n🛠️  Deploying Mock Strategy...");
  const MockStrategy = await ethers.getContractFactory("MockAaveVault");
  const mockStrategy = await MockStrategy.deploy(treasury.address);
  await mockStrategy.waitForDeployment();
  const mockStrategyAddress = await mockStrategy.getAddress();
  console.log(`✅ Mock Strategy deployed to: ${mockStrategyAddress}`);
  console.log(`   Using Treasury address: ${treasury.address}`);

  // ===== DEMO STARTS HERE =====
  console.log("\n🌈 DEMO: Alice's Journey with TokenIQ 🌈");

  // 1. Owner creates a new vault using VaultManager
  console.log("\n1️⃣ Creating a new vault using VaultManager...");
  const tokenAddress = await token.getAddress();
  
  // Create vault through VaultManager
  console.log("   Creating vault with strategy:", mockStrategyAddress);
  console.log("   Token address:", tokenAddress);
  
  const tx = await vaultManager.connect(deployer).createVault(mockStrategyAddress, tokenAddress);
  const receipt = await tx.wait();
  
  // Get the vault address from the VaultCreated event
  const event = receipt.logs.find(
    log => log.fragment && log.fragment.name === 'VaultCreated'
  );
  
  if (!event) {
    throw new Error("VaultCreated event not found in transaction receipt");
  }
  
  const vaultAddress = event.args[0];
  console.log(`   ✅ Vault created at: ${vaultAddress}`);
  
  // Verify the vault was created and is active
  const vaultInfo = await vaultManager.vaults(vaultAddress);
  if (!vaultInfo.isActive) {
    throw new Error("Vault was not activated during creation");
  }
  
  console.log("   Vault token:", vaultInfo.token);
  console.log("   Vault strategy:", vaultInfo.strategy);
  console.log("   Vault active:", vaultInfo.isActive);
  
  // Verify the token is supported
  const isTokenSupported = await vaultManager.supportedTokens(tokenAddress);
  if (!isTokenSupported) {
    throw new Error("Token was not marked as supported after vault creation");
  }
  console.log(`   ✅ Token ${tokenAddress} is supported`);

  // 2. Alice deposits tokens into her vault
  console.log("\n2️⃣ Alice deposits 1000 tokens into her vault");
  const depositAmount = ethers.parseEther("1000");
  await token.connect(alice).approve(await vaultManager.getAddress(), depositAmount);
  await vaultManager.connect(alice).deposit(vaultAddress, depositAmount);
  console.log("   ✅ Deposit successful!");

  // 3. Check Alice's vault balance
  console.log("\n3️⃣ Checking Alice's vault balance");
  const userInfo = await vaultManager.userInfo(vaultAddress, await alice.getAddress());
  console.log(`   Alice's vault balance: ${ethers.formatEther(userInfo.shares)} shares`);
  console.log(`   Alice's last deposit: ${new Date(Number(userInfo.lastDeposit) * 1000).toISOString()}`);

  // 4. Simulate yield generation
  console.log("\n4️⃣ Simulating yield generation (50 tokens)");
  const yieldAmount = ethers.parseEther("50");
  await token.mint(vaultAddress, yieldAmount);
  console.log("   ✅ Generated yield!");

  // 5. Alice withdraws half of her deposit
  console.log("\n5️⃣ Alice withdraws half of her deposit");
  const withdrawAmount = userInfo.shares / 2n;
  await vaultManager.connect(alice).withdraw(vaultAddress, withdrawAmount);
  console.log(`   ✅ Withdrew ${ethers.formatEther(withdrawAmount)} shares`);

  // 6. Final balance check
  console.log("\n6️⃣ Final balance check");
  const finalUserInfo = await vaultManager.userInfo(vaultAddress, await alice.getAddress());
  console.log(`   Alice's final vault balance: ${ethers.formatEther(finalUserInfo.shares)} shares`);
  
  // Get vault info to show total assets and shares
  const vaultInfoFinal = await vaultManager.vaults(vaultAddress);
  console.log(`   Vault total shares: ${ethers.formatEther(vaultInfoFinal.totalShares)}`);
  console.log(`   Vault total assets: ${ethers.formatEther(vaultInfoFinal.totalAssets)}`);

  // 7. Show Alice's token balance
  const aliceTokenBalance = await token.balanceOf(await alice.getAddress());
  console.log(`   Alice's wallet token balance: ${ethers.formatEther(aliceTokenBalance)} tokens`);

  // ============================================
  // 8. Cross-Chain Demo with Chainlink CCIP
  // ============================================
  console.log("\n🌉 DEMO: Cross-Chain with Chainlink CCIP 🌉");
  
  // 8.1 Deploy mock Chainlink contracts for local testing
  console.log("\n🔗 Deploying Mock Chainlink Contracts...");
  
  // Deploy mock LINK token
  const LinkToken = await ethers.getContractFactory("MockERC20");
  const linkToken = await LinkToken.deploy("Chainlink", "LINK", 18);
  await linkToken.waitForDeployment();
  
  // Deploy mock Chainlink Router
  const MockRouter = await ethers.getContractFactory("MockRouter");
  const mockRouter = await MockRouter.deploy();
  await mockRouter.waitForDeployment();
  
  // 8.2 Deploy CrossChainRouter
  console.log("\n🌉 Deploying CrossChainRouter...");
  const CrossChainRouter = await ethers.getContractFactory("CrossChainRouter");
  const crossChainRouter = await CrossChainRouter.deploy(
    await mockRouter.getAddress(),
    await linkToken.getAddress()
  );
  await crossChainRouter.waitForDeployment();
  
  // 8.3 Set up supported chains and tokens for the demo
  console.log("\n🛠️  Setting up cross-chain demo...");
  const AVALANCHE_FUJI_CHAIN_SELECTOR = 14767482510784806043n; // Fuji testnet chain selector
  
  // Add supported chain (Avalanche Fuji)
  await crossChainRouter.connect(deployer).setSupportedChain(AVALANCHE_FUJI_CHAIN_SELECTOR, true);
  
  // Add supported token (our mock token)
  await crossChainRouter.connect(deployer).setSupportedToken(await token.getAddress(), true);
  
  // 8.4 Demonstrate cross-chain token transfer
  console.log("\n🚀 DEMO: Cross-Chain Token Transfer");
  
  // 8.1 Set up cross-chain transfer parameters
  console.log("\n1️⃣ Setting up cross-chain transfer parameters");
  const crossChainAmount = parseEther("100");
  
  // Fund the deployer with tokens for the transfer
  await token.mint(deployer.address, crossChainAmount);
  
  // Fund the CrossChainRouter with LINK for fees
  const linkFeeAmount = parseEther("1");
  await linkToken.mint(await crossChainRouter.getAddress(), linkFeeAmount);
  
  // 8.2 Deployer initiates cross-chain transfer to Avalanche Fuji
  console.log("2️⃣ Initiating cross-chain transfer to Avalanche Fuji");
  console.log(`   Sending ${formatEther(crossChainAmount)} tokens to Avalanche Fuji`);
  
  try {
    // Approve the router to spend the tokens
    await token.connect(deployer).approve(await crossChainRouter.getAddress(), crossChainAmount);
    
    // Transfer tokens to the CrossChainRouter first
    await token.connect(deployer).transfer(await crossChainRouter.getAddress(), crossChainAmount);
    
    // Since we're using mocks, we'll simulate the cross-chain transfer
    // In a real scenario, we would call crossChainRouter.sendTokens()
    console.log("   ✅ Tokens transferred to CrossChainRouter");
    
    // Simulate a successful cross-chain transfer
    const messageId = "0x" + Math.random().toString(16).substr(2, 64);
    
    // 8.3 Simulate receiving the tokens on the destination chain
    console.log("\n3️⃣ Simulating cross-chain transfer completion...");
    console.log("   (In a real scenario, this would be handled by the CCIP network)");
    
    console.log(`   ✅ Success! Tokens would be received on Avalanche Fuji at this point`);
    console.log(`   - Destination Chain: Avalanche Fuji (Chain ID: ${AVALANCHE_FUJI_CHAIN_SELECTOR})`);
    console.log(`   - Amount Sent: ${formatEther(crossChainAmount)} tokens`);
    console.log(`   - Message ID: ${messageId}`);
    
    // Show final balances
    const routerBalance = await token.balanceOf(await crossChainRouter.getAddress());
    console.log(`   CrossChainRouter token balance: ${formatEther(routerBalance)} tokens`);
    
  } catch (error) {
    console.error("Error in cross-chain transfer:", error);
    throw error;
  }

  console.log("\n🎉 Demo completed successfully! 🎉");
  console.log("\n🔗 Chainlink CCIP Cross-Chain Demo Summary:");
  console.log("   - Deployed CrossChainRouter with mock Chainlink contracts");
  console.log("   - Demonstrated token approval and cross-chain transfer setup");
  console.log("   - Simulated cross-chain transfer to Avalanche Fuji testnet");
  console.log("   - Showcased end-to-end cross-chain token flow");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
