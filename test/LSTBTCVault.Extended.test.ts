import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
import { MaxUint256, ZeroAddress } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

// Import contract types
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

// Type for contract with address
type ContractWithAddress = {
  getAddress(): Promise<string>;
  target: string;
  connect(signer: HardhatEthersSigner): any;
  [key: string]: any;
};

// ERC20 token interface
type ERC20Mock = ContractWithAddress & {
  balanceOf(account: string): Promise<bigint>;
  transfer(to: string, amount: bigint): Promise<boolean>;
  transferFrom(sender: string, recipient: string, amount: bigint): Promise<boolean>;
  approve(spender: string, amount: bigint): Promise<boolean>;
  allowance(owner: string, spender: string): Promise<bigint>;
  mint(to: string, amount: bigint): Promise<any>;
};

// AaveStrategy interface
type AaveStrategy = ContractWithAddress & {
  setVault(vault: string): Promise<any>;
  asset(): Promise<string>;
  aToken(): Promise<string>;
  aavePool(): Promise<string>;
  rewardsController(): Promise<string>;
  rewardsToken(): Promise<string>;
  totalAssets(): Promise<bigint>;
  convertToShares(assets: bigint): Promise<bigint>;
  convertToAssets(shares: bigint): Promise<bigint>;
  maxWithdraw(owner: string): Promise<bigint>;
  maxRedeem(owner: string): Promise<bigint>;
  previewWithdraw(assets: bigint): Promise<bigint>;
  previewRedeem(shares: bigint): Promise<bigint>;
  withdraw(assets: bigint, receiver: string, owner: string): Promise<bigint>;
  redeem(shares: bigint, receiver: string, owner: string): Promise<bigint>;
  harvest(): Promise<bigint>;
  emergencyWithdraw(): Promise<void>;
};

// AavePool mock interface
type AavePoolMock = ContractWithAddress & {
  supply(
    asset: string,
    amount: bigint,
    onBehalfOf: string,
    referralCode: number
  ): Promise<any>;
  withdraw(
    asset: string,
    amount: bigint,
    to: string
  ): Promise<any>;
};

// RewardsController mock interface
type RewardsControllerMock = ContractWithAddress & {
  getRewardsBalance(
    assets: string[],
    user: string
  ): Promise<bigint>;
  claimRewards(
    assets: string[],
    amount: bigint,
    to: string,
    reward?: string
  ): Promise<bigint>;
};

// LSTBTCVault interface
type LSTBTCVault = ContractWithAddress & {
  updateStrategy(newStrategy: string): Promise<any>;
  emergencyWithdraw(): Promise<any>;
  claimRewards(): Promise<any>;
  deposit(amount: bigint, to: string): Promise<any>;
  withdraw(amount: bigint, to: string, from: string): Promise<any>;
  pause(): Promise<any>;
  unpause(): Promise<any>;
  paused(): Promise<boolean>;
  strategy(): Promise<string>;
  asset(): Promise<string>;
  totalAssets(): Promise<bigint>;
  convertToShares(assets: bigint): Promise<bigint>;
  convertToAssets(shares: bigint): Promise<bigint>;
  maxDeposit(receiver: string): Promise<bigint>;
  maxWithdraw(owner: string): Promise<bigint>;
  maxRedeem(owner: string): Promise<bigint>;
  previewDeposit(assets: bigint): Promise<bigint>;
  previewWithdraw(assets: bigint): Promise<bigint>;
  previewRedeem(shares: bigint): Promise<bigint>;
  previewMint(shares: bigint): Promise<bigint>;
  mint(shares: bigint, receiver: string): Promise<bigint>;
  redeem(shares: bigint, receiver: string, owner: string): Promise<bigint>;
  // ERC20 methods
  totalSupply(): Promise<bigint>;
  balanceOf(account: string): Promise<bigint>;
  allowance(owner: string, spender: string): Promise<bigint>;
  approve(spender: string, amount: bigint): Promise<boolean>;
  transfer(recipient: string, amount: bigint): Promise<boolean>;
  transferFrom(sender: string, recipient: string, amount: bigint): Promise<boolean>;
  // Additional ERC20 methods
  increaseAllowance?(spender: string, addedValue: bigint): Promise<boolean>;
  decreaseAllowance?(spender: string, subtractedValue: bigint): Promise<boolean>;
  // ERC20 metadata
  name?(): Promise<string>;
  symbol?(): Promise<string>;
  decimals?(): Promise<number>;
  // Permit extension
  DOMAIN_SEPARATOR?(): Promise<string>;
  PERMIT_TYPEHASH?(): Promise<string>;
  nonces?(owner: string): Promise<bigint>;
  permit?(owner: string, spender: string, value: bigint, deadline: bigint, v: number, r: string, s: string): Promise<void>;
};

