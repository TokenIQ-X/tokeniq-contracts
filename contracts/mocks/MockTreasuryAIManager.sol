// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "../ai/TreasuryAIManager.sol";

/**
 * @title MockTreasuryAIManager
 * @notice Mock implementation of TreasuryAIManager for testing
 */
contract MockTreasuryAIManager is TreasuryAIManager {
    // Mock state variables
    bool public mockUpkeepNeeded;
    uint256 public mockLastUpdate;
    mapping(address => uint256) public mockAllocations;
    mapping(address => string) public mockReasons;
    
    // Mock events
    event MockDecisionProcessed(address strategy, uint256 allocation, string reason);
    
    constructor() TreasuryAIManager() {}
    
    /**
     * @notice Set mock upkeep state
     * @param _needed Whether upkeep is needed
     */
    function setMockUpkeep(bool _needed) external {
        mockUpkeepNeeded = _needed;
    }
    
    /**
     * @notice Set mock last update timestamp
     * @param _timestamp The timestamp to set
     */
    function setMockLastUpdate(uint256 _timestamp) external {
        mockLastUpdate = _timestamp;
    }
    
    /**
     * @notice Set mock allocation for a strategy
     * @param _strategy The strategy address
     * @param _allocation The allocation amount
     */
    function setMockAllocation(address _strategy, uint256 _allocation) external {
        mockAllocations[_strategy] = _allocation;
    }
    
    /**
     * @notice Set mock reason for a strategy
     * @param _strategy The strategy address
     * @param _reason The reason string
     */
    function setMockReason(address _strategy, string memory _reason) external {
        mockReasons[_strategy] = _reason;
    }
    
    /**
     * @notice Mock implementation of checkUpkeep
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    ) external view override returns (bool upkeepNeeded, bytes memory /* performData */) {
        return (mockUpkeepNeeded, "");
    }
    
    /**
     * @notice Mock implementation of performUpkeep
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        // No-op in mock
    }
    
    /**
     * @notice Mock implementation of processDecision
     */
    function processDecision(
        bytes32 decisionId,
        address strategy,
        uint256 allocation,
        string calldata reason
    ) external override {
        // Store mock data
        mockAllocations[strategy] = allocation;
        mockReasons[strategy] = reason;
        
        emit MockDecisionProcessed(strategy, allocation, reason);
    }
    
    /**
     * @notice Get mock allocation for a strategy
     * @param _strategy The strategy address
     * @return The allocation amount
     */
    function getMockAllocation(address _strategy) external view returns (uint256) {
        return mockAllocations[_strategy];
    }
    
    /**
     * @notice Get mock reason for a strategy
     * @param _strategy The strategy address
     * @return The reason string
     */
    function getMockReason(address _strategy) external view returns (string memory) {
        return mockReasons[_strategy];
    }
} 