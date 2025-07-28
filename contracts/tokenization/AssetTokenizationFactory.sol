// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./AssetTokenization.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AssetTokenizationFactory
 * @notice Factory contract for deploying AssetTokenization contracts
 */
contract AssetTokenizationFactory is Ownable {
    // Array of all deployed AssetTokenization contracts
    address[] public allTokenizationContracts;
    
    // Mapping from tokenization contract to its details
    struct TokenizationDetails {
        string name;
        string symbol;
        address creator;
        uint256 createdAt;
    }
    
    mapping(address => TokenizationDetails) public tokenizationDetails;
    
    // Events
    event TokenizationContractCreated(
        address indexed contractAddress,
        string name,
        string symbol,
        address indexed creator
    );
    
    /**
     * @notice Deploy a new AssetTokenization contract
     * @param name Name of the NFT collection
     * @param symbol Symbol of the NFT collection
     * @return The address of the newly deployed contract
     */
    function createTokenizationContract(
        string memory name,
        string memory symbol
    ) external returns (address) {
        // Deploy new AssetTokenization contract
        AssetTokenization newContract = new AssetTokenization(name, symbol);
        
        // Transfer ownership to the creator
        newContract.transferOwnership(msg.sender);
        
        // Store contract details
        address contractAddress = address(newContract);
        allTokenizationContracts.push(contractAddress);
        
        tokenizationDetails[contractAddress] = TokenizationDetails({
            name: name,
            symbol: symbol,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        
        emit TokenizationContractCreated(contractAddress, name, symbol, msg.sender);
        
        return contractAddress;
    }
    
    /**
     * @notice Get the total number of deployed tokenization contracts
     * @return The number of deployed contracts
     */
    function getTokenizationContractCount() external view returns (uint256) {
        return allTokenizationContracts.length;
    }
    
    /**
     * @notice Get a paginated list of tokenization contracts
     * @param cursor Starting index
     * @param limit Maximum number of items to return
     * @return contracts Array of contract addresses
     * @return nextCursor Next cursor for pagination
     */
    function getTokenizationContracts(
        uint256 cursor,
        uint256 limit
    ) external view returns (address[] memory contracts, uint256 nextCursor) {
        uint256 length = allTokenizationContracts.length;
        
        if (cursor >= length) {
            return (new address[](0), 0);
        }
        
        uint256 end = cursor + limit;
        if (end > length) {
            end = length;
        }
        
        uint256 count = end - cursor;
        contracts = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            contracts[i] = allTokenizationContracts[cursor + i];
        }
        
        nextCursor = end == length ? 0 : end;
    }
    
    /**
     * @notice Get details of a specific tokenization contract
     * @param contractAddress Address of the tokenization contract
     * @return details The tokenization contract details
     */
    function getTokenizationContractDetails(
        address contractAddress
    ) external view returns (TokenizationDetails memory) {
        return tokenizationDetails[contractAddress];
    }
}
