// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface ISimpleAavePool {
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);
    
    function getReserveData(address asset) external view returns (uint256);
}

interface ISimpleAavePoolVault {
    function UNDERLYING_TOKEN() external view returns (address);
    function ATOKEN() external view returns (address);
    function POOL() external view returns (address);
    function PRICE_FEED() external view returns (address);
    function totalAssets() external view returns (uint256);
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function getTotalValue() external view returns (uint256);
}
