const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("VaultFactory", function () {
    let vaultFactory;
    let mockToken;
    let mockAToken;
    let mockPool;
    let mockAggregator;
    let treasuryAIManager;
    let owner;
    let user;

    async function deployVaultFactoryFixture() {
        const [owner, user] = await ethers.getSigners();

        // Deploy mock contracts
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockToken = await MockERC20.deploy("Mock Token", "MTK", 18);
        await mockToken.waitForDeployment();

        mockAToken = await MockERC20.deploy("Mock aToken", "aMTK", 18);
        await mockAToken.waitForDeployment();

        const MockAavePool = await ethers.getContractFactory("MockAavePool");
        mockPool = await MockAavePool.deploy();
        await mockPool.waitForDeployment();
        
        // Set the aToken address in the mock pool
        await mockPool.setAToken(await mockAToken.getAddress());

        const MockAggregatorV3 = await ethers.getContractFactory("MockAggregatorV3");
        mockAggregator = await MockAggregatorV3.deploy();
        await mockAggregator.waitForDeployment();

        // Deploy TreasuryAIManager mock
        const MockTreasuryAIManager = await ethers.getContractFactory("MockTreasuryAIManager");
        treasuryAIManager = await MockTreasuryAIManager.deploy();
        await treasuryAIManager.waitForDeployment();

        // Deploy VaultFactory
        const VaultFactory = await ethers.getContractFactory("VaultFactory");
        vaultFactory = await VaultFactory.deploy();
        await vaultFactory.waitForDeployment();
        
        // Initialize the VaultFactory with the owner's address
        await vaultFactory.initialize(owner.address);
        
        // Set the treasury AI manager address
        await vaultFactory.connect(owner).setTreasuryAIManager(await treasuryAIManager.getAddress());
        
        // Deploy mock vault implementations
        const MockVault = await ethers.getContractFactory("MockAaveVault");
        // Use the treasuryAIManager address as the constructor argument
        const mockVaultImpl = await MockVault.deploy(await treasuryAIManager.getAddress());
        await mockVaultImpl.waitForDeployment();
        
        // Set vault implementations
        await vaultFactory.setVaultImplementation("aave", await mockVaultImpl.getAddress());
        await vaultFactory.setVaultImplementation("curve", await mockVaultImpl.getAddress());
        await vaultFactory.setVaultImplementation("rwa", await mockVaultImpl.getAddress());

        return { 
            vaultFactory, 
            mockToken, 
            mockAToken, 
            mockPool, 
            mockAggregator, 
            treasuryAIManager,
            owner, 
            user 
        };
    }

    beforeEach(async function () {
        ({ 
            vaultFactory, 
            mockToken, 
            mockAToken, 
            mockPool, 
            mockAggregator, 
            treasuryAIManager,
            owner, 
            user 
        } = await loadFixture(deployVaultFactoryFixture));
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await vaultFactory.owner()).to.equal(await owner.getAddress());
        });
    });

    describe("Vault Implementation", function () {
        it("Should allow owner to set vault implementation", async function () {
            const MockVault = await ethers.getContractFactory("MockAaveVault");
            const mockVault = await MockVault.deploy(await treasuryAIManager.getAddress());
            await mockVault.waitForDeployment();
            
            await expect(vaultFactory.setVaultImplementation("aave", await mockVault.getAddress()))
                .to.emit(vaultFactory, "ImplementationUpdated")
                .withArgs("aave", await mockVault.getAddress());
                
            // Check the implementation was set correctly
            expect(await vaultFactory.vaultImplementations("aave")).to.equal(await mockVault.getAddress());
        });
        
        it("Should not allow non-owner to set implementation", async function () {
            const MockVault = await ethers.getContractFactory("MockAaveVault");
            const mockVault = await MockVault.deploy(await treasuryAIManager.getAddress());
            await mockVault.waitForDeployment();
            
            await expect(
                vaultFactory.connect(user).setVaultImplementation(
                    "aave", 
                    await mockVault.getAddress()
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
    
    describe("Create Vault", function () {
        let mockVault;
        
        beforeEach(async function () {
            // Deploy mock vault implementation
            const MockVault = await ethers.getContractFactory("MockAaveVault");
            mockVault = await MockVault.deploy(await treasuryAIManager.getAddress());
            await mockVault.waitForDeployment();
            
            // Set vault implementation
            await vaultFactory.setVaultImplementation("aave", await mockVault.getAddress());
        });
        
        it("Should create a new vault", async function () {
            const tx = await vaultFactory.createVault("aave");
            const receipt = await tx.wait();
            
            // Check the VaultCreated event was emitted with the correct parameters
            const event = receipt.logs?.find(log => {
                try {
                    const parsedLog = vaultFactory.interface.parseLog(log);
                    return parsedLog?.name === 'VaultCreated';
                } catch (e) {
                    return false;
                }
            });
            
            expect(event).to.not.be.undefined;
            const parsedLog = vaultFactory.interface.parseLog(event);
            expect(parsedLog.args.vault).to.be.properAddress;
            expect(parsedLog.args.vaultType).to.equal("aave");
            expect(parsedLog.args.creator).to.equal(await owner.getAddress());

            // Check the vault was added to the allVaults array
            const vaultCount = await vaultFactory.getVaultCount();
            expect(vaultCount).to.equal(1);
            
            // Get the first vault (index 0)
            const vaultAddress = await vaultFactory.allVaults(0);
            expect(vaultAddress).to.equal(parsedLog.args.vault);
        });

        it("Should increment vault count", async function () {
            await vaultFactory.createVault("aave");
            expect(await vaultFactory.getVaultCount()).to.equal(1);
            
            await vaultFactory.createVault("aave");
            expect(await vaultFactory.getVaultCount()).to.equal(2);
        });
        
        it("Should not create vault for unsupported type", async function () {
            await expect(
                vaultFactory.createVault("unsupported")
            ).to.be.revertedWith("Vault type not supported");
        });
    });
    
    describe("Get Vaults", function () {
        let mockVault;
        let vault1, vault2;
        
        beforeEach(async function () {
            // Deploy and set mock vault implementation
            const MockVault = await ethers.getContractFactory("MockAaveVault");
            mockVault = await MockVault.deploy(await treasuryAIManager.getAddress());
            await mockVault.waitForDeployment();
            
            await vaultFactory.setVaultImplementation("aave", await mockVault.getAddress());
            
            // Create some vaults
            const tx1 = await vaultFactory.createVault("aave");
            const receipt1 = await tx1.wait();
            const event1 = receipt1.logs?.find(log => {
                try {
                    return vaultFactory.interface.parseLog(log)?.name === 'VaultCreated';
                } catch (e) {
                    return false;
                }
            });
            vault1 = vaultFactory.interface.parseLog(event1).args.vault;
            
            const tx2 = await vaultFactory.createVault("aave");
            const receipt2 = await tx2.wait();
            const event2 = receipt2.logs?.find(log => {
                try {
                    return vaultFactory.interface.parseLog(log)?.name === 'VaultCreated';
                } catch (e) {
                    return false;
                }
            });
            vault2 = vaultFactory.interface.parseLog(event2).args.vault;
        });
        
        it("Should return correct vault count", async function () {
            expect(await vaultFactory.getVaultCount()).to.equal(2);
            
            // Verify we can access vaults by index
            const vault1FromContract = await vaultFactory.allVaults(0);
            const vault2FromContract = await vaultFactory.allVaults(1);
            
            expect(vault1FromContract).to.equal(vault1);
            expect(vault2FromContract).to.equal(vault2);
            
            // Check vault types
            expect(await vaultFactory.vaultTypes(vault1)).to.equal("aave");
            expect(await vaultFactory.vaultTypes(vault2)).to.equal("aave");
        });
        
        it("Should increment vault count when creating new vaults", async function () {
            const initialCount = await vaultFactory.getVaultCount();
            await vaultFactory.createVault("aave");
            const newCount = await vaultFactory.getVaultCount();
            expect(newCount).to.equal(initialCount + 1n);
        });
    });

    describe("Ownership", function () {
        let mockVault;
        
        beforeEach(async function () {
            // Deploy and set mock vault implementation
            const MockVault = await ethers.getContractFactory("MockAaveVault");
            mockVault = await MockVault.deploy(await treasuryAIManager.getAddress());
            await mockVault.waitForDeployment();
            
            // Don't initialize here - let the VaultFactory do it
            await vaultFactory.connect(owner).setVaultImplementation("aave", await mockVault.getAddress());
        });
        
        it("Should not allow non-owner to create vault", async function () {
            await expect(
                vaultFactory.connect(user).createVault("aave")
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
        
        it("Should not allow non-owner to set implementation", async function () {
            await expect(
                vaultFactory.connect(user).setVaultImplementation("aave", ethers.ZeroAddress)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
});
