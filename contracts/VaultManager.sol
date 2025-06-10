// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title VaultManager
 * @notice Main contract for managing user deposits, vault shares, and strategy routing
 */
contract VaultManager is ReentrancyGuard, Ownable, AutomationCompatibleInterface {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // Structs
    struct VaultInfo {
        address strategy;        // Address of the strategy contract
        address token;           // Deposit token address
        uint256 totalShares;     // Total shares in the vault
        uint256 totalAssets;     // Total assets in the vault
        bool isActive;           // Whether the vault is active
    }

    struct UserInfo {
        uint256 shares;         // User's shares in the vault
        uint256 lastDeposit;    // Timestamp of last deposit
    }

    // State variables
    mapping(address => VaultInfo) public vaults;           // vaultId => VaultInfo
    mapping(address => mapping(address => UserInfo)) public userInfo;  // vaultId => user => UserInfo
    mapping(address => bool) public supportedTokens;       // Supported deposit tokens
    
    address[] public activeVaults; // Track all created vaults

    // Events
    event VaultCreated(address indexed vaultId, address indexed strategy, address token);
    event Deposit(address indexed user, address indexed vaultId, uint256 amount, uint256 shares);
    event Withdraw(address indexed user, address indexed vaultId, uint256 shares, uint256 amount);
    event StrategyRebalanced(address indexed vaultId, uint256 newAllocation);
    event EmergencyWithdraw(address indexed user, address indexed vaultId, uint256 shares, uint256 amount);
    event VaultStatusChanged(address indexed vaultId, bool isActive);

    // Constants
    uint256 public constant MAX_BPS = 10000;
    uint256 public constant MIN_DEPOSIT = 100; // Minimum deposit amount
    uint256 public constant REBALANCE_THRESHOLD = 500; // 5% threshold for rebalancing


    constructor() Ownable() {
        // Initialize any state variables here
    }

    /**
     * @notice Create a new vault with a specific strategy
     * @param strategy Address of the strategy contract
     * @param token Address of the deposit token
     */
    function createVault(
        address strategy,
        address token
    ) external onlyOwner {
        require(strategy != address(0), "Invalid strategy");
        require(token != address(0), "Invalid token");
        
        // Create new vault address using CREATE2
        address vaultId = _createVaultAddress(strategy, token);
        
        vaults[vaultId] = VaultInfo({
            strategy: strategy,
            token: token,
            totalShares: 0,
            totalAssets: 0,
            isActive: true
        });

        supportedTokens[token] = true;
        activeVaults.push(vaultId);

        emit VaultCreated(vaultId, strategy, token);
    }

    /**
     * @notice Deposit tokens into a vault
     * @param vaultId Address of the vault
     * @param amount Amount of tokens to deposit
     */
    function deposit(address vaultId, uint256 amount) external nonReentrant {
        VaultInfo storage vault = vaults[vaultId];
        require(vault.isActive, "Vault not active");
        require(amount >= MIN_DEPOSIT, "Amount too small");
        require(supportedTokens[vault.token], "Token not supported");

        IERC20 token = IERC20(vault.token);
        
        // Transfer tokens from user
        token.safeTransferFrom(msg.sender, address(this), amount);

        // Calculate shares using Math.mulDiv for precision
        uint256 shares = (vault.totalShares == 0) 
            ? amount 
            : amount.mulDiv(vault.totalShares, vault.totalAssets, Math.Rounding.Down);
        
        // Update state
        vault.totalShares += shares;
        vault.totalAssets += amount;
        userInfo[vaultId][msg.sender].shares += shares;
        userInfo[vaultId][msg.sender].lastDeposit = block.timestamp;

        // Transfer tokens to strategy
        token.safeIncreaseAllowance(vault.strategy, amount);
        IStrategy(vault.strategy).deposit(amount);

        emit Deposit(msg.sender, vaultId, amount, shares);
    }

    /**
     * @notice Withdraw tokens from a vault
     * @param vaultId Address of the vault
     * @param shares Amount of shares to withdraw
     */
    function withdraw(address vaultId, uint256 shares) external nonReentrant {
        VaultInfo storage vault = vaults[vaultId];
        require(vault.isActive, "Vault not active");
        require(shares <= userInfo[vaultId][msg.sender].shares, "Insufficient shares");

        // Calculate withdrawal amount with rounding protection
        uint256 amount = shares.mulDiv(vault.totalAssets, vault.totalShares, Math.Rounding.Down);
        require(amount > 0, "Zero withdrawal amount");
        
        // Update state BEFORE external calls (Checks-Effects-Interactions)
        vault.totalShares -= shares;
        vault.totalAssets -= amount;
        userInfo[vaultId][msg.sender].shares -= shares;

        // Withdraw from strategy
        IStrategy(vault.strategy).withdraw(amount);
        
        // Transfer tokens to user
        IERC20(vault.token).safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, vaultId, shares, amount);
    }

    /**
     * @notice Toggle vault active status
     * @param vaultId Address of the vault
     * @param isActive New status
     */
    function setVaultStatus(address vaultId, bool isActive) external onlyOwner {
        vaults[vaultId].isActive = isActive;
        emit VaultStatusChanged(vaultId, isActive);
    }

    /**
     * @notice Check if vault needs rebalancing (Chainlink Automation)
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    ) external view override returns (bool upkeepNeeded, bytes memory performData) {
        for (uint i = 0; i < activeVaults.length; i++) {
            address vaultId = activeVaults[i];
            VaultInfo storage vault = vaults[vaultId];
            
            if (vault.isActive) {
                uint256 currentAlloc = IStrategy(vault.strategy).getCurrentAllocation();
                uint256 targetAlloc = IStrategy(vault.strategy).getTargetAllocation();
                
                if (_absDiff(currentAlloc, targetAlloc) > REBALANCE_THRESHOLD) {
                    return (true, abi.encode(vaultId));
                }
            }
        }
        return (false, "");
    }

    /**
     * @notice Perform rebalancing (Chainlink Automation)
     */
    function performUpkeep(bytes calldata performData) external override {
        address vaultId = abi.decode(performData, (address));
        require(vaults[vaultId].isActive, "Vault not active");
        
        IStrategy(vaults[vaultId].strategy).rebalance();
        emit StrategyRebalanced(vaultId, IStrategy(vaults[vaultId].strategy).getCurrentAllocation());
    }

    /**
     * @notice Calculate absolute difference
     */
    function _absDiff(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : b - a;
    }

    /**
     * @notice Create deterministic vault address
     */
    function _createVaultAddress(
        address strategy,
        address token
    ) internal view returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                keccak256(abi.encode(strategy, token)),
                keccak256(type(Vault).creationCode)
            )
        );
        return address(uint160(uint256(hash)));
    }
}

/**
 * @title Vault
 * @notice Individual vault contract
 */
contract Vault {
    address public immutable manager;
    address public immutable strategy;
    address public immutable token;

    constructor(address _strategy, address _token) {
        manager = msg.sender;
        strategy = _strategy;
        token = _token;
    }
    
    modifier onlyManager() {
        require(msg.sender == manager, "Unauthorized");
        _;
    }
}

/**
 * @title IStrategy
 * @notice Interface for strategy contracts
 */
interface IStrategy {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function getCurrentAllocation() external view returns (uint256);
    function getTargetAllocation() external view returns (uint256);
    function rebalance() external;
}