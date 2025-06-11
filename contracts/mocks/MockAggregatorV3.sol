// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract MockAggregatorV3 is AggregatorV3Interface {
    uint8 private _decimals = 8;
    int256 private _latestAnswer = 1e8; // $1.00
    uint256 private _latestTimestamp = block.timestamp;
    uint80 private _latestRoundId = 1;

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external pure override returns (string memory) {
        return "Mock Price Feed";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _latestAnswer, _latestTimestamp, _latestTimestamp, _roundId);
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_latestRoundId, _latestAnswer, _latestTimestamp, _latestTimestamp, _latestRoundId);
    }

    function setLatestAnswer(int256 answer) external {
        _latestAnswer = answer;
        _latestTimestamp = block.timestamp;
        _latestRoundId++;
    }
} 