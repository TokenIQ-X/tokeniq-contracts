// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {OwnerIsCreator} from "@chainlink/contracts/src/v0.8/shared/access/OwnerIsCreator.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IERC20} from "@chainlink/contracts/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@chainlink/contracts/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title CrossChainRouterV2
/// @notice A simple cross-chain token router using Chainlink CCIP
contract CrossChainRouterV2 is OwnerIsCreator {
    using SafeERC20 for IERC20;

    // Custom errors
    error NotEnoughBalance(uint256 currentBalance, uint256 calculatedFees);
    error NothingToWithdraw();
    error FailedToWithdrawEth(address owner, address target, uint256 value);
    error DestinationChainNotAllowlisted(uint64 destinationChainSelector);
    error InvalidReceiverAddress();

    // Events
    event TokensTransferred(
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address indexed recipient,
        address token,
        uint256 amount,
        address feeToken,
        uint256 fees
    );

    // State variables
    mapping(uint64 => bool) public allowlistedChains;
    IRouterClient private s_router;
    IERC20 private s_linkToken;

    /// @notice Constructor initializes the contract with the router and link token addresses
    /// @param _router The address of the router contract
    /// @param _link The address of the link token
    constructor(address _router, address _link) {
        s_router = IRouterClient(_router);
        s_linkToken = IERC20(_link);
    }

    /// @dev Modifier that checks if the chain with the given destinationChainSelector is allowlisted.
    /// @param _destinationChainSelector The selector of the destination chain.
    modifier onlyAllowlistedChain(uint64 _destinationChainSelector) {
        if (!allowlistedChains[_destinationChainSelector])
            revert DestinationChainNotAllowlisted(_destinationChainSelector);
        _;
    }

    /// @dev Modifier that checks the receiver address is not 0.
    /// @param _receiver The receiver address.
    modifier validateReceiver(address _receiver) {
        if (_receiver == address(0)) revert InvalidReceiverAddress();
        _;
    }

    /// @notice Transfer tokens to receiver on the destination chain using LINK for fees
    /// @param _destinationChainSelector The identifier of the destination chain
    /// @param _receiver The address of the receiver on the destination chain
    /// @param _token The address of the token to send
    /// @param _amount The amount of tokens to send
    function transferTokensPayLINK(
        uint64 _destinationChainSelector,
        address _receiver,
        address _token,
        uint256 _amount
    )
        external
        onlyOwner
        onlyAllowlistedChain(_destinationChainSelector)
        validateReceiver(_receiver)
        returns (bytes32 messageId)
    {
        // Transfer tokens to this contract
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        // Build the CCIP message
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(
            _receiver,
            _token,
            _amount,
            address(s_linkToken)
        );

        // Get the fee required to send the message
        uint256 fees = s_router.getFee(_destinationChainSelector, evm2AnyMessage);

        // Check if the contract has enough LINK to pay the fees
        if (fees > s_linkToken.balanceOf(address(this)))
            revert NotEnoughBalance(s_linkToken.balanceOf(address(this)), fees);

        // Approve the router to spend the tokens and LINK
        s_linkToken.approve(address(s_router), fees);
        IERC20(_token).approve(address(s_router), _amount);

        // Send the message
        messageId = s_router.ccipSend(_destinationChainSelector, evm2AnyMessage);

        emit TokensTransferred(
            messageId,
            _destinationChainSelector,
            _receiver,
            _token,
            _amount,
            address(s_linkToken),
            fees
        );

        return messageId;
    }

    /// @notice Transfer tokens to receiver on the destination chain using native token for fees
    /// @param _destinationChainSelector The identifier of the destination chain
    /// @param _receiver The address of the receiver on the destination chain
    /// @param _token The address of the token to send
    /// @param _amount The amount of tokens to send
    function transferTokensPayNative(
        uint64 _destinationChainSelector,
        address _receiver,
        address _token,
        uint256 _amount
    )
        external
        payable
        onlyOwner
        onlyAllowlistedChain(_destinationChainSelector)
        validateReceiver(_receiver)
        returns (bytes32 messageId)
    {
        // Transfer tokens to this contract
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        // Build the CCIP message
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(
            _receiver,
            _token,
            _amount,
            address(0) // Indicates native token for fees
        );

        // Get the fee required to send the message
        uint256 fees = s_router.getFee(_destinationChainSelector, evm2AnyMessage);
        if (msg.value < fees) revert NotEnoughBalance(msg.value, fees);

        // Approve the router to spend the tokens
        IERC20(_token).approve(address(s_router), _amount);

        // Send the message with native token for fees
        messageId = s_router.ccipSend{value: fees}(
            _destinationChainSelector,
            evm2AnyMessage
        );

        // Refund any excess native token
        if (msg.value > fees) {
            (bool success, ) = msg.sender.call{value: msg.value - fees}("");
            if (!success) revert FailedToWithdrawEth(address(this), msg.sender, msg.value - fees);
        }

        emit TokensTransferred(
            messageId,
            _destinationChainSelector,
            _receiver,
            _token,
            _amount,
            address(0),
            fees
        );

        return messageId;
    }

    /// @notice Updates the allowlist status of a destination chain for transactions.
    /// @param _destinationChainSelector The selector of the destination chain to be updated.
    /// @param allowed The allowlist status to be set for the destination chain.
    function allowlistDestinationChain(
        uint64 _destinationChainSelector,
        bool allowed
    ) external onlyOwner {
        allowlistedChains[_destinationChainSelector] = allowed;
    }

    /// @notice Withdraws the entire balance of the contract in native token
    /// @param _beneficiary The address to transfer the native token to
    function withdraw(address _beneficiary) external onlyOwner {
        if (_beneficiary == address(0)) revert InvalidReceiverAddress();
        uint256 amount = address(this).balance;
        if (amount == 0) revert NothingToWithdraw();
        (bool sent, ) = _beneficiary.call{value: amount}("");
        if (!sent) revert FailedToWithdrawEth(address(this), _beneficiary, amount);
    }
    
    /// @notice Withdraws all tokens of a specific ERC20 token
    /// @param _beneficiary The address to transfer the tokens to
    /// @param _token The address of the ERC20 token to withdraw
    function withdrawToken(address _beneficiary, address _token) external onlyOwner {
        if (_beneficiary == address(0)) revert InvalidReceiverAddress();
        uint256 amount = IERC20(_token).balanceOf(address(this));
        if (amount == 0) revert NothingToWithdraw();
        IERC20(_token).safeTransfer(_beneficiary, amount);
    }

    /// @notice Fallback function to receive native tokens
    receive() external payable {}

    /// @notice Builds a CCIP message for token transfer
    /// @param _receiver The address of the receiver on the destination chain
    /// @param _token The address of the token to transfer
    /// @param _amount The amount of tokens to transfer
    /// @param _feeToken The address of the token used for fees (address(0) for native token)
    function _buildCCIPMessage(
        address _receiver,
        address _token,
        uint256 _amount,
        address _feeToken
    ) private pure returns (Client.EVM2AnyMessage memory) {
        // Set the token amounts
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: _token,
            amount: _amount
        });

        // Create the message
        return Client.EVM2AnyMessage({
            receiver: abi.encode(_receiver),
            data: "",
            tokenAmounts: tokenAmounts,
            feeToken: _feeToken,
            extraArgs: ""
        });
    }
}
