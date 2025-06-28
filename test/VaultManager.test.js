const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("VaultManager", function () {
    let vaultManager;
    let mockToken;
    let mockStrategy;
    let owner;
    let user1;
    let user2;

    async function deployVaultManagerFixture() {
        const [owner, user1, user2] = await ethers.getSigners();

        // Deploy mock token
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockToken = await MockERC20.deploy("Mock Token", "MTK", 18);
        await mockToken.waitForDeployment();

        // Deploy mock strategy (using MockAaveVault as a strategy for testing)
        const MockStrategy = await ethers.getContractFactory("MockAaveVault");
        // Use address(1) as the treasuryAIManager for testing
        mockStrategy = await MockStrategy.deploy("0x0000000000000000000000000000000000000001");
        await mockStrategy.waitForDeployment();

        // Deploy VaultManager
        const VaultManager = await ethers.getContractFactory("VaultManager");
        const vaultManager = await VaultManager.deploy();
        await vaultManager.waitForDeployment();
        
        // Create a vault for testing - this will also mark the token as supported
        const vaultId = await mockStrategy.getAddress();
        await vaultManager.createVault(
            await mockStrategy.getAddress(),
            await mockToken.getAddress()
        );

        // Mint tokens to users
        const amount = ethers.parseEther("1000");
        await mockToken.mint(await user1.getAddress(), amount);
        await mockToken.mint(await user2.getAddress(), amount);

        return { vaultManager, mockToken, mockStrategy, owner, user1, user2 };
    }

    beforeEach(async function () {
        ({ vaultManager, mockToken, mockStrategy, owner, user1, user2 } = 
            await loadFixture(deployVaultManagerFixture));
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await vaultManager.owner()).to.equal(await owner.getAddress());
        });
    });

    describe("Vault Management", function () {
        it("Should allow owner to create a vault", async function () {
            const tx = await vaultManager.createVault(
                await mockStrategy.getAddress(),
                await mockToken.getAddress()
            );
            
            // Get the VaultCreated event
            const receipt = await tx.wait();
            const event = receipt.logs?.find(log => {
                try {
                    const parsedLog = vaultManager.interface.parseLog(log);
                    return parsedLog?.name === 'VaultCreated';
                } catch (e) {
                    return false;
                }
            });
            
            expect(event).to.not.be.undefined;
            
            // Parse the event data
            const parsedEvent = vaultManager.interface.parseLog(event);
            const vaultId = parsedEvent.args[0];
            const strategy = parsedEvent.args[1];
            const token = parsedEvent.args[2];
            
            expect(vaultId).to.not.equal(ethers.ZeroAddress);
            expect(strategy).to.equal(await mockStrategy.getAddress());
            expect(token).to.equal(await mockToken.getAddress());
            
            // Check vault info
            const vaultInfo = await vaultManager.vaults(vaultId);
            expect(vaultInfo.strategy).to.equal(await mockStrategy.getAddress());
            expect(vaultInfo.token).to.equal(await mockToken.getAddress());
            expect(vaultInfo.isActive).to.be.true;
        });

        it("Should not allow non-owner to create a vault", async function () {
            await expect(
                vaultManager.connect(user1).createVault(
                    await mockStrategy.getAddress(),
                    await mockToken.getAddress()
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Deposits and Withdrawals", function () {
        let vaultId;
        const depositAmount = ethers.parseEther("100");

        beforeEach(async function () {
            // Create a vault
            const tx = await vaultManager.createVault(
                await mockStrategy.getAddress(),
                await mockToken.getAddress()
            );
            const receipt = await tx.wait();
            
            // Find and parse the VaultCreated event
            const event = receipt.logs?.find(log => {
                try {
                    const parsedLog = vaultManager.interface.parseLog(log);
                    return parsedLog?.name === 'VaultCreated';
                } catch (e) {
                    return false;
                }
            });
            
            expect(event).to.not.be.undefined;
            const parsedEvent = vaultManager.interface.parseLog(event);
            vaultId = parsedEvent.args[0]; // First argument is vaultId
            
            // Approve tokens for deposit
            await mockToken.connect(user1).approve(await vaultManager.getAddress(), depositAmount);
        });

        it("Should allow users to deposit into a vault", async function () {
            await expect(
                vaultManager.connect(user1).deposit(vaultId, depositAmount)
            ).to.emit(vaultManager, "Deposit")
             .withArgs(await user1.getAddress(), vaultId, depositAmount, depositAmount);

            // Check user's info
            const user = await vaultManager.userInfo(vaultId, await user1.getAddress());
            expect(user.shares).to.equal(depositAmount);
            
            // Check vault info
            const vault = await vaultManager.vaults(vaultId);
            expect(vault.totalShares).to.equal(depositAmount);
            expect(vault.totalAssets).to.equal(depositAmount);
        });

        it("Should allow users to withdraw from a vault", async function () {
            // First deposit
            await vaultManager.connect(user1).deposit(vaultId, depositAmount);
            
            // Withdraw half
            const withdrawAmount = depositAmount / 2n;
            await expect(
                vaultManager.connect(user1).withdraw(vaultId, withdrawAmount)
            ).to.emit(vaultManager, "Withdraw")
             .withArgs(await user1.getAddress(), vaultId, withdrawAmount, withdrawAmount);

            // Check user's info
            const user = await vaultManager.userInfo(vaultId, await user1.getAddress());
            expect(user.shares).to.equal(depositAmount - withdrawAmount);
            
            // Check vault info
            const vault = await vaultManager.vaults(vaultId);
            expect(vault.totalShares).to.equal(depositAmount - withdrawAmount);
            expect(vault.totalAssets).to.equal(depositAmount - withdrawAmount);
        });
        
        it("Should not allow withdrawal of more than balance", async function () {
            await vaultManager.connect(user1).deposit(vaultId, depositAmount);
            
            await expect(
                vaultManager.connect(user1).withdraw(vaultId, depositAmount * 2n)
            ).to.be.revertedWith("Insufficient shares");
        });
    });
});