describe("LSTBTCVault Extended Tests", function () {
  let wbtc: ERC20Mock;
  let aWbtc: ERC20Mock;
  let aavePool: AavePoolMock;
  let strategy: AaveStrategy;
  let vault: LSTBTCVault;
  let rewardsController: RewardsControllerMock;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  
  const WBTC_DECIMALS = 8;
  const WBTC_AMOUNT = ethers.parseUnits("1", WBTC_DECIMALS);
  const SMALL_AMOUNT = ethers.parseUnits("0.1", WBTC_DECIMALS);
  
  async function deployContracts() {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock WBTC
    const WBTC = await ethers.getContractFactory("ERC20Mock");
    const wbtcContract = await WBTC.deploy("Wrapped Bitcoin", "WBTC");
    wbtc = wbtcContract as unknown as ERC20Mock;
    
    // Deploy mock aWBTC
    const AWBTC = await ethers.getContractFactory("ERC20Mock");
    const aWbtcContract = await AWBTC.deploy("Aave WBTC", "aWBTC");
    aWbtc = aWbtcContract as unknown as ERC20Mock;
    
    // Deploy mock Aave Pool
    const AavePool = await ethers.getContractFactory("AavePoolMock");
    const aavePoolContract = await AavePool.deploy();
    aavePool = aavePoolContract as unknown as AavePoolMock;
    
    // Deploy mock rewards controller
    const RewardsController = await ethers.getContractFactory("MockRewardsController");
    const rewardsControllerContract = await RewardsController.deploy();
    rewardsController = rewardsControllerContract as unknown as RewardsControllerMock;
    
    // Deploy AaveStrategy
    const AaveStrategy = await ethers.getContractFactory("AaveStrategy");
    const strategyContract = await AaveStrategy.deploy(
      await wbtc.getAddress(),
      await aWbtc.getAddress(),
      await aavePool.getAddress()
    );
    strategy = strategyContract as unknown as AaveStrategy;
    
    // Deploy LSTBTCVault
    const LSTBTCVault = await ethers.getContractFactory("LSTBTCVault");
    const vaultContract = await LSTBTCVault.deploy(
      await wbtc.getAddress(),
      await strategy.getAddress(),
      "LST BTC Vault",
      "LST-BTC"
    );
    vault = vaultContract as unknown as LSTBTCVault;
    
    // Set vault in strategy
    await strategy.setVault(await vault.getAddress());
    
    // Mint WBTC to users
    const amount = ethers.parseEther("10");
    await wbtc.mint(owner.address, amount);
    await wbtc.mint(user1.address, amount);
    await wbtc.mint(user2.address, amount);
    
    // Approve vault to spend WBTC
    await wbtc.connect(user1).approve(await vault.getAddress(), MaxUint256);
    await wbtc.connect(user2).approve(await vault.getAddress(), MaxUint256);
    
    return { wbtc, aWbtc, aavePool, strategy, vault, owner, user1, user2 };
  }
  
  beforeEach(async function () {
    ({ wbtc, aWbtc, aavePool, strategy, vault, owner, user1, user2 } = await loadFixture(deployContracts));
  });

  describe("Deposit Edge Cases", function () {
    it("Should allow depositing on behalf of another address", async function () {
      const vaultContract = vault as unknown as LSTBTCVault;
      const wbtcContract = wbtc as unknown as ERC20Mock;
      
      await wbtcContract.connect(user1).approve(await vaultContract.getAddress(), WBTC_AMOUNT);
      
      await expect(vaultContract.connect(user1).deposit(WBTC_AMOUNT, user2.address))
        .to.emit(vaultContract, "Deposit")
        .withArgs(user1.address, user2.address, WBTC_AMOUNT, anyValue);
      
      expect(await vaultContract.balanceOf(user2.address)).to.equal(WBTC_AMOUNT);
      expect(await vaultContract.balanceOf(user1.address)).to.equal(0n);
    });
    
    it("Should handle multiple deposits correctly", async function () {
      const vaultContract = vault as unknown as LSTBTCVault;
      const wbtcContract = wbtc as unknown as ERC20Mock;
      const aWbtcContract = aWbtc as unknown as ERC20Mock;
      const strategyContract = strategy as unknown as AaveStrategy;
      
      const depositAmount = 50000000n; // 0.5 WBTC with 8 decimals
      await wbtcContract.connect(user1).approve(await vaultContract.getAddress(), 115792089237316195423570985008687907853269984665640564039457584007913129639935n);
      
      // First deposit
      await vaultContract.connect(user1).deposit(depositAmount, user1.address);
      expect(await vaultContract.balanceOf(user1.address)).to.equal(depositAmount);
      
      // Second deposit
      await vaultContract.connect(user1).deposit(depositAmount, user1.address);
      expect(await vaultContract.balanceOf(user1.address)).to.equal(depositAmount * 2n);
      
      // Check total staked
      expect(await aWbtcContract.balanceOf(await strategyContract.getAddress())).to.equal(depositAmount * 2n);
    });
    
    it("Should not allow deposits exceeding allowance", async function () {
      const vaultContract = vault as unknown as LSTBTCVault;
      const wbtcContract = wbtc as unknown as ERC20Mock;
      
      const smallAllowance = WBTC_AMOUNT / 2n;
      await wbtcContract.connect(user1).approve(await vaultContract.getAddress(), smallAllowance);
      
      await expect(
        vaultContract.connect(user1).deposit(WBTC_AMOUNT, user1.address)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
    
    it("Should handle zero deposit", async function () {
      const { vault, user1 } = await loadFixture(deployContracts);
      await expect(vault.connect(user1).deposit(0n, user1.address))
        .to.be.revertedWith("ZERO_ASSETS");
    });

    it("Should handle deposit with max uint256", async function () {
      const { wbtc, vault, user1 } = await loadFixture(deployContracts);
      const maxUint256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;
      
      // Mint max uint256 to user1
      await wbtc.mint(user1.address, maxUint256);
      await wbtc.connect(user1).approve(vault.target, maxUint256);
      
      // This should not revert due to overflow
      await expect(vault.connect(user1).deposit(maxUint256, user1.address))
        .to.emit(vault, "Deposit")
        .withArgs(user1.address, user1.address, maxUint256, anyValue);
    });

    it("Should not allow deposit when paused", async function () {
      const { vault, owner, user1 } = await loadFixture(deployContracts);
      await vault.connect(owner).pause();
      await expect(vault.connect(user1).deposit(1000n, user1.address))
        .to.be.revertedWith("Pausable: paused");
    });

    it("Should properly handle deposit with different receiver", async function () {
      const { wbtc, vault, user1, user2 } = await loadFixture(deployContracts);
      const depositAmount = 100000000n; // 1 WBTC with 8 decimals
      
      await wbtc.mint(user1.address, depositAmount);
      await wbtc.connect(user1).approve(vault.target, depositAmount);
      
      await expect(vault.connect(user1).deposit(depositAmount, user2.address))
        .to.emit(vault, "Deposit")
        .withArgs(user1.address, user2.address, depositAmount, anyValue);
      
      expect(await vault.balanceOf(user2.address)).to.equal(
        await vault.convertToShares(depositAmount)
      );
    });
  });

  describe("Withdrawal Edge Cases", function () {
    let vaultContract: LSTBTCVault;
    let wbtcContract: ERC20Mock;
    let aWbtcContract: ERC20Mock;
    let user1: HardhatEthersSigner;
    let user2: HardhatEthersSigner;
    let owner: HardhatEthersSigner;
    
    const depositAmount = 100000000n; // 1 WBTC with 8 decimals
    
    beforeEach(async function () {
      const { vault, wbtc, aWbtc, user1: u1, user2: u2, owner: o } = await loadFixture(deployContracts);
      vaultContract = vault as unknown as LSTBTCVault;
      wbtcContract = wbtc as unknown as ERC20Mock;
      aWbtcContract = aWbtc as unknown as ERC20Mock;
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
      ).to.be.revertedWith("ZERO_ASSETS");
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
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });
    
    it("Should handle withdrawal with different receiver", async function () {
      const initialReceiverBalance = await wbtcContract.balanceOf(user2.address);
      
      // Withdraw to user2's address
      await vaultContract.connect(user1).withdraw(
        depositAmount / 2n,
        user2.address,
        user1.address
      );
      
      // Check receiver's balance increased
      const newReceiverBalance = await wbtcContract.balanceOf(user2.address);
      expect(newReceiverBalance - initialReceiverBalance).to.equal(depositAmount / 2n);
      
      // Check user1's vault balance decreased
      expect(await vaultContract.balanceOf(user1.address)).to.be.lessThan(
        await vaultContract.convertToShares(depositAmount)
      );
    });
    
    it("Should handle full withdrawal", async function () {
      const initialBalance = await wbtcContract.balanceOf(user1.address);
      
      // Withdraw all
      await vaultContract.connect(user1).withdraw(
        depositAmount,
        user1.address,
        user1.address
      );
      
      // Check user's WBTC balance increased
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
      
      await vaultContract.connect(user1).withdraw(
        WBTC_AMOUNT, 
        user2.address, 
        user1.address
      );
      
      expect(await wbtcContract.balanceOf(user2.address)).to.be.closeTo(
        initialReceiverBalance + WBTC_AMOUNT,
        ethers.parseUnits("0.01", WBTC_DECIMALS)
      );
      expect(await vaultContract.balanceOf(user1.address)).to.equal(0);
    });
    
    it("Should handle withdrawal with interest earned", async function () {
      // Simulate interest earned in the strategy
      const interestAmount = ethers.parseUnits("0.1", WBTC_DECIMALS);
      await wbtcContract.transfer(await aWbtcContract.getAddress(), interestAmount);
      
      // Withdraw everything
      const shares = await vaultContract.balanceOf(user1.address);
      await vaultContract.connect(user1).withdraw(
        await vaultContract.convertToAssets(shares),
        user1.address,
        user1.address
      );
      
      // Should have received initial deposit + interest
      const finalBalance = await wbtcContract.balanceOf(user1.address);
      expect(finalBalance).to.be.gt(ethers.parseUnits("1", WBTC_DECIMALS));
    });
    
    it("Should not allow withdrawing with insufficient shares", async function () {
      // User2 hasn't deposited anything
      await expect(
        vaultContract.connect(user2).withdraw(1, user2.address, user2.address)
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });
  });

  describe("Strategy Management", function () {
    let vaultContract: LSTBTCVault;
    let strategyContract: AaveStrategy;
    let wbtcContract: ERC20Mock;
    const depositAmount = WBTC_AMOUNT;
    
    beforeEach(async function () {
      const { vault, strategy, wbtc, aWbtc, aavePool, owner } = await loadFixture(deployContracts);
      vaultContract = vault as unknown as LSTBTCVault;
      strategyContract = strategy as unknown as AaveStrategy;
      wbtcContract = wbtc as unknown as ERC20Mock;
      
      // Set up initial deposit
      await wbtcContract.mint(owner.address, depositAmount);
      await wbtcContract.connect(owner).approve(vaultContract.target, depositAmount);
      await vaultContract.connect(owner).deposit(depositAmount, owner.address);
    });
    
    it("Should not allow updating to zero address", async function () {
      await expect(
        vaultContract.connect(owner).updateStrategy(ZeroAddress)
      ).to.be.revertedWith("Invalid strategy address");
    });
    
    it("Should migrate funds when updating strategy", async function () {
      // Deploy new strategy
      const AaveStrategy = await ethers.getContractFactory("AaveStrategy");
      const newStrategy = await AaveStrategy.deploy(
        wbtcContract.target,
        aWbtc.target,
        aavePool.target
      );
      
      // Get current strategy balance
      const oldStrategyBalance = await wbtcContract.balanceOf(await strategyContract.getAddress());
      
      // Set vault in new strategy
      await newStrategy.setVault(vaultContract.target);
      
      // Update strategy and verify event
      await expect(vaultContract.connect(owner).updateStrategy(await newStrategy.getAddress()))
        .to.emit(vaultContract, "StrategyUpdated")
        .withArgs(await strategyContract.getAddress(), await newStrategy.getAddress());
      
      // Verify new strategy has the funds
      const newStrategyBalance = await wbtcContract.balanceOf(await newStrategy.getAddress());
      expect(newStrategyBalance).to.be.at.least(oldStrategyBalance);
      
      // Verify old strategy has no funds
      expect(await wbtcContract.balanceOf(await strategyContract.getAddress())).to.equal(0);
    });
    
    it("Should handle emergency withdrawal", async function () {
      // Perform emergency withdrawal
      await expect(vaultContract.connect(owner).emergencyWithdraw())
        .to.emit(vaultContract, "EmergencyWithdraw")
        .withArgs(owner.address, anyValue);
      
      // Verify vault has no more assets in strategy
      const strategyBalance = await wbtcContract.balanceOf(await strategyContract.getAddress());
      expect(strategyBalance).to.equal(0);
      
      // Verify vault has the assets
      const vaultBalance = await wbtcContract.balanceOf(vaultContract.target);
      expect(vaultBalance).to.be.at.least(depositAmount);
    });
    
    it("Should not allow non-owner to perform emergency withdrawal", async function () {
      await expect(
        vaultContract.connect(user1).emergencyWithdraw()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should claim rewards correctly", async function () {
      // Simulate rewards accrual
      const rewardsAmount = ethers.parseEther("0.1");
      await wbtcContract.mint(await strategyContract.getAddress(), rewardsAmount);
      
      // Claim rewards
      await expect(vaultContract.connect(owner).claimRewards())
        .to.emit(vaultContract, "RewardsClaimed")
        .withArgs(owner.address, anyValue);
      
      // Verify owner received the rewards
      const ownerBalance = await wbtcContract.balanceOf(owner.address);
      expect(ownerBalance).to.be.at.least(rewardsAmount);
    });
  });

  describe("Access Control", function () {
    it("Should not allow non-owners to pause/unpause", async function () {
      await expect(
        vault.connect(user1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await vault.connect(owner).pause();
      
      await expect(
        vault.connect(user1).unpause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should allow owner to pause and unpause", async function () {
      await expect(vault.connect(owner).pause())
        .to.emit(vault, "Paused")
        .withArgs(owner.address);
      
      expect(await vault.paused()).to.be.true;
      
      await expect(vault.connect(owner).unpause())
        .to.emit(vault, "Unpaused")
        .withArgs(owner.address);
      
      expect(await vault.paused()).to.be.false;
    });
    
    it("Should not allow non-owners to update strategy", async function () {
      const newStrategy = ethers.Wallet.createRandom().address;
      await expect(
        vault.connect(user1).updateStrategy(newStrategy)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should not allow zero address as strategy", async function () {
      await expect(
        vault.connect(owner).updateStrategy(ZeroAddress)
      ).to.be.revertedWith("Invalid strategy address");
    });
    
    it("Should not allow non-owner to claim rewards", async function () {
      await expect(
        vault.connect(user1).claimRewards()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should not allow interactions when paused", async function () {
      await vault.pause();
      
      await wbtc.connect(user1).approve(await vault.getAddress(), WBTC_AMOUNT);
      
      // Test deposit when paused
      await expect(
        vault.connect(user1).deposit(WBTC_AMOUNT, user1.address)
      ).to.be.revertedWith("Pausable: paused");
      
      // Test withdraw when paused (needs to have funds first)
      await vault.unpause();
      await vault.connect(user1).deposit(WBTC_AMOUNT, user1.address);
      await vault.pause();
      
      await expect(
        vault.connect(user1).withdraw(WBTC_AMOUNT, user1.address, user1.address)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("ERC-4626 Compliance", function () {
    it("Should correctly convert between assets and shares", async function () {
      // Initial deposit
      await wbtc.connect(user1).approve(await vault.getAddress(), WBTC_AMOUNT);
      await vault.connect(user1).deposit(WBTC_AMOUNT, user1.address);
      
      // 1:1 conversion when no interest has been earned
      expect(await vault.convertToShares(WBTC_AMOUNT)).to.equal(WBTC_AMOUNT);
      expect(await vault.convertToAssets(WBTC_AMOUNT)).to.equal(WBTC_AMOUNT);
      
      // Simulate interest earned
      const interestAmount = ethers.parseUnits("0.1", WBTC_DECIMALS);
      await wbtc.transfer(await aWbtc.getAddress(), interestAmount);
      
      // Conversion should reflect the increased assets
      expect(await vault.convertToAssets(WBTC_AMOUNT)).to.be.gt(WBTC_AMOUNT);
    });
    
    it("Should calculate max deposit/withdraw/mint/redeem correctly", async function () {
      // Initial deposit
      await wbtc.connect(user1).approve(await vault.getAddress(), WBTC_AMOUNT);
      await vault.connect(user1).deposit(WBTC_AMOUNT, user1.address);
      
      // Check max values for user1
      expect(await vault.maxWithdraw(user1.address)).to.equal(WBTC_AMOUNT);
      expect(await vault.maxRedeem(user1.address)).to.equal(WBTC_AMOUNT);
      
      // Check max values for user2 (no balance)
      expect(await vault.maxWithdraw(user2.address)).to.equal(0);
      expect(await vault.maxRedeem(user2.address)).to.equal(0);
    });
  });

  describe("Strategy Management", function () {
    let vaultContract: LSTBTCVault;
    let strategyContract: AaveStrategy;
    let wbtcContract: ERC20Mock;
    
    beforeEach(async function () {
      // Set up type assertions
      vaultContract = vault as unknown as LSTBTCVault;
      strategyContract = strategy as unknown as AaveStrategy;
      wbtcContract = wbtc as unknown as ERC20Mock;
      
      // Fund user1 with WBTC
      await wbtcContract.mint(user1.address, WBTC_AMOUNT * 2n);
      await wbtcContract.connect(user1).approve(await vaultContract.getAddress(), MaxUint256);
    });

    it("Should allow owner to set a new strategy", async function () {
      // Deploy a new strategy
      const NewStrategy = await ethers.getContractFactory("AaveStrategy");
      const newStrategy = await NewStrategy.deploy(
        await wbtcContract.getAddress(),
        await aWbtc.getAddress(),
        await aavePool.getAddress(),
        await rewardsController.getAddress(),
        await vaultContract.getAddress()
      );
      
      // Set the new strategy
      await vaultContract.connect(owner).setStrategy(await newStrategy.getAddress());
      
      // Verify the strategy was updated
      expect(await vaultContract.strategy()).to.equal(await newStrategy.getAddress());
    });
    
    it("Should not allow non-owner to set strategy", async function () {
      await expect(
        vaultContract.connect(user1).setStrategy(ethers.ZeroAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should migrate assets when strategy is changed", async function () {
      // Make an initial deposit
      const depositAmount = WBTC_AMOUNT;
      await vaultContract.connect(user1).deposit(depositAmount, user1.address);
      
      // Deploy a new strategy
      const NewStrategy = await ethers.getContractFactory("AaveStrategy");
      const newStrategy = await NewStrategy.deploy(
        await wbtcContract.getAddress(),
        await aWbtc.getAddress(),
        await aavePool.getAddress(),
        await rewardsController.getAddress(),
        await vaultContract.getAddress()
      );
      
      // Set the new strategy
      await expect(vaultContract.connect(owner).setStrategy(await newStrategy.getAddress()))
        .to.emit(vaultContract, "StrategyUpdated")
        .withArgs(await strategyContract.getAddress(), await newStrategy.getAddress());
      
      // Verify funds were migrated
      const newStrategyContract = newStrategy as unknown as AaveStrategy;
      const newStrategyBalance = await wbtcContract.balanceOf(await newStrategyContract.getAddress());
      expect(newStrategyBalance).to.be.gt(0);
      
      // Verify old strategy has no funds
      const oldStrategyBalance = await wbtcContract.balanceOf(await strategyContract.getAddress());
      expect(oldStrategyBalance).to.equal(0);
      
      // Verify withdrawals still work
      await vaultContract.connect(user1).withdraw(
        depositAmount / 2n,
        user1.address,
        user1.address
      );
      
      expect(await wbtcContract.balanceOf(user1.address)).to.be.gt(0);
    });
    
    it("Should allow emergency withdrawal from strategy", async function () {
      // Make a deposit
      const depositAmount = WBTC_AMOUNT;
      await vaultContract.connect(user1).deposit(depositAmount, user1.address);
      
      // Emergency withdraw from strategy
      await strategyContract.connect(owner).emergencyWithdraw();
      
      // Verify funds were withdrawn from strategy
      const strategyBalance = await wbtcContract.balanceOf(await strategyContract.getAddress());
      expect(strategyBalance).to.equal(0);
      
      // Verify vault still has the funds
      const vaultBalance = await wbtcContract.balanceOf(await vaultContract.getAddress());
      expect(vaultBalance).to.be.gte(depositAmount);
    });
    
    it("Should not allow non-owner to emergency withdraw", async function () {
      await expect(
        strategyContract.connect(user1).emergencyWithdraw()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
