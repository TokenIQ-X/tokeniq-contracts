// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface CCIPReceiver {
    struct Any2EVMMessage {
        bytes32 messageId;
        uint64 sourceChainSelector;
        bytes sender;
        bytes data;
        EVMTokenAmount[] destTokenAmounts;
    }

    struct EVMTokenAmount {
        address token;
        uint256 amount;
    }

    function ccipReceive(Any2EVMMessage calldata message) external;
} 