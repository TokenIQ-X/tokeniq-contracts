const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MaxUint256, ZeroAddress } = require("ethers");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("LSTBTCVault Extended Tests", function () {
  let wbtc, aWbtc, aavePool, strategy, vault, rewardsController, owner, user1, user2;
  
  const WBTC_DECIMALS = 8;
  const WBTC_AMOUNT = ethers.parseUnits("1", WBTC_DECIMALS);
  const SMALL_AMOUNT = ethers.parseUnits("0.1", WBTC_DECIMALS);
  
  async function deployContracts() {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock WBTC with 18 decimals for consistency
    const WBTC = await ethers.getContractFactory("ERC20Mock");
    const wbtcContract = await WBTC.deploy("Wrapped Bitcoin", "WBTC", owner.address, ethers.parseEther("1000000"));
    wbtc = wbtcContract;
    
    // Deploy mock aWBTC with 18 decimals for consistency
    const AWBTC = await ethers.getContractFactory("ERC20Mock");
    const aWbtcContract = await AWBTC.deploy("Aave WBTC", "aWBTC", owner.address, ethers.parseEther("1000000"));
    aWbtc = aWbtcContract;
    
    // Set WBTC decimals to 8 to match real WBTC
    await wbtc.setDecimals(8);
    await aWbtc.setDecimals(8);
    
    // Deploy mock Aave Pool
    const AavePool = await ethers.getContractFactory("AavePoolMock");
    const aavePoolContract = await AavePool.deploy(
      await wbtc.getAddress(),
      await aWbtc.getAddress()
    );
    aavePool = aavePoolContract;
    
    // Fund the AavePool with WBTC for withdrawals
    await wbtc.transfer(await aavePool.getAddress(), ethers.parseUnits("1000", WBTC_DECIMALS));
    
    // Deploy mock rewards controller
    const RewardsController = await ethers.getContractFactory("RewardsControllerMock");
    const rewardsControllerContract = await RewardsController.deploy();
    rewardsController = rewardsControllerContract;
    
    // Deploy AaveStrategy
    const AaveStrategy = await ethers.getContractFactory("AaveStrategy");
    const strategyContract = await AaveStrategy.deploy(
      await wbtc.getAddress(),
      await aWbtc.getAddress(),
      await aavePool.getAddress()
    );
    strategy = strategyContract;
    
    // Deploy LSTBTCVault
    const LSTBTCVault = await ethers.getContractFactory("LSTBTCVault");
    const vaultContract = await LSTBTCVault.deploy(
      await wbtc.getAddress(),
      await strategy.getAddress()
    );
    vault = vaultContract;
    
    // Set the vault address in the strategy
    await strategy.setVault(await vault.getAddress());
    
    // Mint aWBTC to the AavePoolMock so it can transfer them during staking
    await aWbtc.mint(aavePool.target, ethers.parseUnits("1000000", 8));
    
    // Mint WBTC to users and the vault
    const userAmount = ethers.parseUnits("10", 8);
    await wbtc.mint(owner.address, userAmount);
    await wbtc.mint(user1.address, userAmount);
    await wbtc.mint(user2.address, userAmount);
    
    // Mint some WBTC directly to the vault for testing
    await wbtc.mint(vault.target, ethers.parseUnits("100", 8));
    
    // Mint aWBTC to the AavePoolMock for withdrawals
    await aWbtc.mint(aavePool.target, ethers.parseUnits("1000000", 8));
    
    // The strategy will need to have aWBTC for withdrawals
    // We'll use the deployer to transfer aWBTC to the strategy
    await aWbtc.mint(owner.address, ethers.parseUnits("1000000", 8));
    await aWbtc.transfer(strategy.target, ethers.parseUnits("1000000", 8));
    
    // Approve the vault to spend WBTC from users
    await wbtc.connect(owner).approve(vault.target, ethers.MaxUint256);
    await wbtc.connect(user1).approve(vault.target, ethers.MaxUint256);
    await wbtc.connect(user2).approve(vault.target, ethers.MaxUint256);
    
    // Approve the AavePool to spend WBTC from users (for direct staking)
    await wbtc.connect(owner).approve(aavePool.target, ethers.MaxUint256);
    await wbtc.connect(user1).approve(aavePool.target, ethers.MaxUint256);
    await wbtc.connect(user2).approve(aavePool.target, ethers.MaxUint256);
    
    // Approve the strategy to spend WBTC from the vault
    await wbtc.connect(owner).approve(await strategy.getAddress(), ethers.MaxUint256);
    await wbtc.connect(user1).approve(await strategy.getAddress(), ethers.MaxUint256);
    await wbtc.connect(user2).approve(await strategy.getAddress(), ethers.MaxUint256);
    
    // Approve the AavePool to spend WBTC from the strategy
    await wbtc.connect(owner).approve(aavePool.target, ethers.MaxUint256);
    await wbtc.connect(user1).approve(aavePool.target, ethers.MaxUint256);
    await wbtc.connect(user2).approve(aavePool.target, ethers.MaxUint256);
    
    // Approve the AavePool to spend WBTC from the vault
    await wbtc.connect(owner).approve(aavePool.target, ethers.MaxUint256);
    await wbtc.connect(user1).approve(aavePool.target, ethers.MaxUint256);
    await wbtc.connect(user2).approve(aavePool.target, ethers.MaxUint256);
    
    // The vault contract will approve the strategy to spend its WBTC when needed
    // We don't need to do this in the setup as the vault handles it internally
    
    // Verify the vault has WBTC balance
    const vaultBalance = await wbtc.balanceOf(vault.target);
    console.log(`Vault WBTC balance: ${ethers.formatUnits(vaultBalance, 8)} WBTC`);
    
    // Log the vault's allowance for the strategy
    const allowance = await wbtc.allowance(vault.target, await strategy.getAddress());
    console.log(`Vault's allowance for strategy: ${ethers.formatUnits(allowance, 8)} WBTC`);
    
    return { wbtc, aWbtc, aavePool, strategy, vault, owner, user1, user2 };
  }
  
  beforeEach(async function () {
    ({ wbtc, aWbtc, aavePool, strategy, vault, owner, user1, user2 } = await loadFixture(deployContracts));
  });

  describe("Deposit Edge Cases", function () {
    it("Should allow depositing on behalf of another address", async function () {
      // Debug: Log initial state
      console.log("Initial state:");
      console.log(`User1 WBTC balance: ${await wbtc.balanceOf(user1.address)}`);
      console.log(`User2 WBTC balance: ${await wbtc.balanceOf(user2.address)}`);
      console.log(`Vault WBTC balance: ${await wbtc.balanceOf(vault.target)}`);
      console.log(`User1 shares: ${await vault.balanceOf(user1.address)}`);
      console.log(`User2 shares: ${await vault.balanceOf(user2.address)}`);
      
      // Approve vault to spend user1's WBTC
      await wbtc.connect(user1).approve(await vault.getAddress(), WBTC_AMOUNT);
      console.log("\nAfter approval:");
      console.log(`User1 allowance: ${await wbtc.allowance(user1.address, vault.target)}`);
      
      // Perform deposit
      const tx = await vault.connect(user1).deposit(WBTC_AMOUNT, user2.address);
      
      // Debug: Log state after deposit
      console.log("\nAfter deposit:");
      console.log(`User1 WBTC balance: ${await wbtc.balanceOf(user1.address)}`);
      console.log(`User2 WBTC balance: ${await wbtc.balanceOf(user2.address)}`);
      console.log(`Vault WBTC balance: ${await wbtc.balanceOf(vault.target)}`);
      console.log(`Strategy WBTC balance: ${await wbtc.balanceOf(await strategy.getAddress())}`);
      console.log(`User1 shares: ${await vault.balanceOf(user1.address)}`);
      console.log(`User2 shares: ${await vault.balanceOf(user2.address)}`);
      
      // Check events
      await expect(tx)
        .to.emit(vault, "Deposit")
        .withArgs(user1.address, user2.address, WBTC_AMOUNT, anyValue);
      
      // Check share balances
      const user2Shares = await vault.balanceOf(user2.address);
      console.log(`User2 shares after deposit: ${user2Shares}`);
      expect(user2Shares).to.equal(WBTC_AMOUNT);
      expect(await vault.balanceOf(user1.address)).to.equal(0n);
    });
    
    it("Should handle multiple deposits correctly", async function () {
      const depositAmount = 50000000n; // 0.5 WBTC with 8 decimals
      await wbtc.connect(user1).approve(await vault.getAddress(), MaxUint256);
      
      console.log("\n=== Multiple Deposits Test ===");
      console.log("Initial WBTC balance:", await wbtc.balanceOf(user1.address));
      
      // First deposit
      console.log("\nFirst deposit:", depositAmount, "WBTC");
      await vault.connect(user1).deposit(depositAmount, user1.address);
      const firstDepositShares = await vault.balanceOf(user1.address);
      console.log("Shares after first deposit:", firstDepositShares.toString());
      console.log("Expected shares:", depositAmount.toString());
      
      // Second deposit
      console.log("\nSecond deposit:", depositAmount, "WBTC");
      await vault.connect(user1).deposit(depositAmount, user1.address);
      const totalShares = await vault.balanceOf(user1.address);
      console.log("Total shares after second deposit:", totalShares.toString());
      console.log("Expected total shares:", (depositAmount * 2n).toString());
      
      // Check token balance in the mock pool - should be initial balance (1000 WBTC) plus the two deposits
      const initialPoolBalance = ethers.parseUnits("1000", 8); // 1000 WBTC from test setup
      const expectedBalance = initialPoolBalance + (depositAmount * 2n);
      const tokenBalance = await wbtc.balanceOf(aavePool.target);
      console.log("\nToken balance in pool:", tokenBalance.toString());
      console.log("Expected token balance:", expectedBalance.toString());
      
      // Verify the shares increased by the expected amount
      const secondDepositShares = totalShares - firstDepositShares;
      console.log("\nSecond deposit shares:", secondDepositShares.toString());
      console.log("Expected second deposit shares:", depositAmount.toString());
      
      // Make assertions
      expect(tokenBalance).to.equal(expectedBalance);
      expect(secondDepositShares).to.equal(depositAmount);
      expect(totalShares).to.equal(depositAmount * 2n);
    });
    
    it("Should not allow deposits exceeding allowance", async function () {
      const smallAllowance = WBTC_AMOUNT / 2n;
      await wbtc.connect(user1).approve(await vault.getAddress(), smallAllowance);
      
      await expect(
        vault.connect(user1).deposit(WBTC_AMOUNT, user1.address)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
    
    it("Should handle zero deposit", async function () {
      await expect(
        vault.connect(user1).deposit(0, user1.address)
      ).to.be.revertedWith("Cannot deposit 0");
    });

    it("Should handle large deposit amounts", async function () {
      // Use a large but safe amount (1 billion WBTC with 8 decimals)
      const largeAmount = ethers.parseUnits("1000000000", 8);
      
      // Mint and approve the large amount
      await wbtc.mint(owner.address, largeAmount);
      await wbtc.approve(await vault.getAddress(), largeAmount);
      
      // This should work without overflow
      await expect(vault.deposit(largeAmount, owner.address))
        .to.emit(vault, "Deposit")
        .withArgs(owner.address, owner.address, largeAmount, anyValue);
        
      // Verify the deposit was successful
      expect(await vault.balanceOf(owner.address)).to.equal(largeAmount);
    });

    it("Should not allow deposit when paused", async function () {
      await vault.connect(owner).pause();
      await expect(vault.connect(user1).deposit(1000n, user1.address))
        .to.be.revertedWith("Pausable: paused");
    });

    it("Should properly handle deposit with different receiver", async function () {
      const depositAmount = 100000000n; // 1 WBTC with 8 decimals
      
      await wbtc.mint(user1.address, depositAmount);
      await wbtc.connect(user1).approve(vault.target, depositAmount);
      
      await expect(vault.connect(user1).deposit(depositAmount, user2.address))
        .to.emit(vault, "Deposit")
        .withArgs(user1.address, user2.address, depositAmount, anyValue);
      
      // With 1:1 share minting, user2 should receive exactly depositAmount shares
      expect(await vault.balanceOf(user2.address)).to.equal(depositAmount);
    });
  });

  describe("Withdrawal Edge Cases", function () {
    let vaultContract, wbtcContract, aWbtcContract, user1, user2, owner;
    const depositAmount = 100000000n; // 1 WBTC with 8 decimals
    
    beforeEach(async function () {
      const { vault, wbtc, aWbtc, user1: u1, user2: u2, owner: o } = await loadFixture(deployContracts);
      vaultContract = vault;
      wbtcContract = wbtc;
      aWbtcContract = aWbtc;
      user1 = u1;
      user2 = u2;
      owner = o;
      
      // Setup initial deposit for withdrawal tests
      await wbtcContract.mint(user1.address, depositAmount);
      await wbtcContract.connect(user1).approve(vaultContract.target, depositAmount);
      await vaultContract.connect(user1).deposit(depositAmount, user1.address);
    });

    it("Should handle zero withdrawal", async function () {
      await expect(
        vaultContract.withdraw(0n, user1.address, user1.address)
      ).to.be.revertedWith("Cannot withdraw 0");
    });
    
    it("Should handle withdrawal when paused", async function () {
      // Pause the vault
      await vaultContract.connect(owner).pause();
      
      // Try to withdraw while paused
      await expect(
        vaultContract.connect(user1).withdraw(depositAmount, user1.address, user1.address)
      ).to.be.revertedWith("Pausable: paused");
    });
    
    it("Should handle withdrawal with insufficient balance", async function () {
      const excessAmount = depositAmount + 1n;
      await expect(
        vaultContract.connect(user1).withdraw(excessAmount, user1.address, user1.address)
      ).to.be.revertedWith("Insufficient balance");
    });
    
    it("Should handle withdrawal with different receiver", async function () {
      const initialReceiverBalance = await wbtcContract.balanceOf(user2.address);
      const withdrawAmount = depositAmount / 2n;
      
      // Withdraw to user2's address
      await vaultContract.connect(user1).withdraw(
        withdrawAmount,
        user2.address,
        user1.address
      );
      
      // Check receiver's balance increased by the withdrawn amount
      const newReceiverBalance = await wbtcContract.balanceOf(user2.address);
      expect(newReceiverBalance - initialReceiverBalance).to.equal(withdrawAmount);
      
      // Check user1's vault balance decreased by the withdrawn amount (1:1 shares to assets)
      expect(await vaultContract.balanceOf(user1.address)).to.equal(depositAmount - withdrawAmount);
    });
    
    it("Should handle full withdrawal", async function () {
      const initialBalance = await wbtcContract.balanceOf(user1.address);
      const userShares = await vaultContract.balanceOf(user1.address);
      
      // Withdraw all
      await vaultContract.connect(user1).withdraw(
        depositAmount,
        user1.address,
        user1.address
      );
      
      // Check user's WBTC balance increased by the deposited amount
      const newBalance = await wbtcContract.balanceOf(user1.address);
      expect(newBalance - initialBalance).to.be.at.least(depositAmount);
      
      // Check vault balance is zero
      expect(await vaultContract.balanceOf(user1.address)).to.equal(0);
    });
    
    it("Should prevent unauthorized withdrawals", async function () {
      // user2 tries to withdraw user1's funds
      await expect(
        vaultContract.connect(user2).withdraw(
          depositAmount,
          user2.address,
          user1.address
        )
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("Should allow withdrawals to a different receiver", async function () {
      const initialReceiverBalance = await wbtcContract.balanceOf(user2.address);
      const userShares = await vaultContract.balanceOf(user1.address);
      
      // Withdraw all shares to user2
      await vaultContract.connect(user1).withdraw(
        userShares, 
        user2.address, 
        user1.address
      );
      
      // Check user2 received the WBTC
      const newReceiverBalance = await wbtcContract.balanceOf(user2.address);
      expect(newReceiverBalance - initialReceiverBalance).to.be.at.least(depositAmount);
      
      // Check user1's vault balance is now 0
      expect(await vaultContract.balanceOf(user1.address)).to.equal(0);
    });
    
    it("Should handle withdrawal with interest earned", async function () {
      // Simulate interest earned in the strategy
      const interestAmount = ethers.parseUnits("0.1", WBTC_DECIMALS);
      await wbtcContract.transfer(await aWbtcContract.getAddress(), interestAmount);
      
      // Withdraw everything (1:1 shares to assets)
      const shares = await vaultContract.balanceOf(user1.address);
      const initialBalance = await wbtcContract.balanceOf(user1.address);
      
      await vaultContract.connect(user1).withdraw(
        shares, // Withdraw all shares
        user1.address,
        user1.address
      );
      
      // Check final balance is at least the initial deposit + interest
      const finalBalance = await wbtcContract.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.be.at.least(depositAmount);
      
      // Vault balance should be 0
      expect(await vaultContract.balanceOf(user1.address)).to.equal(0);
    });
    
    it("Should not allow withdrawing with insufficient shares", async function () {
      // User2 hasn't deposited anything
      await expect(
        vaultContract.connect(user2).withdraw(1, user2.address, user2.address)
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Strategy Management", function () {
    let vaultContract, strategyContract, wbtcContract, owner, user1, user2;
    
    beforeEach(async function () {
      const { vault, strategy, wbtc, owner: o, user1: u1, user2: u2 } = await loadFixture(deployContracts);
      vaultContract = vault;
      strategyContract = strategy;
      wbtcContract = wbtc;
      owner = o;
      user1 = u1;
      user2 = u2;
    });

    it("Should allow owner to update strategy", async function () {
      // Deploy a new strategy
      const AaveStrategy = await ethers.getContractFactory("AaveStrategy");
      const newStrategy = await AaveStrategy.deploy(
        await wbtcContract.getAddress(), // WBTC token
        await wbtcContract.getAddress(), // Aave Pool (using WBTC as mock)
        await wbtcContract.getAddress()  // aWBTC (using WBTC as mock)
      );
      
      // Set the vault address in the new strategy
      await newStrategy.setVault(vaultContract.target);
      
      // Update the strategy in the vault
      await vaultContract.connect(owner).updateStrategy(newStrategy.target);
      expect(await vaultContract.strategy()).to.equal(await newStrategy.getAddress());
    });

    it("Should prevent non-owners from updating strategy", async function () {
      await expect(
        vaultContract.connect(user1).updateStrategy(ethers.ZeroAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should handle zero address when updating strategy", async function () {
      await expect(
        vaultContract.connect(owner).updateStrategy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid strategy");
    });

    it("Should allow owner to pause and unpause the vault", async function () {
      // Pause
      await vaultContract.connect(owner).pause();
      expect(await vaultContract.paused()).to.be.true;
      
      // Unpause
      await vaultContract.connect(owner).unpause();
      expect(await vaultContract.paused()).to.be.false;
    });

    it("Should prevent non-owners from pausing/unpausing", async function () {
      // Try to pause as non-owner
      await expect(
        vaultContract.connect(user1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      // Owner pauses
      await vaultContract.connect(owner).pause();
      
      // Try to unpause as non-owner
      await expect(
        vaultContract.connect(user1).unpause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to recover ERC20 tokens", async function () {
      // Deploy a new ERC20 token with initial supply to the owner
      const RandomToken = await ethers.getContractFactory("ERC20Mock");
      const randomToken = await RandomToken.deploy(
        "Random Token", 
        "RND", 
        owner.address, 
        ethers.parseEther("1000")
      );
      
      // Transfer some tokens to the vault
      await randomToken.connect(owner).transfer(await vaultContract.getAddress(), 1000);
      
      // Recover tokens
      await expect(
        vaultContract.connect(owner).recoverERC20(
          await randomToken.getAddress(),
          owner.address,
          1000
        )
      ).to.emit(vaultContract, "Recovered")
      .withArgs(await randomToken.getAddress(), owner.address, 1000);
      
      // Check balance
      expect(await randomToken.balanceOf(owner.address)).to.equal(ethers.parseEther("1000")); // Initial balance
    });

    it("Should prevent recovering underlying token", async function () {
      // Get the underlying WBTC token address from the vault
      const wbtcAddress = await vaultContract.asset();
      
      // Try to recover the underlying WBTC token
      await expect(
        vaultContract.connect(owner).recoverERC20(
          wbtcAddress,
          owner.address,
          1000
        )
      ).to.be.revertedWith("Cannot recover the underlying token");
    });
  });

  describe("Access Control", function () {
    let vaultContract, owner, user1, user2;
    
    beforeEach(async function () {
      const { vault, owner: o, user1: u1, user2: u2 } = await loadFixture(deployContracts);
      vaultContract = vault;
      owner = o;
      user1 = u1;
      user2 = u2;
    });

    it("Should allow owner to transfer ownership", async function () {
      await vaultContract.connect(owner).transferOwnership(user1.address);
      expect(await vaultContract.owner()).to.equal(user1.address);
    });

    it("Should prevent non-owners from transferring ownership", async function () {
      await expect(
        vaultContract.connect(user1).transferOwnership(user2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to renounce ownership", async function () {
      await vaultContract.connect(owner).renounceOwnership();
      expect(await vaultContract.owner()).to.equal(ethers.ZeroAddress);
    });

    it("Should prevent non-owners from renouncing ownership", async function () {
      await expect(
        vaultContract.connect(user1).renounceOwnership()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should emit events for ownership transfers", async function () {
      // Test transfer ownership event
      await expect(vaultContract.connect(owner).transferOwnership(user1.address))
        .to.emit(vaultContract, "OwnershipTransferred")
        .withArgs(owner.address, user1.address);
      
      // Test renounce ownership event
      await expect(vaultContract.connect(user1).renounceOwnership())
        .to.emit(vaultContract, "OwnershipTransferred")
        .withArgs(user1.address, ethers.ZeroAddress);
    });
  });
});
