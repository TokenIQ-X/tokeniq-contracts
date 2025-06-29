// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title ITreasuryAIManager
 * @dev Interface for the Treasury AI Manager that handles automated management of RWA vaults
 */
interface ITreasuryAIManager {
    /**
     * @notice Notifies the AI manager when a vault is configured
     * @param vault Address of the vault being configured
     * @param paymentToken Address of the payment token
     * @param invoiceTokenId The invoice token ID
     * @param fundingTarget Target funding amount
     * @param fundingDeadline Funding deadline timestamp
     */
    function notifyVaultConfigured(
        address vault,
        address paymentToken,
        uint256 invoiceTokenId,
        uint256 fundingTarget,
        uint256 fundingDeadline
    ) external;

    /**
     * @notice Notifies the AI manager when funding is complete
     * @param vault Address of the vault
     * @param invoiceTokenId The invoice token ID
     * @param totalFunded Total amount funded
     */
    function notifyFundingComplete(
        address vault,
        uint256 invoiceTokenId,
        uint256 totalFunded
    ) external;

    /**
     * @notice Notifies the AI manager about a repayment
     * @param vault Address of the vault
     * @param invoiceTokenId The invoice token ID
     * @param amount Amount being repaid
     * @param interest Amount of interest paid (if any)
     */
    function notifyRepayment(
        address vault,
        uint256 invoiceTokenId,
        uint256 amount,
        uint256 interest
    ) external;

    /**
     * @notice Notifies the AI manager about a withdrawal
     * @param vault Address of the vault
     * @param token Address of the token being withdrawn (address(0) for native token)
     * @param to Recipient address
     * @param amount Amount withdrawn
     */
    function notifyFundsWithdrawn(
        address vault,
        address token,
        address to,
        uint256 amount
    ) external;

    /**
     * @notice Gets the default payment token address
     * @return Address of the default payment token
     */
    function defaultPaymentToken() external view returns (address);
}
