import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { AssetTokenization, AssetTokenizationFactory } from "../typechain-types";
import { BigNumber } from "ethers";

describe("AssetTokenization", function () {
  let tokenization: AssetTokenization;
  let factory: AssetTokenizationFactory;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  
  // Test ERC20 token for collateral
  let testToken: any;
  
  const TOKEN_NAME = "Test Asset";
  const TOKEN_SYMBOL = "TASSET";
  const ASSET_TYPE = "INVOICE";
  const ASSET_VALUE = ethers.utils.parseEther("1.0");
  const METADATA_URI = "ipfs://test-uri";
  
  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy test ERC20 token
    const TestToken = await ethers.getContractFactory("ERC20Mock");
    testToken = await TestToken.deploy("Test Token", "TST", owner.address, ethers.utils.parseEther("1000"));
    await testToken.deployed();
    
    // Deploy factory
    const Factory = await ethers.getContractFactory("AssetTokenizationFactory");
    factory = await Factory.deploy();
    await factory.deployed();
    
    // Create a new tokenization contract
    await factory.createTokenizationContract(TOKEN_NAME, TOKEN_SYMBOL);
    const tokenizationAddress = (await factory.allTokenizationContracts(0));
    
    // Get tokenization contract instance
    const Tokenization = await ethers.getContractFactory("AssetTokenization");
    tokenization = Tokenization.attach(tokenizationAddress) as AssetTokenization;
    
    // Transfer ownership to addr1 for testing
    await tokenization.transferOwnership(addr1.address);
    
    // Mint some test tokens to addr2 for collateral
    await testToken.transfer(addr2.address, ethers.utils.parseEther("100"));
  });
  
  describe("Deployment", () => {
    it("Should set the correct name and symbol", async () => {
      expect(await tokenization.name()).to.equal(TOKEN_NAME);
      expect(await tokenization.symbol()).to.equal(TOKEN_SYMBOL);
    });
    
    it("Should set the correct owner", async () => {
      expect(await tokenization.owner()).to.equal(addr1.address);
    });
  });
  
  describe("Tokenization", () => {
    it("Should allow tokenizing a new asset", async () => {
      await tokenization.connect(addr1).tokenizeAsset(
        ASSET_TYPE,
        ASSET_VALUE,
        ethers.constants.AddressZero, // Native token
        METADATA_URI
      );
      
      const asset = await tokenization.getAsset(1);
      
      expect(asset.creator).to.equal(addr1.address);
      expect(asset.assetType).to.equal(ASSET_TYPE);
      expect(asset.value).to.equal(ASSET_VALUE);
      expect(asset.isCollateralized).to.be.false;
      expect(asset.isRedeemed).to.be.false;
      expect(await tokenization.ownerOf(1)).to.equal(addr1.address);
    });
    
    it("Should emit AssetTokenized event", async () => {
      await expect(
        tokenization.connect(addr1).tokenizeAsset(
          ASSET_TYPE,
          ASSET_VALUE,
          ethers.constants.AddressZero,
          METADATA_URI
        )
      ).to.emit(tokenization, "AssetTokenized")
       .withArgs(1, addr1.address, ASSET_TYPE, ASSET_VALUE, METADATA_URI);
    });
  });
  
  describe("Collateralization", () => {
    let tokenId: number;
    
    beforeEach(async () => {
      // Tokenize an asset first
      await tokenization.connect(addr1).tokenizeAsset(
        ASSET_TYPE,
        ASSET_VALUE,
        ethers.constants.AddressZero,
        METADATA_URI
      );
      tokenId = 1;
      
      // Approve test token transfer
      await testToken.connect(addr2).approve(tokenization.address, ASSET_VALUE);
    });
    
    it("Should allow collateralizing an asset with ERC20 tokens", async () => {
      await tokenization.connect(addr2).collateralizeAsset(
        tokenId,
        testToken.address,
        ASSET_VALUE
      );
      
      const asset = await tokenization.getAsset(tokenId);
      expect(asset.isCollateralized).to.be.true;
      
      const collateralAmount = await tokenization.collateralAmounts(tokenId);
      expect(collateralAmount).to.equal(ASSET_VALUE);
    });
    
    it("Should emit AssetCollateralized event", async () => {
      await expect(
        tokenization.connect(addr2).collateralizeAsset(
          tokenId,
          testToken.address,
          ASSET_VALUE
        )
      ).to.emit(tokenization, "AssetCollateralized")
       .withArgs(tokenId, addr2.address, testToken.address, ASSET_VALUE);
    });
    
    it("Should prevent transferring a collateralized asset", async () => {
      // Collateralize the asset
      await tokenization.connect(addr2).collateralizeAsset(
        tokenId,
        testToken.address,
        ASSET_VALUE
      );
      
      // Try to transfer the NFT (should fail)
      await expect(
        tokenization.connect(addr1).transferFrom(addr1.address, addr2.address, tokenId)
      ).to.be.revertedWith("Cannot transfer collateralized asset");
    });
  });
  
  describe("Redemption", () => {
    let tokenId: number;
    
    beforeEach(async () => {
      // Tokenize an asset first
      await tokenization.connect(addr1).tokenizeAsset(
        ASSET_TYPE,
        ASSET_VALUE,
        ethers.constants.AddressZero,
        METADATA_URI
      );
      tokenId = 1;
    });
    
    it("Should allow redeeming an asset with native token", async () => {
      const initialBalance = await addr1.getBalance();
      
      // Redeem with native token
      await expect(
        tokenization.connect(addr2).redeemAsset(tokenId, { value: ASSET_VALUE })
      ).to.emit(tokenization, "AssetRedeemed")
       .withArgs(tokenId, addr2.address, ethers.constants.AddressZero, ASSET_VALUE);
      
      // Check NFT ownership transfer
      expect(await tokenization.ownerOf(tokenId)).to.equal(addr2.address);
      
      // Check payment was received by creator
      const finalBalance = await addr1.getBalance();
      expect(finalBalance.gt(initialBalance)).to.be.true;
      
      // Check asset is marked as redeemed
      const asset = await tokenization.getAsset(tokenId);
      expect(asset.isRedeemed).to.be.true;
    });
    
    it("Should allow redeeming an asset with ERC20 token", async () => {
      // Create a new asset with ERC20 payment token
      await tokenization.connect(addr1).tokenizeAsset(
        ASSET_TYPE,
        ASSET_VALUE,
        testToken.address,
        METADATA_URI
      );
      const erc20TokenId = 2;
      
      // Approve token transfer
      await testToken.connect(addr2).approve(tokenization.address, ASSET_VALUE);
      
      // Redeem with ERC20 token
      await expect(
        tokenization.connect(addr2).redeemAsset(erc20TokenId)
      ).to.emit(tokenization, "AssetRedeemed")
       .withArgs(erc20TokenId, addr2.address, testToken.address, ASSET_VALUE);
      
      // Check NFT ownership transfer
      expect(await tokenization.ownerOf(erc20TokenId)).to.equal(addr2.address);
    });
  });
  
  describe("Collateral Release", () => {
    let tokenId: number;
    
    beforeEach(async () => {
      // Tokenize an asset first
      await tokenization.connect(addr1).tokenizeAsset(
        ASSET_TYPE,
        ASSET_VALUE,
        testToken.address,
        METADATA_URI
      );
      tokenId = 1;
      
      // Approve and collateralize
      await testToken.connect(addr2).approve(tokenization.address, ASSET_VALUE);
      await tokenization.connect(addr2).collateralizeAsset(
        tokenId,
        testToken.address,
        ASSET_VALUE
      );
    });
    
    it("Should allow releasing collateral", async () => {
      const initialBalance = await testToken.balanceOf(addr2.address);
      
      // Release collateral
      await expect(
        tokenization.connect(addr2).releaseCollateral(tokenId)
      ).to.emit(tokenization, "CollateralReleased")
       .withArgs(tokenId, addr2.address, testToken.address, ASSET_VALUE);
      
      // Check collateral was returned
      const finalBalance = await testToken.balanceOf(addr2.address);
      expect(finalBalance).to.equal(initialBalance.add(ASSET_VALUE));
      
      // Check asset state
      const asset = await tokenization.getAsset(tokenId);
      expect(asset.isCollateralized).to.be.false;
    });
    
    it("Should prevent releasing collateral if not the owner", async () => {
      await expect(
        tokenization.connect(addr1).releaseCollateral(tokenId)
      ).to.be.revertedWith("Not the asset owner");
    });
  });
});
