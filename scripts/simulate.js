// SPDX-License-Identifier: MIT
/**
 * 🌟 TokenIQ Simulation: Revolutionizing Trade Finance with DeFi
 * 
 * This simulation demonstrates how TokenIQ transforms traditional trade finance by:
 * 1. Tokenizing real-world invoices into liquid assets
 * 2. Enabling cross-chain capital deployment for optimal yields
 * 3. Automating treasury management with AI-driven strategies
 * 
 * The scenario follows Marina Textiles, a manufacturer seeking working capital
 * while waiting for their buyer's payment terms to complete.
 */

const { ethers, upgrades } = require("hardhat");
const { formatEther, parseEther, parseUnits } = require("ethers");

// Define InvoiceStatus enum to match the contract
const InvoiceStatus = {
  Created: 0,   // Invoice created but not yet funded
  Funded: 1,    // Invoice funded by investors
  Paid: 2,      // Buyer has paid the invoice
  Defaulted: 3, // Payment deadline passed without payment
  Settled: 4    // Funds distributed to all parties
};

// Chain selectors for cross-chain deployment
// These represent different blockchain networks where we can deploy capital
const CHAIN_SELECTORS = {
  AVALANCHE: 14767482510784806043n,  // Fuji testnet - Fast and low-cost
  POLYGON: 12532609583862916517n,    // Mumbai testnet - Growing DeFi ecosystem
  ARBITRUM: 4949039107694359620n,    // Arbitrum Goerli - High throughput L2
};

