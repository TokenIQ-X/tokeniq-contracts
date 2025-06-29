// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/ITreasuryAIManager.sol";

/**
 * @title VaultFactory
 * @notice Factory contract for creating and managing different types of vaults
 */
contract VaultFactory is Initializable, OwnableUpgradeable {
    using ClonesUpgradeable for address;

    // Vault implementation addresses
    address public aaveVaultImplementation;
    address public curveVaultImplementation;
    address public rwaVaultImplementation;
    
    // Treasury AI Manager
    ITreasuryAIManager public treasuryAIManager;
    
    // Mapping of vault type to implementation
    mapping(string => address) public vaultImplementations;
    
    // Array of all created vaults
    address[] public allVaults;
    
    // Mapping of vault address to its type
    mapping(address => string) public vaultTypes;
    
    // Events
    event VaultCreated(address indexed vault, string vaultType, address indexed creator);
    event VaultImplementationSet(string indexed vaultType, address implementation);
    event TreasuryAIManagerUpdated(address treasuryAIManager);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the VaultFactory
     * @param _treasuryAIManager Address of the Treasury AI Manager
     */
    function initialize(address _treasuryAIManager) public initializer {
        __Ownable_init();
        
        require(_treasuryAIManager != address(0), "Invalid Treasury AI Manager");
        treasuryAIManager = ITreasuryAIManager(_treasuryAIManager);
    }
    
    /**
     * @notice Set the implementation address for a vault type
     * @param vaultType Type of vault (e.g., "aave", "curve", "rwa")
     * @param implementation Address of the vault implementation
     */
    function setVaultImplementation(string calldata vaultType, address implementation) external onlyOwner {
        require(implementation != address(0), "Invalid implementation address");
        
        if (keccak256(bytes(vaultType)) == keccak256(bytes("aave"))) {
            aaveVaultImplementation = implementation;
        } else if (keccak256(bytes(vaultType)) == keccak256(bytes("curve"))) {
            curveVaultImplementation = implementation;
        } else if (keccak256(bytes(vaultType)) == keccak256(bytes("rwa"))) {
            rwaVaultImplementation = implementation;
        } else {
            revert("Unsupported vault type");
        }
        
        vaultImplementations[vaultType] = implementation;
        emit VaultImplementationSet(vaultType, implementation);
    }
    
    /**
     * @notice Update the Treasury AI Manager address
     * @param _treasuryAIManager Address of the new Treasury AI Manager
     */
    function setTreasuryAIManager(address _treasuryAIManager) external onlyOwner {
        require(_treasuryAIManager != address(0), "Invalid Treasury AI Manager address");
        treasuryAIManager = ITreasuryAIManager(_treasuryAIManager);
        emit TreasuryAIManagerUpdated(_treasuryAIManager);
    }
    
    /**
     * @notice Create a new vault of the specified type
     * @param vaultType Type of vault to create (e.g., "aave", "curve", "rwa")
     * @return Address of the newly created vault
     */
    function createVault(string calldata vaultType) external returns (address) {
        address implementation = vaultImplementations[vaultType];
        require(implementation != address(0), "Vault type not supported");
        
        // Clone the implementation
        address clone = implementation.clone();
        
        // Initialize the clone with the treasuryAIManager
        (bool success, ) = clone.call(
            abi.encodeWithSignature("initialize(address)", address(treasuryAIManager))
        );
        require(success, "Vault initialization failed");
        
        // Store vault information
        allVaults.push(clone);
        vaultTypes[clone] = vaultType;
        
        emit VaultCreated(clone, vaultType, msg.sender);
        return clone;
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
