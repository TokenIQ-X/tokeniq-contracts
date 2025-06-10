// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRouterClient {
    struct EVM2AnyMessage {
        bytes receiver;
        bytes data;
        EVMTokenAmount[] tokenAmounts;
        bytes extraArgs;
        address feeToken;
    }

    struct EVMTokenAmount {
        address token;
        uint256 amount;
    }

    function ccipSend(
        uint64 destinationChainSelector,
        EVM2AnyMessage memory message
    ) external returns (bytes32);

    function getFee(
        uint64 destinationChainSelector,
        EVM2AnyMessage memory message
    ) external view returns (uint256 fee);
} 