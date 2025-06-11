// SPDX-License-Identifier: MIT

pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title TreasuryAIManager
 * @notice Manages AI-driven decisions for treasury management
 * @dev This contract acts as an interface for a TypeScript service layer that handles ElizaOS integration
 */
contract TreasuryAIManager is Ownable, AutomationCompatibleInterface {
    // Structs
    struct StrategyDecision {
        address strategy;
        uint256 allocation;
        uint256 timestamp;
        string reason;
        bytes32 decisionId;     // Unique identifier for the decision
    }
    
    struct MarketData {
        uint256 price;
        uint256 volatility;
        uint256 volume;
        uint256 timestamp;
    }
    
    // State variables
    mapping(address => StrategyDecision[]) public strategyDecisions;
    mapping(address => MarketData) public marketData;
    mapping(address => bool) public supportedStrategies;
    mapping(bytes32 => bool) public processedDecisions;
    
    // Chainlink price feeds
    mapping(address => AggregatorV3Interface) public priceFeeds;
    
    // Service layer configuration
    address public serviceLayer;
    bool public isServiceLayerActive;
    
    // Track last update and supported tokens
    uint256 public lastUpdate;
    address[] public supportedTokens;
    address[] public supportedStrategyList;
    
    // Constants
    uint256 public constant MAX_BPS = 10000;
    uint256 public constant UPDATE_INTERVAL = 1 hours;
    uint256 public constant MAX_DECISIONS = 100;
    
    // Events
    event StrategyDecisionMade(
        address indexed strategy,
        uint256 allocation,
        string reason,
        bytes32 indexed decisionId
    );
    event MarketDataUpdated(
        address indexed token,
        uint256 price,
        uint256 volatility,
        uint256 volume
    );
    event StrategySupported(address strategy, bool supported);
    event ServiceLayerUpdated(address serviceLayer, bool isActive);
    event DecisionProcessed(bytes32 indexed decisionId);
    
    constructor() Ownable() {}
    
    /**
     * @notice Set the TypeScript service layer address
     * @param _serviceLayer Address of the service layer contract
     * @param _isActive Whether the service layer is active
     */
    function setServiceLayer(
        address _serviceLayer,
        bool _isActive
    ) external onlyOwner {
        serviceLayer = _serviceLayer;
        isServiceLayerActive = _isActive;
        emit ServiceLayerUpdated(_serviceLayer, _isActive);
    }
    
    /**
     * @notice Check if AI update is needed (Chainlink Automation)
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    ) external view override returns (bool upkeepNeeded, bytes memory /* performData */) {
        // Check if enough time has passed since last update
        if (block.timestamp >= lastUpdate + UPDATE_INTERVAL) {
            return (true, "");
        }
        return (false, "");
    }
    
    /**
     * @notice Perform AI update (Chainlink Automation)
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        // Update market data
        _updateMarketData();
        
        // Make strategy decisions
        _makeStrategyDecisions();
        
        lastUpdate = block.timestamp;
    }
    
    /**
     * @notice Update market data from Chainlink
     */
    function _updateMarketData() internal {
        for (uint i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            AggregatorV3Interface priceFeed = priceFeeds[token];
            
            if (address(priceFeed) != address(0)) {
                (
                    uint80 roundId,
                    int256 price,
                    uint256 startedAt,
                    uint256 updatedAt,
                    uint80 answeredInRound
                ) = priceFeed.latestRoundData();
                
                // Calculate volatility
                uint256 volatility = _calculateVolatility(token);
                
                // Get volume from Chainlink
                uint256 volume = _getVolume(token);
                
                marketData[token] = MarketData({
                    price: uint256(price),
                    volatility: volatility,
                    volume: volume,
                    timestamp: block.timestamp
                });
                
                emit MarketDataUpdated(
                    token,
                    uint256(price),
                    volatility,
                    volume
                );
            }
        }
    }
    
    /**
     * @notice Make strategy decisions
     */
    function _makeStrategyDecisions() internal {
        for (uint i = 0; i < supportedStrategyList.length; i++) {
            address strategy = supportedStrategyList[i];
            if (supportedStrategies[strategy]) {
                // Generate unique decision ID
                bytes32 decisionId = keccak256(
                    abi.encodePacked(
                        strategy,
                        block.timestamp,
                        block.prevrandao
                    )
                );
                
                // Store decision
                StrategyDecision memory decision = StrategyDecision({
                    strategy: strategy,
                    allocation: 0, // Will be set by service layer
                    timestamp: block.timestamp,
                    reason: "", // Will be set by service layer
                    decisionId: decisionId
                });
                
                strategyDecisions[strategy].push(decision);
                
                // Trim old decisions if needed
                if (strategyDecisions[strategy].length > MAX_DECISIONS) {
                    for (uint j = 0; j < strategyDecisions[strategy].length - MAX_DECISIONS; j++) {
                        strategyDecisions[strategy][j] = strategyDecisions[strategy][j + 1];
                    }
                    strategyDecisions[strategy].pop();
                }
                
                emit StrategyDecisionMade(
                    strategy,
                    0, // Will be set by service layer
                    "", // Will be set by service layer
                    decisionId
                );
            }
        }
    }
    
    /**
     * @notice Process a decision from the service layer
     * @param decisionId ID of the decision to process
     * @param allocation Allocation amount
     * @param reason Reason for the decision
     */
    function processDecision(
        bytes32 decisionId,
        uint256 allocation,
        string calldata reason
    ) external {
        require(msg.sender == serviceLayer, "Only service layer");
        require(isServiceLayerActive, "Service layer not active");
        require(!processedDecisions[decisionId], "Decision already processed");
        
        // Find the decision
        bool found = false;
        for (uint i = 0; i < supportedStrategyList.length; i++) {
            address strategy = supportedStrategyList[i];
            StrategyDecision[] storage decisions = strategyDecisions[strategy];
            
            for (uint j = 0; j < decisions.length; j++) {
                if (decisions[j].decisionId == decisionId) {
                    decisions[j].allocation = allocation;
                    decisions[j].reason = reason;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }
        
        require(found, "Decision not found");
        processedDecisions[decisionId] = true;
        
        emit DecisionProcessed(decisionId);
    }
    
    /**
     * @notice Get latest strategy decision
     * @param strategy Strategy address
     * @return Latest decision
     */
    function getLatestDecision(
        address strategy
    ) external view returns (StrategyDecision memory) {
        require(supportedStrategies[strategy], "Strategy not supported");
        require(strategyDecisions[strategy].length > 0, "No decisions");
        
        return strategyDecisions[strategy][strategyDecisions[strategy].length - 1];
    }
    
    /**
     * @notice Set supported strategy
     * @param strategy Strategy address
     * @param supported Whether strategy is supported
     */
    function setSupportedStrategy(
        address strategy,
        bool supported
    ) external onlyOwner {
        supportedStrategies[strategy] = supported;
        bool found = false;
        for (uint i = 0; i < supportedStrategyList.length; i++) {
            if (supportedStrategyList[i] == strategy) {
                found = true;
                break;
            }
        }
        if (supported && !found) {
            supportedStrategyList.push(strategy);
        } else if (!supported && found) {
            // Remove from array
            for (uint i = 0; i < supportedStrategyList.length; i++) {
                if (supportedStrategyList[i] == strategy) {
                    supportedStrategyList[i] = supportedStrategyList[supportedStrategyList.length - 1];
                    supportedStrategyList.pop();
                    break;
                }
            }
        }
        emit StrategySupported(strategy, supported);
    }
    
    /**
     * @notice Set price feed for token
     * @param token Token address
     * @param priceFeed Price feed address
     */
    function setPriceFeed(
        address token,
        address priceFeed
    ) external onlyOwner {
        priceFeeds[token] = AggregatorV3Interface(priceFeed);
    }
    
    /**
     * @notice Calculate volatility
     */
    function _calculateVolatility(
        address token
    ) internal view returns (uint256) {
        // In production, use Chainlink Data Streams or service layer
        return 0;
    }
    
    /**
     * @notice Get volume from Chainlink
     */
    function _getVolume(
        address token
    ) internal view returns (uint256) {
        // In production, use Chainlink Data Streams
        return 0;
    }
} 