// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";

/**
 * @title ERC20VaultToken
 * @notice ERC20 token representing shares in a vault that earns yield on deposited assets
 * @dev Implements EIP-4626 Vault standard with additional features
 */
contract ERC20VaultToken is Initializable, ERC20Upgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using MathUpgradeable for uint256;

    // The underlying asset token
    IERC20Upgradeable public asset;
    
    // Fee configuration
    struct FeeConfig {
        uint256 depositFeeBasisPoints;      // In basis points (1/100 of a percent)
        uint256 withdrawalFeeBasisPoints;   // In basis points (1/100 of a percent)
        uint256 performanceFeeBasisPoints;  // In basis points (1/100 of a percent)
    }
    
    FeeConfig public feeConfig;
    address public feeRecipient;   // Address to receive fees
    uint256 public lastHarvest;    // Timestamp of last harvest
    uint256 public highWaterMark;  // High water mark for performance fees
    uint256 public constant MAX_FEE = 10000; // 100%
    
    // Vault state
    uint256 public totalAssetsStored; // Total assets under management
    
    // Events
    event Deposit(
        address indexed sender,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );
    
    event Withdraw(
        address indexed sender,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );
    
    event Harvest(
        uint256 totalAssets,
        uint256 profit,
        uint256 fee
    );
    
    event FeesUpdated(
        uint256 depositFeeBasisPoints,
        uint256 withdrawalFeeBasisPoints,
        uint256 performanceFeeBasisPoints,
        address feeRecipient
    );
    
    event FeeRecipientUpdated(address newFeeRecipient);

    /**
     * @dev Constructor is only used for the implementation contract.
     * The proxy will use the initialize function instead.
     */
    constructor() {
        // Lock the implementation contract
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the vault with the underlying asset and fee configuration
     * @param _name Name of the vault token
     * @param _symbol Symbol of the vault token
     * @param _asset Address of the underlying asset
     * @param _feeConfig Fee configuration (deposit, withdrawal, performance)
     * @param _owner Owner of the vault
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        address _asset,
        FeeConfig memory _feeConfig,
        address _owner
    ) public initializer {
        require(_asset != address(0), "Invalid asset address");
        require(_owner != address(0), "Invalid owner address");
        require(
            _feeConfig.depositFeeBasisPoints <= MAX_FEE &&
            _feeConfig.withdrawalFeeBasisPoints <= MAX_FEE &&
            _feeConfig.performanceFeeBasisPoints <= MAX_FEE,
            "Fees too high"
        );

        __ERC20_init(_name, _symbol);
        __Ownable_init();
        __ReentrancyGuard_init();

        asset = IERC20Upgradeable(_asset);
        feeConfig = _feeConfig;
        feeRecipient = _owner;
        lastHarvest = block.timestamp;
        
        // Set initial high water mark
        highWaterMark = 10**18; // 1:1 with underlying asset
        
        // Transfer ownership
        _transferOwnership(_owner);
    }
    
    // ============ Public View Functions ============
    
    /**
     * @notice Total amount of the underlying asset that is managed by the vault
     * @return Total managed assets
     */
    function totalAssets() public view returns (uint256) {
        return totalAssetsStored;
    }
    
    /**
     * @notice Convert assets to shares
     * @param assets Amount of assets to convert
     * @return shares Equivalent amount of shares
     */
    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply();
        return supply == 0 ? assets : assets.mulDiv(supply, totalAssets(), MathUpgradeable.Rounding.Down);
    }
    
    /**
     * @notice Convert shares to assets
     * @param shares Amount of shares to convert
     * @return assets Equivalent amount of assets
     */
    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply();
        return supply == 0 ? shares : shares.mulDiv(totalAssets(), supply, MathUpgradeable.Rounding.Down);
    }
    
    /**
     * @notice Preview the amount of shares to be minted for a deposit
     * @param assets Amount of assets to deposit
     * @return shares Amount of shares to be minted
     */
    function previewDeposit(uint256 assets) public view returns (uint256) {
        uint256 shares = convertToShares(assets);
        return shares - _calculateFee(shares, feeConfig.depositFeeBasisPoints);
    }
    
    /**
     * @notice Preview the amount of assets to be withdrawn for a given amount of shares
     * @param shares Amount of shares to redeem
     * @return assets Amount of assets to be withdrawn
     */
    function previewRedeem(uint256 shares) public view virtual returns (uint256) {
        uint256 supply = totalSupply();
        return supply == 0 
            ? shares 
            : shares.mulDiv(totalAssets() + 1, supply, MathUpgradeable.Rounding.Up);
    }
    
    // ============ Public Mutative Functions ============
    
    /**
     * @notice Deposit assets into the vault and receive shares
     * @param assets Amount of assets to deposit
     * @param receiver Address to receive the shares
     * @return shares Amount of shares minted
     */
    function deposit(uint256 assets, address receiver) 
        external 
        nonReentrant 
        returns (uint256 shares) 
    {
        require(assets > 0, "Cannot deposit 0");
        
        // Calculate shares and fees
        shares = previewDeposit(assets);
        uint256 fee = assets - convertToAssets(shares);
        
        // Transfer assets from sender
        asset.safeTransferFrom(msg.sender, address(this), assets);
        
        // Mint shares to receiver
        _mint(receiver, shares);
        
        // Update total assets
        totalAssetsStored += assets;
        
        // Take deposit fee if any
        if (fee > 0) {
            asset.safeTransfer(feeRecipient, fee);
            totalAssetsStored -= fee;
        }
        
        emit Deposit(msg.sender, receiver, assets, shares);
        return shares;
    }
    
    /**
     * @notice Mint shares by depositing assets
     * @param shares Amount of shares to mint
     * @param receiver Address to receive the shares
     * @return assets Amount of assets deposited
     */
    function mint(uint256 shares, address receiver) 
        external 
        nonReentrant 
        returns (uint256 assets) 
    {
        require(shares > 0, "Cannot mint 0 shares");
        
        // Calculate assets needed and fees
        uint256 supply = totalSupply();
        assets = supply == 0 
            ? shares 
            : shares.mulDiv(totalAssets() + 1, supply, MathUpgradeable.Rounding.Up);
        
        uint256 fee = _calculateFee(assets, feeConfig.depositFeeBasisPoints);
        assets += fee;
        
        // Transfer assets from sender
        asset.safeTransferFrom(msg.sender, address(this), assets);
        
        // Mint shares to receiver
        _mint(receiver, shares);
        
        // Update total assets
        totalAssetsStored += assets;
        
        // Take deposit fee if any
        if (fee > 0) {
            asset.safeTransfer(feeRecipient, fee);
            totalAssetsStored -= fee;
        }
        
        emit Deposit(msg.sender, receiver, assets, shares);
        return assets;
    }
    
    /**
     * @notice Withdraw assets by burning shares
     * @param assets Amount of assets to withdraw
     * @param receiver Address to receive the assets
     * @param owner Address that owns the shares
     * @return shares Amount of shares burned
     */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) external nonReentrant returns (uint256 shares) {
        require(assets > 0, "Cannot withdraw 0");
        
        // Calculate shares and fees
        shares = convertToShares(assets);
        uint256 fee = _calculateFee(assets, feeConfig.withdrawalFeeBasisPoints);
        
        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }
        
        // Burn shares from owner
        _burn(owner, shares);
        
        // Transfer assets to receiver
        asset.safeTransfer(receiver, assets - fee);
        
        // Take withdrawal fee if any
        if (fee > 0) {
            asset.safeTransfer(feeRecipient, fee);
        }
        
        // Update total assets
        totalAssetsStored -= assets;
        
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
        return shares;
    }
    
    /**
     * @notice Redeem shares for assets
     * @param shares Amount of shares to redeem
     * @param receiver Address to receive the assets
     * @param owner Address that owns the shares
     * @return assets Amount of assets withdrawn
     */
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) external nonReentrant returns (uint256 assets) {
        require(shares > 0, "Cannot redeem 0 shares");
        
        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }
        
        // Calculate assets and fees
        assets = convertToAssets(shares);
        uint256 fee = _calculateFee(assets, feeConfig.withdrawalFeeBasisPoints);
        
        // Burn shares from owner
        _burn(owner, shares);
        
        // Transfer assets to receiver
        asset.safeTransfer(receiver, assets - fee);
        
        // Take withdrawal fee if any
        if (fee > 0) {
            asset.safeTransfer(feeRecipient, fee);
        }
        
        // Update total assets
        totalAssetsStored -= assets;
        
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
        return assets;
    }
    
    // ============ Yield Generation Functions ============
    
    /**
     * @notice Harvest yield and take performance fee
     * @dev Can be called by anyone to realize gains and take performance fee
     */
    function harvest() external nonReentrant {
        uint256 currentAssets = asset.balanceOf(address(this));
        uint256 profit = currentAssets > totalAssetsStored 
            ? currentAssets - totalAssetsStored 
            : 0;
        
        if (profit > 0) {
            // Calculate performance fee
            uint256 feeAmount = _calculateFee(profit, feeConfig.performanceFeeBasisPoints);
            
            // Take performance fee
            if (feeAmount > 0) {
                asset.safeTransfer(feeRecipient, feeAmount);
                currentAssets -= feeAmount;
            }
            
            // Update high water mark
            highWaterMark = currentAssets;
            
            // Calculate profit as the difference between current assets and previous total assets
            uint256 profitAmount = currentAssets > totalAssetsStored ? currentAssets - totalAssetsStored : 0;
            emit Harvest(currentAssets, profitAmount, feeAmount);
        }
        
        // Update last harvest timestamp
        lastHarvest = block.timestamp;
        
        // Update total assets
        totalAssetsStored = currentAssets;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update fee configuration
     * @param _depositFeeBasisPoints New deposit fee in basis points
     * @param _withdrawalFeeBasisPoints New withdrawal fee in basis points
     * @param _performanceFeeBasisPoints New performance fee in basis points
     * @param _feeRecipient New fee recipient address
     */
    function updateFees(
        uint256 _depositFeeBasisPoints,
        uint256 _withdrawalFeeBasisPoints,
        uint256 _performanceFeeBasisPoints,
        address _feeRecipient
    ) external onlyOwner {
        require(_depositFeeBasisPoints <= 500, "Deposit fee too high"); // Max 5%
        require(_withdrawalFeeBasisPoints <= 500, "Withdrawal fee too high"); // Max 5%
        require(_performanceFeeBasisPoints <= 2000, "Performance fee too high"); // Max 20%
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        feeConfig.depositFeeBasisPoints = _depositFeeBasisPoints;
        feeConfig.withdrawalFeeBasisPoints = _withdrawalFeeBasisPoints;
        feeConfig.performanceFeeBasisPoints = _performanceFeeBasisPoints;
        feeRecipient = _feeRecipient;
        
        emit FeesUpdated(_depositFeeBasisPoints, _withdrawalFeeBasisPoints, _performanceFeeBasisPoints, _feeRecipient);
    }
    
    // ============ Internal Helper Functions ============
    
    /**
     * @dev Calculate fee amount based on a value and fee rate
     * @param amount Amount to calculate fee on
     * @param feeBasisPoints Fee rate in basis points
     * @return feeAmount Fee amount
     */
    function _calculateFee(uint256 amount, uint256 feeBasisPoints) internal pure returns (uint256) {
        return amount.mulDiv(feeBasisPoints, MAX_FEE, MathUpgradeable.Rounding.Down);
    }
    
    /**
     * @dev Override ERC20 _spendAllowance to support fee-on-transfer tokens
     */
    function _spendAllowance(
        address owner,
        address spender,
        uint256 amount
    ) internal override {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }
}
