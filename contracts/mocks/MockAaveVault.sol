// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockAaveVault
 * @dev Mock implementation of AaveVault for testing purposes
 */
contract MockAaveVault is Ownable {
    address public treasuryAIManager;
    bool public initialized;

    /**
     * @dev Constructor that sets the treasuryAIManager and owner
     * @param _treasuryAIManager Address of the Treasury AI Manager
     */
    constructor(address _treasuryAIManager) Ownable() {
        require(_treasuryAIManager != address(0), "Invalid Treasury AI Manager address");
        treasuryAIManager = _treasuryAIManager;
        _transferOwnership(msg.sender);
        initialized = true;
    }

    /**
     * @dev Mock function to simulate deposit
     */
    function deposit(uint256 amount) external pure returns (bool) {
        require(amount > 0, "Amount must be greater than 0");
        return true;
    }

    /**
     * @dev Mock function to simulate withdrawal
     */
    function withdraw(uint256 amount) external pure returns (bool) {
        require(amount > 0, "Amount must be greater than 0");
        return true;
    }

    /**
     * @dev Mock function to check if the vault is initialized
     */
    function isInitialized() external view returns (bool) {
        return initialized;
    }

    /**
     * @dev Initialize function that matches the interface expected by VaultFactory
     * @param _treasuryAIManager Address of the Treasury AI Manager
     */
    function initialize(address _treasuryAIManager) external {
        require(_treasuryAIManager != address(0), "Invalid Treasury AI Manager");
        treasuryAIManager = _treasuryAIManager;
        _transferOwnership(msg.sender);
        initialized = true;
    }
}