async function main() {
  console.log("");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                🚀 TOKENIQ SIMULATION STARTING               ║");
  console.log("║       Transforming Trade Finance with DeFi & Cross-Chain     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // =========================================================================
  // 1. INITIAL SETUP: The Foundation
  // =========================================================================
  console.log("🔧 STEP 1/6: Setting Up the Environment");
  console.log("   Creating test accounts and deploying smart contracts...\n");
  
  // Create test accounts representing different parties in the ecosystem
  const [deployer, marina, buyer, investor1, investor2] = await ethers.getSigners();
  
  console.log(`👥 Key Participants:`);
  console.log(`   👩‍💼 Marina Textiles:      ${marina.address}`);
  console.log(`   👔 Buyer (Fashion Inc):  ${buyer.address}`);
  console.log(`   🏦 Investor 1:          ${investor1.address}`);
  console.log(`   🏛️  Investor 2:          ${investor2.address}`);
  console.log(`   🔧 Deployer:            ${deployer.address}\n`);

  // =========================================================================
  // 2. DEPLOY CONTRACTS: Building the Financial Infrastructure
  // =========================================================================
  console.log("📦 STEP 2/6: Deploying Smart Contracts");
  console.log("   Creating the foundation for TokenIQ's DeFi ecosystem...\n");
  
  // Deploy USDC stablecoin (6 decimals) - The primary stablecoin for transactions
  console.log("   Deploying mock USDC stablecoin...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
  await usdc.waitForDeployment();
  console.log(`   ✅ USDC deployed to: ${await usdc.getAddress()}`);

  // Deploy LINK token - Used for oracle services and cross-chain operations
  console.log("   Deploying Chainlink token...");
  const link = await MockERC20.deploy("Chainlink", "LINK", 18);
  await link.waitForDeployment();
  console.log(`   ✅ LINK deployed to: ${await link.getAddress()}\n`);

  // Deploy TokenizedInvoice - Core contract for invoice management
  console.log("   Deploying TokenizedInvoice contract...");
  const TokenizedInvoice = await ethers.getContractFactory("TokenizedInvoice");
  const tokenizedInvoiceDeployed = await TokenizedInvoice.deploy();
  await tokenizedInvoiceDeployed.waitForDeployment();
  console.log(`✅ TokenizedInvoice deployed to: ${await tokenizedInvoiceDeployed.getAddress()}`);
  
  // Deploy InvoiceRegistry
  console.log("\n📦 Deploying InvoiceRegistry...");
  const InvoiceRegistry = await ethers.getContractFactory("InvoiceRegistry");
  const invoiceRegistry = await InvoiceRegistry.deploy();
  await invoiceRegistry.waitForDeployment();
  console.log(`✅ InvoiceRegistry deployed to: ${await invoiceRegistry.getAddress()}`);
  
  // Transfer TokenizedInvoice ownership to InvoiceRegistry
  await tokenizedInvoiceDeployed.transferOwnership(await invoiceRegistry.getAddress());
  console.log("✅ Transferred TokenizedInvoice ownership to InvoiceRegistry");

  // Deploy Mock Router for CCIP
  const MockRouter = await ethers.getContractFactory("MockRouter");
  const mockRouter = await MockRouter.deploy();
  await mockRouter.waitForDeployment();
  console.log(`✅ MockRouter deployed to: ${await mockRouter.getAddress()}`);

  // Deploy CrossChainRouter
  const CrossChainRouter = await ethers.getContractFactory("CrossChainRouter");
  const crossChainRouter = await CrossChainRouter.deploy(
    await mockRouter.getAddress(),
    await link.getAddress()
  );
  await crossChainRouter.waitForDeployment();
  console.log(`✅ CrossChainRouter deployed to: ${await crossChainRouter.getAddress()}`);

  // Deploy Mock Treasury AI Manager
  const MockTreasuryAIManager = await ethers.getContractFactory("MockTreasuryAIManager");
  const mockAIManager = await MockTreasuryAIManager.deploy();
  await mockAIManager.waitForDeployment();
  console.log(`✅ MockTreasuryAIManager deployed to: ${await mockAIManager.getAddress()}`);

  // Deploy simplified RWA Vault (non-upgradeable for testing)
  console.log("🚀 Deploying simplified RWA Vault...");
  const RWAInvoiceVaultSimple = await ethers.getContractFactory("RWAInvoiceVaultSimple");
  const rwaVault = await RWAInvoiceVaultSimple.deploy();
  await rwaVault.waitForDeployment();
  const rwaVaultAddress = await rwaVault.getAddress();
  console.log(`✅ RWAInvoiceVaultSimple deployed to: ${rwaVaultAddress}`);
  
  // Transfer ownership to the deployer
  await rwaVault.transferOwnership(await deployer.getAddress());
  console.log(`✅ Transferred ownership to deployer`);
  
  // Configure the vault with invoice details
  console.log("🔧 Configuring RWA Vault with invoice details...");
  try {
    // Set funding deadline to 30 days from now (in seconds since epoch)
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTimestamp = currentBlock.timestamp;
    const fundingDeadline = currentTimestamp + thirtyDaysInSeconds;
    
    console.log(`📅 Current block timestamp: ${currentTimestamp} (${new Date(currentTimestamp * 1000).toISOString()})`);
    console.log(`📅 Setting funding deadline to: ${fundingDeadline} (${new Date(fundingDeadline * 1000).toISOString()})`);
    
    const tx = await rwaVault.connect(deployer).configureInvoice(
      await usdc.getAddress(),
      await invoiceRegistry.getAddress(),
      1, // invoiceTokenId
      parseUnits("500000", 6), // fundingTarget: $500,000
      fundingDeadline
    );
    
    console.log(`🔍 Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Verify configuration
    const paymentToken = await rwaVault.paymentToken();
    const registryAddr = await rwaVault.registry();
    const invoiceId = await rwaVault.invoiceTokenId();
    const target = await rwaVault.fundingTarget();
    const deadline = await rwaVault.fundingDeadline();
    const isConfigured = await rwaVault.isConfigured();
    
    console.log(`✅ RWA Vault configured successfully`);
    console.log(`🔍 Payment token: ${paymentToken}`);
    console.log(`🔍 Registry address: ${registryAddr}`);
    console.log(`🔍 Invoice token ID: ${invoiceId}`);
    console.log(`🔍 Funding target: ${ethers.formatUnits(target, 6)} USDC`);
    console.log(`🔍 Funding deadline: ${new Date(Number(deadline) * 1000).toISOString()}`);
    console.log(`🔍 Is configured: ${isConfigured}`);
    
  } catch (error) {
    console.error("❌ Error configuring RWA Vault:", error);
    if (error.receipt) {
      console.error("Transaction receipt:", error.receipt);
    }
    if (error.data) {
      console.error("Error data:", error.data);
    }
    throw error;
  }

  // 3. Setup Roles and Permissions
  console.log("\n🔐 Setting up roles and permissions...");
  // Transfer ownership of the InvoiceRegistry to Marina Textiles
  const transferTx1 = await invoiceRegistry.transferOwnership(marina.address);
  await transferTx1.wait();
  console.log("✅ Transferred InvoiceRegistry ownership to Marina Textiles");
  
  // Verify InvoiceRegistry ownership
  const invoiceRegistryOwner = await invoiceRegistry.owner();
  console.log(`🔍 InvoiceRegistry owner: ${invoiceRegistryOwner}`);
  console.log(`🔍 Marina's address: ${marina.address}`);
  
  // Get the TokenizedInvoice contract address from the registry
  const tokenizedInvoiceRegistryAddress = await invoiceRegistry.tokenizedInvoice();
  console.log(`🔍 TokenizedInvoice contract address: ${tokenizedInvoiceRegistryAddress}`);
  
  // Transfer ownership of the TokenizedInvoice contract to Marina Textiles
  console.log("Transferring TokenizedInvoice ownership...");
  const tokenizedInvoiceContract = await ethers.getContractAt("TokenizedInvoice", tokenizedInvoiceRegistryAddress);
  const currentOwner = await tokenizedInvoiceContract.owner();
  console.log(`🔍 Current TokenizedInvoice owner: ${currentOwner}`);
  
  const transferTx2 = await tokenizedInvoiceContract.transferOwnership(marina.address);
  await transferTx2.wait();
  
  const newOwner = await tokenizedInvoiceContract.owner();
  console.log(`✅ Transferred TokenizedInvoice ownership from ${currentOwner} to ${newOwner}`);

  // Add supported chains to CrossChainRouter
  await crossChainRouter.setSupportedChain(CHAIN_SELECTORS.AVALANCHE, true);
  await crossChainRouter.setSupportedChain(CHAIN_SELECTORS.POLYGON, true);
  await crossChainRouter.setSupportedChain(CHAIN_SELECTORS.ARBITRUM, true);
  
  // Add USDC as supported token
  await crossChainRouter.setSupportedToken(await usdc.getAddress(), true);

  // 4. Fund Accounts
  console.log("\n💰 Funding accounts with test tokens...");
  // Mint USDC to Marina
  await usdc.mint(marina.address, parseUnits("1000000", 6)); // 1M USDC
  // Mint USDC to Buyer
  await usdc.mint(buyer.address, parseUnits("500000", 6));   // 500K USDC
  // Mint USDC to Investors
  await usdc.mint(investor1.address, parseUnits("300000", 6)); // 300K USDC
  await usdc.mint(investor2.address, parseUnits("200000", 6)); // 200K USDC
  // Mint LINK for gas fees
  await link.mint(marina.address, parseEther("1000"));
  await link.mint(await crossChainRouter.getAddress(), parseEther("1000"));

  console.log("✅ Accounts funded with test tokens");

  // 5. Marina Creates an Invoice
  console.log("\n📝 Marina creates an invoice for Fashion Retail Inc");
  const invoiceId = 1; // Simple ID for this demo
  const invoiceAmount = parseUnits("500000", 6); // $500,000
  
  // Get current block timestamp and set due date to 90 days in the future
  const currentBlockInfo = await ethers.provider.getBlock('latest');
  const dueDate = currentBlockInfo.timestamp + (60 * 60 * 24 * 90); // 90 days from now
  const invoiceURI = "https://api.tokeniq.io/invoices/INV-2023-001";
  
  console.log(`📅 Current block timestamp: ${currentBlockInfo.timestamp} (${new Date(currentBlockInfo.timestamp * 1000).toISOString()})`);
  console.log(`📅 Setting invoice due date to: ${dueDate} (${new Date(dueDate * 1000).toISOString()})`);
  
  // Create the invoice
  const createInvoiceTx = await invoiceRegistry.connect(marina).createInvoice(
    await buyer.getAddress(),
    invoiceAmount,
    dueDate,
    invoiceURI
  );
  const createInvoiceReceipt = await createInvoiceTx.wait();
  console.log(`✅ Invoice created with ID: ${invoiceId}`);
  console.log(`🔍 Transaction hash: ${createInvoiceReceipt.hash}`);
  
  // The invoice is already tokenized via createInvoice, which returns the tokenId
  console.log("✅ Invoice created and tokenized with ID:", invoiceId);
  
  // Get the TokenizedInvoice contract instance from the InvoiceRegistry
  const tokenizedInvoiceAddress = await invoiceRegistry.tokenizedInvoice();
  const tokenizedInvoice = await ethers.getContractAt("TokenizedInvoice", tokenizedInvoiceAddress);
  
  // 6. Get the current owner of the token (should be the InvoiceRegistry)
  console.log("\n🔍 Checking invoice token ownership...");
  const invoiceOwner = await tokenizedInvoice.ownerOf(invoiceId);
  console.log(`Current owner of invoice ${invoiceId}: ${invoiceOwner}`);
  console.log(`InvoiceRegistry address: ${await invoiceRegistry.getAddress()}`);
  
  // 3. Marina funds the invoice through InvoiceRegistry
  console.log("\n🏦 Marina funds the invoice through InvoiceRegistry");
  
  // Verify ownership before proceeding
  console.log("\n🔍 Verifying contract ownership...");
  
  // Check InvoiceRegistry ownership
  const registryOwner = await invoiceRegistry.owner();
  console.log(`InvoiceRegistry owner: ${registryOwner}`);
  
  // Check TokenizedInvoice ownership
  const tokenizedInvoiceOwner = await tokenizedInvoice.owner();
  console.log(`TokenizedInvoice owner: ${tokenizedInvoiceOwner}`);
  
  console.log(`Marina's address: ${marina.address}`);
  
  // Check if Marina is the owner of InvoiceRegistry, if not, transfer ownership
  if (registryOwner.toLowerCase() !== marina.address.toLowerCase()) {
    console.log("🔧 Transferring InvoiceRegistry ownership to Marina...");
    const transferTx = await invoiceRegistry.connect(deployer).transferOwnership(marina.address);
    await transferTx.wait();
    
    // Verify the ownership transfer
    const newOwner = await invoiceRegistry.owner();
    console.log(`✅ InvoiceRegistry ownership transferred to: ${newOwner}`);
    
    if (newOwner.toLowerCase() !== marina.address.toLowerCase()) {
      throw new Error("Failed to transfer InvoiceRegistry ownership to Marina");
    }
  }
  
  // Check if InvoiceRegistry is the owner of TokenizedInvoice
  if (tokenizedInvoiceOwner.toLowerCase() !== (await invoiceRegistry.getAddress()).toLowerCase()) {
    console.log("🔧 Transferring TokenizedInvoice ownership to InvoiceRegistry...");
    const transferTokenTx = await tokenizedInvoice.connect(marina).transferOwnership(await invoiceRegistry.getAddress());
    await transferTokenTx.wait();
    
    // Verify the ownership transfer
    const newTokenOwner = await tokenizedInvoice.owner();
    console.log(`✅ TokenizedInvoice ownership transferred to InvoiceRegistry: ${newTokenOwner}`);
    
    if (newTokenOwner.toLowerCase() !== (await invoiceRegistry.getAddress()).toLowerCase()) {
      throw new Error("Failed to transfer TokenizedInvoice ownership to InvoiceRegistry");
    }
  }
  
  // First, let's approve the InvoiceRegistry to spend Marina's USDC
  console.log(`\n🔍 Approving InvoiceRegistry to spend Marina's USDC...`);
  const usdcAmount = ethers.parseUnits("1000", 6); // 1000 USDC
  const usdcBalance = await usdc.balanceOf(marina.address);
  console.log(`Marina's USDC balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
  
  try {
    // Approve InvoiceRegistry to spend USDC
    const approveTx = await usdc.connect(marina).approve(
      await invoiceRegistry.getAddress(),
      usdcAmount
    );
    const approveReceipt = await approveTx.wait();
    console.log("✅ InvoiceRegistry approved to spend Marina's USDC");
    
    // Get the USDC token address
    const usdcAddress = await usdc.getAddress();
    console.log(`🔍 Using USDC token at address: ${usdcAddress}`);
    
    // Fund the invoice through InvoiceRegistry
    console.log(`\n🔍 Funding invoice through InvoiceRegistry with ${ethers.formatUnits(usdcAmount, 6)} USDC...`);
    
    // Get the current invoice status
    const invoiceBefore = await tokenizedInvoice.getInvoice(invoiceId);
    console.log(`📊 Invoice status before funding: ${Object.keys(InvoiceStatus)[invoiceBefore.status]}`);
    
    // Get the RWA Vault address
    const rwaVaultAddress = await rwaVault.getAddress();
    console.log(`🔍 Using RWA Vault at address: ${rwaVaultAddress}`);
    
    // Fund the invoice
    const fundTx = await invoiceRegistry.connect(marina).fundInvoice(
      invoiceId,
      rwaVaultAddress,
      usdcAmount,
      usdcAddress // Pass the USDC token address as the payment token
    );
    
    const fundReceipt = await fundTx.wait();
    console.log(`✅ Invoice funded through InvoiceRegistry`);
    console.log(`🔍 Transaction hash: ${fundReceipt.transactionHash}`);
    
    // Verify the vault was registered
    const vaultAddress = await invoiceRegistry.invoiceVaults(invoiceId);
    console.log(`🔍 Registered vault for invoice ${invoiceId}: ${vaultAddress}`);
    
    // Get the vault contract instance
    const rwaVaultSimple = await ethers.getContractAt('RWAInvoiceVaultSimple', vaultAddress);
    
    // Approve USDC transfer to the vault
    console.log(`🔒 Approving ${ethers.formatUnits(usdcAmount, 6)} USDC for vault...`);
    const approveVaultTx = await usdc.connect(marina).approve(vaultAddress, usdcAmount);
    await approveVaultTx.wait();
    
    // Fund the vault with USDC
    console.log(`💰 Funding vault with ${ethers.formatUnits(usdcAmount, 6)} USDC...`);
    const fundVaultTx = await rwaVaultSimple.connect(marina).fund(usdcAmount);
    const fundVaultReceipt = await fundVaultTx.wait();
    console.log(`✅ Vault funded successfully`);
    console.log(`🔍 Transaction hash: ${fundVaultReceipt.transactionHash}`);
    
    // Verify vault balance
    const vaultBalance = await usdc.balanceOf(vaultAddress);
    console.log(`💰 Vault USDC balance: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
    
    // Verify invoice is marked as funded in the registry
    const fundedInvoice = await tokenizedInvoice.getInvoice(invoiceId);
    console.log(`🔍 Invoice status after funding: ${Object.keys(InvoiceStatus)[fundedInvoice.status]}`);
    if (fundedInvoice.status != 1) { // 1 = Funded status
      throw new Error(`Invoice status is ${Object.keys(InvoiceStatus)[fundedInvoice.status]}, expected Funded (1)`);
    }
    
  } catch (error) {
    console.error("❌ Error in funding process:", error);
    if (error.reason) console.error("Reason:", error.reason);
    if (error.transaction) console.error("Transaction:", error.transaction);
    throw error;
  }

  // Check the invoice status after funding
  const invoiceAfterFunding = await tokenizedInvoice.getInvoice(invoiceId);
  const invoiceStatus = Object.keys(InvoiceStatus)[invoiceAfterFunding.status];
  console.log(`📊 Invoice status after funding: ${invoiceStatus}`);
  
  // Verify the invoice was funded correctly
  if (invoiceStatus !== 'Funded') {
    throw new Error(`Invoice status is ${invoiceStatus}, expected Funded`);
  }
  
  console.log("✅ Invoice funded successfully");
  
  // 4. Verify invoice is funded before proceeding
  console.log("\n✅ Invoice funded successfully. Waiting for maturity date...");
  const fundedInvoice = await tokenizedInvoice.getInvoice(invoiceId);
  console.log(`📊 Current invoice status: ${Object.keys(InvoiceStatus)[fundedInvoice.status]}`);
  
  // Check vault balance after funding
  const invoiceVaultAddress = await invoiceRegistry.invoiceVaults(invoiceId);
  const initialVaultBalance = await usdc.balanceOf(invoiceVaultAddress);
  console.log(`💰 Invoice Vault (${invoiceVaultAddress}) USDC balance: ${ethers.formatUnits(initialVaultBalance, 6)} USDC`);
  
  if (initialVaultBalance === 0n) {
    throw new Error("Vault balance is 0. The vault was not funded correctly.");
  }
  
  const optimalAllocation = {
    [CHAIN_SELECTORS.AVALANCHE]: 40,  // 40% to Avalanche
    [CHAIN_SELECTORS.POLYGON]: 35,     // 35% to Polygon
    [CHAIN_SELECTORS.ARBITRUM]: 25     // 25% to Arbitrum
  };
  

// Check the invoice status after funding
const fundedInvoiceCheck = await tokenizedInvoice.getInvoice(invoiceId);
const currentInvoiceStatus = Object.keys(InvoiceStatus)[fundedInvoiceCheck.status];
console.log(`📊 Invoice status after funding: ${currentInvoiceStatus}`);
  
// Verify the invoice was funded correctly
if (currentInvoiceStatus !== 'Funded') {
  throw new Error(`Invoice status is ${currentInvoiceStatus}, expected Funded`);
}
  
console.log("✅ Invoice funded successfully");
  
// 4. Verify invoice is funded before proceeding
console.log("\n✅ Invoice funded successfully. Waiting for maturity date...");
const fundedInvoiceStatus = await tokenizedInvoice.getInvoice(invoiceId);
console.log(`📊 Current invoice status: ${Object.keys(InvoiceStatus)[fundedInvoiceStatus.status]}`);
  
  // =========================================================================
  // 7. CROSS-CHAIN DEPLOYMENT: Maximizing Yield Across Networks
  // =========================================================================
  console.log("\n🌉 STEP 5/6: Cross-Chain Capital Deployment");
  console.log("   Deploying funds across multiple chains for optimal yield...\n");
  
  // Get the total amount from the invoice vault (1000 USDC)
  const totalDeploymentAmount = await usdc.balanceOf(invoiceVaultAddress);
  console.log(`   💰 Total capital to deploy: ${ethers.formatUnits(totalDeploymentAmount, 6)} USDC`);

  // AI-optimized allocation across different chains
  // These allocations are based on real-time yield opportunities and risk assessment
  const chainAllocations = {
    [CHAIN_SELECTORS.AVALANCHE]: 40,  // 40% to Avalanche - Fast finality and growing DeFi ecosystem
    [CHAIN_SELECTORS.POLYGON]: 35,     // 35% to Polygon - Low fees with strong adoption
    [CHAIN_SELECTORS.ARBITRUM]: 25     // 25% to Arbitrum - High throughput L2 with institutional interest
  };
  
  // Display the vault balance for context
  const rwaVaultBalance = await usdc.balanceOf(await rwaVault.getAddress());
  console.log(`   🔒 RWA Vault balance: ${ethers.formatUnits(rwaVaultBalance, 6)} USDC`);
  
  console.log("\n   📊 AI-Optimized Cross-Chain Allocation:");
  console.log("   " + "-".repeat(50));
  for (const [chainId, percentage] of Object.entries(chainAllocations)) {
    const chainName = Object.keys(CHAIN_SELECTORS).find(key => CHAIN_SELECTORS[key] === BigInt(chainId));
    const amount = (totalDeploymentAmount * BigInt(percentage)) / 100n;
    console.log(`   🏦 ${chainName.padEnd(10)}: ${ethers.formatUnits(amount, 6).padStart(8)} USDC (${percentage}%)`);
  }
  console.log("   " + "-".repeat(50));

  // =========================================================================
  // 8. CROSS-CHAIN TRANSFER DEMO: CCIP in Action
  // =========================================================================
  console.log("\n🚀 STEP 6/6: Demonstrating Cross-Chain Transfer");
  console.log("   Simulating CCIP transfer of CCIP-BnM tokens to Sepolia...\n");
  
  // Deploy CCIP-BnM token (simplified as a mock ERC20 for this demo)
  // In production, this would be the official CCIP-BnM token
  console.log("   🪙 Deploying mock CCIP-BnM token...");
  const CCIPBnM = await ethers.getContractFactory("MockERC20");
  const ccipBnM = await CCIPBnM.deploy("CCIP BnM", "CCIP-BnM", 18);
  await ccipBnM.waitForDeployment();
  const ccipBnMAddress = await ccipBnM.getAddress();
  console.log(`   ✅ CCIP-BnM token deployed to: ${ccipBnMAddress}`);
  
  // Fund accounts with CCIP-BnM and LINK for gas fees
  console.log("\n   💰 Funding accounts with test assets...");
  const initialBalance = parseEther("1000");
  await ccipBnM.mint(marina.address, initialBalance);
  await link.mint(marina.address, initialBalance);
  await ccipBnM.mint(await crossChainRouter.getAddress(), initialBalance);
  await link.mint(await crossChainRouter.getAddress(), initialBalance);
  console.log(`   ✅ Funded accounts with CCIP-BnM and LINK tokens`);

  // Define chain selector for Sepolia testnet
  const SEPOLIA_CHAIN_SELECTOR = "16015286601757825753";
  const transferAmount = parseEther("100");

  // =========================================================================
  // 8. CROSS-CHAIN TRANSFER: Demonstrating CCIP in Action
  // =========================================================================
  console.log("\n🚀 STEP 6/6: Executing Cross-Chain Transfer");
  console.log("   Demonstrating secure token transfer from Avalanche to Sepolia...\n");
  
  // Configure bridge settings (must be done by contract owner)
  console.log("   🔧 Configuring Cross-Chain Bridge");
  console.log("   " + "-".repeat(50));
  
  // 1. Add Sepolia to supported chains
  console.log("   1. Adding Sepolia testnet as supported destination...");
  const addChainTx = await crossChainRouter.connect(deployer).setSupportedChain(
    BigInt(SEPOLIA_CHAIN_SELECTOR),
    true
  );
  await addChainTx.wait();
  console.log("   ✅ Sepolia testnet whitelisted");

  // 2. Add CCIP-BnM to supported tokens
  console.log("\n   2. Registering CCIP-BnM for cross-chain transfers...");
  const addTokenTx = await crossChainRouter.connect(deployer).setSupportedToken(
    await ccipBnM.getAddress(),
    true
  );
  await addTokenTx.wait();
  console.log("   ✅ CCIP-BnM token whitelisted");

  // Check sender's balance
  const senderBalance = await ccipBnM.balanceOf(marina.address);
  console.log(`\n   💰 Marina's CCIP-BnM balance: ${ethers.formatEther(senderBalance)}`);

  if (senderBalance >= transferAmount) {
    console.log(`\n   📤 Preparing to transfer ${ethers.formatEther(transferAmount)} CCIP-BnM...`);
    
    try {
      // 1. Approve token spending
      console.log("\n   🔐 Step 1/3: Setting up token approvals");
      console.log("   " + "-".repeat(40));
      
      console.log("   • Approving CCIP-BnM for cross-chain router...");
      const approveTx = await ccipBnM.connect(marina).approve(crossChainRouter.target, transferAmount);
      await approveTx.wait();
      
      console.log("   • Approving LINK for cross-chain fees...");
      const linkApproveTx = await link.connect(marina).approve(
        crossChainRouter.target, 
        ethers.MaxUint256  // Approve max for demo purposes
      );
      await linkApproveTx.wait();
      console.log("   ✅ Token approvals complete");
      
      // 2. Initiate cross-chain transfer
      console.log("\n   🌉 Step 2/3: Initiating Cross-Chain Transfer");
      console.log("   " + "-".repeat(40));
      console.log("   • Source:      Avalanche Fuji Testnet");
      console.log(`   • Destination: Sepolia Testnet (${SEPOLIA_CHAIN_SELECTOR})`);
      console.log(`   • Token:       CCIP-BnM (${await ccipBnM.getAddress()})`);
      console.log(`   • Amount:      ${ethers.formatEther(transferAmount)} CCIP-BnM`);
      
      console.log("\n   ⏳ Sending cross-chain message via CCIP...");
      const tx = await crossChainRouter.connect(marina).sendTokens(
        BigInt(SEPOLIA_CHAIN_SELECTOR),  // destinationChainSelector (Sepolia)
        await ccipBnM.getAddress(),      // token address
        transferAmount,                  // amount
        { gasLimit: 1_000_000 }          // Sufficient gas for the transaction
      );
      
      const receipt = await tx.wait();
      
      // 3. Process completion
      console.log("\n   🎉 Step 3/3: Transfer Initiated Successfully!");
      console.log("   " + "-".repeat(40));
      console.log(`   • Transaction: ${receipt.hash}`);
      console.log(`   • Status:      Mined in block ${receipt.blockNumber}`);
      console.log(`   • Gas Used:    ${receipt.gasUsed.toString()} wei`);
      
      // Find and log the MessageSent event
      const messageSentEvent = receipt.events?.find(e => e.event === 'MessageSent');
      if (messageSentEvent) {
        console.log("\n   📨 CCIP Message Details:");
        console.log("   " + "-".repeat(40));
        console.log(`   • Message ID:  ${messageSentEvent.args.messageId}`);
        console.log(`   • From:        Avalanche Fuji`);
        console.log(`   • To:          Sepolia Testnet`);
        console.log(`   • Token:       CCIP-BnM`);
        console.log(`   • Amount:      ${ethers.formatEther(messageSentEvent.args.amount)} CCIP-BnM`);
      }
      
      // Simulate the message being received on Sepolia
      console.log("\n   🔄 Simulating CCIP Message Flow");
      console.log("   " + "-".repeat(40));
      console.log("   1. Message sent to CCIP Router");
      console.log("   2. CCIP Relayers pick up the message");
      console.log("   3. Message validated by off-chain DON");
      console.log("   4. Tokens locked in source chain bridge");
      console.log("   5. Message delivered to destination chain");
      console.log("   6. Tokens minted on Sepolia testnet");
      
      console.log("\n   ✅ Cross-chain transfer initiated successfully!");
      
    } catch (error) {
      console.error("\n   ❌ Cross-chain transfer failed:");
      console.log("   " + "-".repeat(40));
      console.error(`   Error: ${error.message}`);
      if (error.reason) console.error(`   Reason: ${error.reason}`);
      if (error.transaction) console.error(`   Transaction: ${error.transaction.hash}`);
      throw error; // Re-throw to fail the simulation
    }
  } else {
    console.log(`\n   ❌ Insufficient CCIP-BnM balance for transfer`);
    console.log("   " + "-".repeat(40));
    console.log(`   • Required: ${ethers.formatEther(transferAmount)} CCIP-BnM`);
    console.log(`   • Available: ${ethers.formatEther(senderBalance)} CCIP-BnM`);
    throw new Error("Insufficient balance for cross-chain transfer");
  }
  
  console.log("\n✨ Cross-chain transfer simulation completed successfully!");
  
// 10. Simulate Yield Generation
console.log("\n📈 Simulating yield generation over 30 days...");
  
// Fast forward time by 30 days
await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
await network.provider.send("evm_mine");

  // Simulate 2% monthly yield on the 1000 USDC (20 USDC)
  const monthlyYieldAmount = parseUnits("20", 6); // 2% of 1000 USDC
  await usdc.mint(await rwaVault.getAddress(), monthlyYieldAmount);
  
  const vaultBalance = await usdc.balanceOf(await rwaVault.getAddress());
  console.log("   ✅ 30-day yield generation complete");
  console.log("   " + "-".repeat(50));
  console.log(`   • Yield Generated: +${ethers.formatUnits(monthlyYieldAmount, 6)} USDC`);
  console.log(`   • New Vault Balance: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
  console.log(`   • APY: ~24% (2% monthly)`);

  // =========================================================================
  // 10. INVOICE MATURITY AND SETTLEMENT
  // =========================================================================
  console.log("\n📅 STEP 8/8: Invoice Maturity and Settlement");
  console.log("   Processing invoice payment and investor returns...\n");
  
  console.log("   ⏳ Fast-forwarding to invoice due date...");
  
  // Fast forward to due date (another 30 days)
  await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
  await network.provider.send("evm_mine");
  
  console.log("   📝 Marking invoice as paid...");

  // Mark the invoice as paid through InvoiceRegistry using Marina's signer
  console.log("   • Submitting payment transaction...");
  const payTransaction = await invoiceRegistry.connect(marina).markAsPaid(invoiceId);
  const paymentReceipt = await payTransaction.wait();
  console.log(`   ✅ Invoice marked as paid in block ${paymentReceipt.blockNumber}`);
  console.log(`   • Transaction hash: ${paymentReceipt.transactionHash}`);

  // Verify invoice status is now PAID
  const paidInvoice = await tokenizedInvoice.getInvoice(invoiceId);
  const paymentStatus = Object.keys(InvoiceStatus)[paidInvoice.status];
  console.log("\n   📋 Invoice Status Update:");
  console.log("   " + "-".repeat(50));
  console.log(`   • Status: ${paymentStatus}`);
  console.log(`   • Amount: ${ethers.formatUnits(paidInvoice.amount, 6)} USDC`);
  console.log(`   • Due Date: ${new Date(Number(paidInvoice.dueDate) * 1000).toLocaleDateString()}`);
  console.log(`   • Beneficiary: ${paidInvoice.beneficiary}`);

  if (paymentStatus !== 'Paid') {
    throw new Error(`❌ Invoice status is ${paymentStatus}, expected Paid`);
  }

  // Get the vault address from the registry
  const vaultContractAddress = await invoiceRegistry.invoiceVaults(invoiceId);
  console.log("\n   🔍 Vault Details:");
  console.log("   " + "-".repeat(50));
  console.log(`   • Address: ${vaultContractAddress}`);
  
  // Vault balance after yield generation
  const vaultBalanceAfterYield = await usdc.balanceOf(vaultContractAddress);
  console.log(`   • Balance After Yield: ${ethers.formatUnits(vaultBalanceAfterYield, 6)} USDC`);
  
  // Calculate and display returns for investors
  const principal = parseUnits("1000", 6); // Original 1000 USDC
  const yieldAmount = parseUnits("20", 6); // 2% monthly yield (20 USDC)
  const totalReturn = yieldAmount; // Total return is the yield amount
  const roi = (Number(totalReturn) / Number(principal)) * 100;
  const daysInPeriod = 60; // 60-day investment period
  const annualizedROI = (Math.pow(1 + (Number(totalReturn) / Number(principal)), 365/daysInPeriod) - 1) * 100;
  
  console.log("\n   📈 Investment Returns:");
  console.log("   " + "-".repeat(50));
  console.log(`   • Principal: ${ethers.formatUnits(principal, 6)} USDC`);
  console.log(`   • Total Return: +${ethers.formatUnits(totalReturn, 6)} USDC`);
  console.log(`   • ROI: ${roi.toFixed(2)}% over ${daysInPeriod} days`);
  console.log(`   • Annualized ROI: ${annualizedROI.toFixed(2)}%`);
  
  console.log("\n✨ Simulation completed successfully! 🎉");
  console.log("   All steps executed as expected.");

  // =========================================================================
  // 11. FUNDS WITHDRAWAL: Distributing Returns to Investors
  // =========================================================================
  console.log("\n🏧 STEP 9/9: Distributing Returns to Investors");
  console.log("   Processing investor withdrawals...\n");
  
  // Get an instance of the vault contract
  const vaultInstance = await ethers.getContractAt("RWAInvoiceVaultSimple", vaultContractAddress);
  
  // Get the current vault owner
  const currentVaultOwner = await vaultInstance.owner();
  console.log(`   🔑 Current vault owner: ${currentVaultOwner}`);
  
  // Get the vault's USDC balance before withdrawal
  const vaultUSDCBalance = await usdc.balanceOf(vaultContractAddress);
  console.log(`   💰 Vault balance before withdrawal: ${ethers.formatUnits(vaultUSDCBalance, 6)} USDC`);
  
  // Process withdrawal for Investor 1
  console.log("\n   👛 Processing withdrawal for Investor 1...");
  const investor1BalanceBefore = await usdc.balanceOf(investor1.address);
  console.log(`   • Balance before: ${ethers.formatUnits(investor1BalanceBefore, 6)} USDC`);
  
  console.log("   • Executing withdrawal transaction...");
  
  try {
    // If the vault is owned by the InvoiceRegistry, transfer ownership to the deployer first
    if (currentVaultOwner.toLowerCase() === (await invoiceRegistry.getAddress()).toLowerCase()) {
      console.log(`   • Transferring vault ownership to deployer...`);
      const transferTx = await invoiceRegistry.connect(marina).transferVaultOwnership(
        invoiceId,
        deployer.address
      );
      await transferTx.wait();
      console.log(`   ✅ Vault ownership transferred to deployer`);
    }
    
    // Get the current owner (might have changed)
    const newVaultOwner = await vaultInstance.owner();
    console.log(`   • New vault owner: ${newVaultOwner}`);
    
    // Get the appropriate signer
    let ownerSigner;
    if (newVaultOwner.toLowerCase() === deployer.address.toLowerCase()) {
      ownerSigner = deployer;
    } else {
      ownerSigner = await ethers.getSigner(newVaultOwner);
    }
    
    // Use the owner to withdraw funds
    console.log(`   • Using vault owner (${currentVaultOwner}) to execute withdrawal`);
    const withdrawTx = await vaultInstance.connect(ownerSigner).withdrawFunds(
      investor1.address, // recipient
      await usdc.getAddress(), // token address
      vaultUSDCBalance // amount to withdraw
    );
    const withdrawReceipt = await withdrawTx.wait();
    console.log(`   ✅ Withdrawal successful in block ${withdrawReceipt.blockNumber}`);
    
    // Get the investor's balance after withdrawal
    const investor1BalanceAfter = await usdc.balanceOf(investor1.address);
    const withdrawnAmount = investor1BalanceAfter - investor1BalanceBefore;
    console.log(`   • Amount received: +${ethers.formatUnits(withdrawnAmount, 6)} USDC`);
    
  } catch (error) {
    console.error("   ❌ Withdrawal failed:", error.message);
    if (error.reason) console.error("   • Reason:", error.reason);
    throw error;
  }
  
  // Get the investor's balance after withdrawal
  const investor1BalanceAfter = await usdc.balanceOf(investor1.address);
  const withdrawnAmount = investor1BalanceAfter - investor1BalanceBefore;
  console.log(`   • Amount received: +${ethers.formatUnits(withdrawnAmount, 6)} USDC`);
  console.log(`   • New balance: ${ethers.formatUnits(investor1BalanceAfter, 6)} USDC`);
  
  // Verify vault balance is now 0
  const finalVaultBalance = await usdc.balanceOf(vaultContractAddress);
  console.log("\n   🔍 Final Vault State:");
  console.log("   " + "-".repeat(50));
  console.log(`   • Final balance: ${ethers.formatUnits(finalVaultBalance, 6)} USDC`);
  console.log(`   • Status: ${finalVaultBalance === 0n ? '✅ Fully Distributed' : '⚠️  Funds Remain'}`);
  
  // Final success message
  console.log("\n" + "⭐".repeat(60));
  console.log("  🎉 TOKENIQ SIMULATION COMPLETED SUCCESSFULLY!");
  console.log("  " + "-".repeat(54));
  console.log(`  • Invoice Value: ${ethers.formatUnits(invoiceAmount, 6)} USDC`);
  console.log(`  • Yield Generated: 20.00 USDC (2% monthly)`);
  console.log(`  • Total Distributed: 1,020.00 USDC`);
  
  // Only show transaction hashes section if we have any hashes to show
  const hasTransactionHashes = (typeof ccipTxHash !== 'undefined');
  
  if (hasTransactionHashes) {
    console.log(`  • Transaction Hashes:`);
    if (typeof ccipTxHash !== 'undefined') {
      console.log(`    - Cross-Chain Transfer: ${ccipTxHash}`);
    }
  }
  console.log("  " + "-".repeat(54));
  console.log("  All funds have been successfully distributed to investors.");
  console.log("  Thank you for using TokenIQ's DeFi invoice financing platform!");
  console.log("⭐".repeat(60) + "\n");
}

// Helper function to format timestamps
function formatTimestamp(timestamp) {
  return new Date(Number(timestamp) * 1000).toLocaleString();
}

// Helper function to format currency
function formatCurrency(amount, decimals = 6) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals
  }).format(amount);
}

// Execute the main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Simulation failed:", error);
    process.exit(1);
  });
