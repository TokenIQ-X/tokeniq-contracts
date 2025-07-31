import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Contract } from "ethers";

describe("LSTBTCVault", function () {
  let wbtc: Contract;
  let aWbtc: Contract;
  let aavePool: Contract;
  let rewardsController: Contract;
  let strategy: Contract;
  let vault: Contract;
  
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  
  const WBTC_DECIMALS = 8;
  const WBTC_AMOUNT = ethers.parseUnits("1", WBTC_DECIMALS);
  
  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock WBTC
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    wbtc = await ERC20Mock.deploy("Wrapped BTC", "WBTC", owner.address, ethers.utils.parseUnits("1000", WBTC_DECIMALS));
    await wbtc.deployed();
    
    // Deploy mock aWBTC
    aWbtc = await ERC20Mock.deploy("Aave Interest Bearing WBTC", "aWBTC", owner.address, 0);
    await aWbtc.deployed();
    
    // Deploy mock Aave Pool
    const AavePoolMock = await ethers.getContractFactory("AavePoolMock");
    aavePool = await AavePoolMock.deploy(wbtc.address, aWbtc.address);
    await aavePool.deployed();
    
    // Deploy mock Rewards Controller
    const RewardsControllerMock = await ethers.getContractFactory("RewardsControllerMock");
    rewardsController = await RewardsControllerMock.deploy();
    await rewardsController.deployed();
    
    // Deploy AaveStrategy
    const AaveStrategy = await ethers.getContractFactory("AaveStrategy");
    strategy = await AaveStrategy.deploy(
      wbtc.address,
      aavePool.address,
      aWbtc.address
    );
    await strategy.deployed();
    
    // Deploy LSTBTCVault
    const LSTBTCVault = await ethers.getContractFactory("LSTBTCVault");
    vault = await LSTBTCVault.deploy(wbtc.address, strategy.address);
    await vault.deployed();
    
    // Set vault in strategy
    await strategy.setVault(vault.address);
    
    // Transfer WBTC to users for testing
    await wbtc.transfer(user1.address, WBTC_AMOUNT.mul(2));
    await wbtc.transfer(user2.address, WBTC_AMOUNT);
  });
  
  describe("Deployment", function () {
    it("Should set the correct WBTC token", async function () {
      expect(await vault.asset()).to.equal(wbtc.address);
    });
    
    it("Should set the correct strategy", async function () {
      expect(await strategy.vault()).to.equal(vault.address);
    });
  });
  
  describe("Deposit", function () {
    it("Should allow users to deposit WBTC and receive LSTBTC", async function () {
      // Approve vault to spend user1's WBTC
      await (wbtc as any).connect(user1).approve(vault.target, WBTC_AMOUNT);
      
      // Deposit WBTC
      await expect((vault as any).connect(user1).deposit(WBTC_AMOUNT, user1.address))
        .to.emit(vault, "Deposit")
        .withArgs(user1.address, user1.address, WBTC_AMOUNT, WBTC_AMOUNT);
      
      // Check balances
      expect(await vault.balanceOf(user1.address)).to.equal(WBTC_AMOUNT);
      expect(await wbtc.balanceOf(vault.target)).to.equal(0); // All staked
      expect(await aWbtc.balanceOf(strategy.target)).to.equal(WBTC_AMOUNT);
    });
    
    it("Should not allow zero amount deposits", async function () {
      await expect(
        (vault as any).connect(user1).deposit(0, user1.address)
      ).to.be.revertedWith("Cannot deposit 0");
    });
  });
  
  describe("Withdraw", function () {
    it("Should allow users to withdraw WBTC by burning LSTBTC", async function () {
      const initialWBTCBalance = await wbtc.balanceOf(user1.address);
      
      // Withdraw WBTC
      await expect((vault as any).connect(user1).withdraw(WBTC_AMOUNT, user1.address, user1.address))
        .to.emit(vault, "Withdraw")
        .withArgs(user1.address, user1.address, user1.address, WBTC_AMOUNT, WBTC_AMOUNT);
      
      // Check balances
      expect(await vault.balanceOf(user1.address)).to.equal(0);
      expect(await wbtc.balanceOf(user1.address)).to.be.closeTo(
        initialWBTCBalance,
        ethers.parseUnits("0.01", WBTC_DECIMALS) // Allow for small rounding errors
      );
    });
    
    it("Should not allow withdrawing more than balance", async function () {
      const largeAmount = WBTC_AMOUNT * 2n;
      await expect(
        (vault as any).connect(user1).withdraw(largeAmount, user1.address, user1.address)
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });
  });
  
  describe("Strategy", function () {
    it("Should allow owner to update strategy", async function () {
      const newStrategy = await (await ethers.getContractFactory("AaveStrategy")).deploy(
        wbtc.address,
        aavePool.address,
        aWbtc.address
      );
      await newStrategy.deployed();
      
      await expect((vault as any).updateStrategy(newStrategy.address))
        .to.emit(vault, "StrategyUpdated")
        .withArgs(newStrategy.address);
      
      expect(await vault.strategy()).to.equal(newStrategy.address);
    });
    
    it("Should not allow non-owners to update strategy", async function () {
      await expect(
        (vault as any).connect(user1).updateStrategy(ethers.ZeroAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  
  describe("Pausable", function () {
    it("Should allow owner to pause and unpause", async function () {
      await vault.pause();
      expect(await vault.paused()).to.be.true;
      
      await vault.unpause();
      expect(await vault.paused()).to.be.false;
    });
    
    it("Should not allow deposits when paused", async function () {
      await vault.pause();
      
      await (wbtc as any).connect(user1).approve(vault.target, WBTC_AMOUNT);
      await expect(
        (vault as any).connect(user1).deposit(WBTC_AMOUNT, user1.address)
      ).to.be.revertedWith("Pausable: paused");
      
      await vault.unpause();
    });
  });
});
