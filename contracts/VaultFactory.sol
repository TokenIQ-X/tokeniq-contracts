// SPDX-License-Identifier: MIT

pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./strategies/AaveVault.sol";
import "./strategies/CurveVault.sol";
import "./strategies/RWAInvoiceVault.sol";
import "./ai/TreasuryAIManager.sol";

/**
 * @title VaultFactory
 * @notice Factory contract for creating and managing different types of vaults
 */
contract VaultFactory is Ownable {
    using Clones for address;

    // Vault implementation addresses
    address public aaveVaultImplementation;
    address public curveVaultImplementation;
    address public rwaVaultImplementation;
    
    // Treasury AI Manager
    address public treasuryAIManager;
    
    // Mapping of vault type to implementation
    mapping(string => address) public vaultImplementations;
    
    // Array of all created vaults
    address[] public allVaults;
    
    // Mapping of vault address to its type
    mapping(address => string) public vaultTypes;
    
    // Events
    event VaultCreated(address indexed vault, string vaultType, address indexed creator);
    event ImplementationUpdated(string vaultType, address implementation);
    event TreasuryAIManagerUpdated(address treasuryAIManager);
    
    constructor() Ownable() {}
    
    /**
     * @notice Set the implementation address for a vault type
     * @param _vaultType Type of vault (e.g., "aave", "curve", "rwa")
     * @param _implementation Address of the implementation contract
     */
    function setVaultImplementation(string memory _vaultType, address _implementation) external onlyOwner {
        require(_implementation != address(0), "Invalid implementation address");
        vaultImplementations[_vaultType] = _implementation;
        emit ImplementationUpdated(_vaultType, _implementation);
    }
    
    /**
     * @notice Set the Treasury AI Manager address
     * @param _treasuryAIManager Address of the Treasury AI Manager
     */
    function setTreasuryAIManager(address _treasuryAIManager) external onlyOwner {
        require(_treasuryAIManager != address(0), "Invalid Treasury AI Manager address");
        treasuryAIManager = _treasuryAIManager;
        emit TreasuryAIManagerUpdated(_treasuryAIManager);
    }
    
    /**
     * @notice Create a new vault of the specified type
     * @param _vaultType Type of vault to create (e.g., "aave", "curve", "rwa")
     * @return Address of the newly created vault
     */
    function createVault(string memory _vaultType) external onlyOwner returns (address) {
        address implementation = vaultImplementations[_vaultType];
        require(implementation != address(0), "Vault type not supported");
        
        // Clone the implementation
        address clone = implementation.clone();
        
        // Initialize the clone based on vault type
        if (keccak256(bytes(_vaultType)) == keccak256(bytes("aave"))) {
            AaveVault(clone).initialize(treasuryAIManager);
        } else if (keccak256(bytes(_vaultType)) == keccak256(bytes("curve"))) {
            CurveVault(clone).initialize(treasuryAIManager);
        } else if (keccak256(bytes(_vaultType)) == keccak256(bytes("rwa"))) {
            RWAInvoiceVault(clone).initialize(treasuryAIManager);
        }
        
        // Store vault information
        allVaults.push(clone);
        vaultTypes[clone] = _vaultType;
        
        emit VaultCreated(clone, _vaultType, msg.sender);
        return clone;
    }
    
    /**
     * @notice Get the total number of vaults created
     * @return Number of vaults
     */
    function getVaultCount() external view returns (uint256) {
        return allVaults.length;
    }
    
    /**
     * @notice Get all vaults of a specific type
     * @param _vaultType Type of vault to filter
     * @return Array of vault addresses
     */
    function getVaultsByType(string memory _vaultType) external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < allVaults.length; i++) {
            if (keccak256(bytes(vaultTypes[allVaults[i]])) == keccak256(bytes(_vaultType))) {
                count++;
            }
        }
        
        address[] memory vaults = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allVaults.length; i++) {
            if (keccak256(bytes(vaultTypes[allVaults[i]])) == keccak256(bytes(_vaultType))) {
                vaults[index] = allVaults[i];
                index++;
            }
        }
        
        return vaults;
    }
}
