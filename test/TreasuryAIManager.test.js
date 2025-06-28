const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TreasuryAIManager", function () {
    let treasuryAIManager;
    let mockStrategy;
    let owner;
    let user;
    let aiOperator;

    async function deployContracts() {
        const [deployer, userAccount, aiOperatorAccount] = await ethers.getSigners();
        owner = deployer;
        user = userAccount;
        aiOperator = aiOperatorAccount;

        // Deploy TreasuryAIManager
        const TreasuryAIManager = await ethers.getContractFactory("TreasuryAIManager");
        treasuryAIManager = await TreasuryAIManager.deploy();
        await treasuryAIManager.waitForDeployment();
        
        // Deploy a mock strategy
        const MockStrategy = await ethers.getContractFactory("MockAaveVault");
        mockStrategy = await MockStrategy.deploy(treasuryAIManager.target);
        await mockStrategy.waitForDeployment();
        
        // Set the service layer
        await treasuryAIManager.setServiceLayer(await aiOperator.getAddress(), true);
        
        return { treasuryAIManager, mockStrategy, owner, user, aiOperator };
    }

    beforeEach(async function () {
        await deployContracts();
    });

    describe("Deployment", function () {
        it("Should set the right owner and service layer", async function () {
            expect(await treasuryAIManager.owner()).to.equal(await owner.getAddress());
            // Check that the service layer is set correctly
            const serviceLayer = await treasuryAIManager.serviceLayer();
            const isServiceLayerActive = await treasuryAIManager.isServiceLayerActive();
            expect(serviceLayer).to.equal(await aiOperator.getAddress());
            expect(isServiceLayerActive).to.be.true;
        });
    });

    describe("Service Layer Operations", function () {
        it("Should allow owner to update service layer", async function () {
            const newServiceLayer = await user.getAddress();
            await expect(treasuryAIManager.setServiceLayer(newServiceLayer, true))
                .to.emit(treasuryAIManager, "ServiceLayerUpdated")
                .withArgs(newServiceLayer, true);
                
            expect(await treasuryAIManager.serviceLayer()).to.equal(newServiceLayer);
            expect(await treasuryAIManager.isServiceLayerActive()).to.be.true;
        });
        
        it("Should not allow non-owner to update service layer", async function () {
            const newServiceLayer = await user.getAddress();
            await expect(
                treasuryAIManager.connect(user).setServiceLayer(newServiceLayer, true)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
    
    describe("Strategy Management", function () {
        it("Should allow owner to set supported strategy", async function () {
            await expect(treasuryAIManager.setSupportedStrategy(mockStrategy.target, true))
                .to.emit(treasuryAIManager, "StrategySupported")
                .withArgs(mockStrategy.target, true);
                
            expect(await treasuryAIManager.supportedStrategies(mockStrategy.target)).to.be.true;
        });
        
        it("Should not allow non-owner to set supported strategy", async function () {
            await expect(
                treasuryAIManager.connect(user).setSupportedStrategy(mockStrategy.target, true)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
    
    describe("Decision Processing", function () {
        let decisionId;
        const allocation = 5000; // 50%
        const reason = "Test decision";
        
        beforeEach(async function () {
            // Set up a supported strategy first
            await treasuryAIManager.setSupportedStrategy(mockStrategy.target, true);
            
            // Set initial lastUpdate to current block timestamp + 1 to avoid timestamp collision
            const currentBlock = await ethers.provider.getBlock("latest");
            await ethers.provider.send("evm_setNextBlockTimestamp", [currentBlock.timestamp + 1]);
            await ethers.provider.send("evm_mine");
            
            // Create a decision ID
            decisionId = ethers.keccak256(ethers.toUtf8Bytes(`decision-${Date.now()}`));
        });
        
        it("Should allow service layer to process decisions", async function () {
            // First, call performUpkeep to create a decision
            await ethers.provider.send("evm_increaseTime", [3601]); // More than 1 hour
            await ethers.provider.send("evm_mine");
            
            // Call performUpkeep to create a decision
            await treasuryAIManager.performUpkeep("0x");
            
            // Get the created decision ID from the event
            const filter = treasuryAIManager.filters.StrategyDecisionMade();
            const events = await treasuryAIManager.queryFilter(filter);
            expect(events.length).to.be.gt(0, "No decision was created");
            
            const createdDecisionId = events[0].args.decisionId;
            
            // Now process the decision
            const processDecision = treasuryAIManager.connect(aiOperator).getFunction("processDecision(bytes32,uint256,string)");
            
            await expect(
                processDecision(
                    createdDecisionId,
                    allocation,
                    reason
                )
            ).to.emit(treasuryAIManager, "DecisionProcessed")
             .withArgs(createdDecisionId);
             
            // Verify the decision was processed
            const latestDecision = await treasuryAIManager.getLatestDecision(mockStrategy.target);
            expect(latestDecision.strategy).to.equal(mockStrategy.target);
            expect(latestDecision.allocation).to.equal(allocation);
            expect(latestDecision.reason).to.equal(reason);
            expect(await treasuryAIManager.processedDecisions(createdDecisionId)).to.be.true;
        });
        
        it("Should not allow non-service layer to process decisions", async function () {
            const decisionId = ethers.keccak256(ethers.toUtf8Bytes("test-decision"));
            const processDecision = treasuryAIManager.getFunction("processDecision(bytes32,address,uint256,string)");
            
            await expect(
                processDecision(
                    decisionId,
                    mockStrategy.target,
                    5000, // allocation
                    "Test decision"
                )
            ).to.be.revertedWith("Only service layer");
        });
    });
    
    describe("Price Feed Management", function () {
        it("Should allow owner to set price feed", async function () {
            const mockToken = "0x0000000000000000000000000000000000000001";
            const mockPriceFeed = "0x0000000000000000000000000000000000000002";
            
            await treasuryAIManager.setPriceFeed(mockToken, mockPriceFeed);
            
            const priceFeed = await treasuryAIManager.priceFeeds(mockToken);
            expect(priceFeed).to.equal(mockPriceFeed);
        });
        
        it("Should not allow non-owner to set price feed", async function () {
            const mockToken = "0x0000000000000000000000000000000000000001";
            const mockPriceFeed = "0x0000000000000000000000000000000000000002";
            
            await expect(
                treasuryAIManager.connect(user).setPriceFeed(mockToken, mockPriceFeed)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Automation", function () {
        it("Should return true for checkUpkeep when update interval has passed", async function () {
            // Set lastUpdate to be more than UPDATE_INTERVAL seconds ago
            const updateInterval = 3600; // 1 hour in seconds
            await ethers.provider.send("evm_increaseTime", [updateInterval + 1]);
            await ethers.provider.send("evm_mine");
            
            const [upkeepNeeded] = await treasuryAIManager.checkUpkeep("0x");
            expect(upkeepNeeded).to.be.true;
        });
        
        it("Should return false for checkUpkeep when update interval has not passed", async function () {
            // Set lastUpdate to current block timestamp + 1 to avoid timestamp collision
            const currentBlock = await ethers.provider.getBlock("latest");
            await ethers.provider.send("evm_setNextBlockTimestamp", [currentBlock.timestamp + 1]);
            await ethers.provider.send("evm_mine");
            
            // Should be false because not enough time has passed
            const [upkeepNeeded] = await treasuryAIManager.checkUpkeep("0x");
            
            // If the contract was just deployed, lastUpdate would be 0, so upkeep would be needed
            // We need to set lastUpdate to a recent time to test this properly
            if (upkeepNeeded) {
                // Call performUpkeep to update lastUpdate
                await treasuryAIManager.performUpkeep("0x");
                
                // Now check again - should be false
                const [upkeepNeededAfter] = await treasuryAIManager.checkUpkeep("0x");
                expect(upkeepNeededAfter).to.be.false;
            } else {
                expect(upkeepNeeded).to.be.false;
            }
        });
        
        it("Should allow performUpkeep to be called when conditions are met", async function () {
            // Set up a supported strategy first
            await treasuryAIManager.setSupportedStrategy(mockStrategy.target, true);
            
            // Fast forward time to trigger upkeep (1 hour + 1 second)
            await ethers.provider.send("evm_increaseTime", [3601]);
            await ethers.provider.send("evm_mine");
            
            // Call performUpkeep
            await expect(treasuryAIManager.performUpkeep("0x"))
                .to.emit(treasuryAIManager, "StrategyDecisionMade");
                
            // Verify lastUpdate was updated
            const currentBlock = await ethers.provider.getBlock("latest");
            expect(await treasuryAIManager.lastUpdate()).to.equal(currentBlock.timestamp);
        });
    });
});
