// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import "@chainlink/contracts-ccip/contracts/interfaces/IRouter.sol";
import "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

contract MockRouter is IRouterClient, IRouter {
    function getFee(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage memory message
    ) external pure override returns (uint256) {
        return 0.1 ether; // Return a fixed fee for testing
    }

    function ccipSend(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage memory message
    ) external payable override returns (bytes32) {
        // Mock implementation
        return bytes32(0);
    }

    function getSupportedTokens(uint64 chainSelector) external pure returns (address[] memory) {
        // Mock implementation
        return new address[](0);
    }

    function isChainSupported(uint64 chainSelector) external pure override returns (bool) {
        return true;
    }

    function getOnRamp(uint64 chainSelector) external pure override returns (address) {
        // Mock implementation
        return address(0);
    }

    function getOffRamp(uint64 chainSelector) external pure returns (address) {
        // Mock implementation
        return address(0);
    }

    function isOffRamp(uint64 sourceChainSelector, address offRamp) external pure override returns (bool) {
        // Mock implementation
        return true;
    }

    function routeMessage(
        Client.Any2EVMMessage calldata message,
        uint16 gasForCallExactCheck,
        uint256 gasLimit,
        address receiver
    ) external pure override returns (bool success, bytes memory retBytes, uint256 gasUsed) {
        // Mock implementation
        return (true, "", 0);
    }
} 