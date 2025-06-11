// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

/**
 * @title CrossChainRouter
 * @notice Handles cross-chain operations using Chainlink CCIP
 */
contract CrossChainRouter is CCIPReceiver, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // State variables
    IRouterClient public immutable router;
    LinkTokenInterface public immutable linkToken;
    
    // Mappings
    mapping(uint64 => bool) public supportedChains;
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => bool) public processedMessages;
    
    // Events
    event MessageSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address token,
        uint256 amount
    );
    event TokensSent(
        address indexed sender,
        uint64 indexed destinationChainSelector,
        address token,
        uint256 amount
    );
    event MessageReceived(
        bytes32 indexed messageId,
        uint64 indexed sourceChainSelector,
        address token,
        uint256 amount
    );
    event ChainSupported(uint64 chainSelector, bool supported);
    event TokenSupported(address token, bool supported);
    event LinkWithdrawn(address indexed to, uint256 amount);
    event ERC20Withdrawn(address indexed token, address indexed to, uint256 amount);

    // Errors
    error NotEnoughBalance(uint256 currentBalance, uint256 calculatedFees);
    error NothingToWithdraw();
    error FailedToWithdrawEth(address owner, address target, uint256 value);
    error DestinationChainNotAllowlisted(uint64 destinationChainSelector);
    error SourceChainNotAllowlisted(uint64 sourceChainSelector);
    error SenderNotAllowlisted(address sender);
    error InvalidReceiverAddress();
    error InvalidAmount();

    constructor(
        address _router,
        address _linkToken
    ) CCIPReceiver(_router) {
        if (_linkToken == address(0)) revert InvalidRouter(address(0));
        router = IRouterClient(_router);
        linkToken = LinkTokenInterface(_linkToken);
    }

    /**
     * @notice Send tokens to another chain
     * @param destinationChainSelector Chain selector of destination
     * @param token Address of token to send
     * @param amount Amount of tokens to send
     */
    function sendTokens(
        uint64 destinationChainSelector,
        address token,
        uint256 amount
    ) external returns (bytes32 messageId) {
        if (!supportedChains[destinationChainSelector])
            revert DestinationChainNotAllowlisted(destinationChainSelector);
        if (!supportedTokens[token])
            revert SenderNotAllowlisted(token);
        if (amount == 0)
            revert InvalidAmount();

        // Transfer tokens from sender
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Create an EVM2AnyMessage struct in memory with necessary information for sending a cross-chain message
        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(address(this)), // ABI-encoded receiver address
            data: abi.encode(msg.sender, token, amount), // ABI-encoded string
            tokenAmounts: _getTokenAmounts(token, amount), // Array of tokens to transfer
            extraArgs: Client._argsToBytes(
                // Additional arguments, setting gas limit and allowing out-of-order execution
                Client.GenericExtraArgsV2({
                    gasLimit: 200_000, // Gas limit for the callback on the destination chain
                    allowOutOfOrderExecution: true // Allows the message to be executed out of order relative to other messages
                })
            ),
            // Set the feeToken  address, indicating LINK will be used for fees
            feeToken: address(linkToken)
        });

        // Get the fee required to send the message
        uint256 fees = router.getFee(
            destinationChainSelector,
            evm2AnyMessage
        );

        if (fees > linkToken.balanceOf(address(this)))
            revert NotEnoughBalance(linkToken.balanceOf(address(this)), fees);

        // approve the Router to transfer LINK tokens on contract's behalf. It will spend the fees in LINK
        linkToken.approve(address(router), fees);

        // Send the message through the router and store the returned message ID
        messageId = router.ccipSend(destinationChainSelector, evm2AnyMessage);

        emit MessageSent(
            messageId,
            destinationChainSelector,
            token,
            amount
        );

        emit TokensSent(
            msg.sender,
            destinationChainSelector,
            token,
            amount
        );

        return messageId;
    }

    /**
     * @notice Handle incoming CCIP messages
     */
    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        if (!supportedChains[message.sourceChainSelector])
            revert SourceChainNotAllowlisted(message.sourceChainSelector);
        if (processedMessages[message.messageId])
            revert SenderNotAllowlisted(address(0));

        processedMessages[message.messageId] = true;

        // Decode the message
        (
            address sender,
            address token,
            uint256 amount
        ) = abi.decode(message.data, (address, address, uint256));

        if (!supportedTokens[token])
            revert SenderNotAllowlisted(token);

        // Transfer tokens to the sender
        IERC20(token).safeTransfer(sender, amount);

        emit MessageReceived(
            message.messageId,
            message.sourceChainSelector,
            token,
            amount
        );
    }

    /**
     * @notice Set supported chain
     * @param chainSelector Chain selector
     * @param supported Whether chain is supported
     */
    function setSupportedChain(
        uint64 chainSelector,
        bool supported
    ) external onlyOwner {
        supportedChains[chainSelector] = supported;
        emit ChainSupported(chainSelector, supported);
    }

    /**
     * @notice Set supported token
     * @param token Token address
     * @param supported Whether token is supported
     */
    function setSupportedToken(
        address token,
        bool supported
    ) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupported(token, supported);
    }

    /**
     * @notice Get token amounts for CCIP message
     */
    function _getTokenAmounts(
        address token,
        uint256 amount
    ) internal pure returns (Client.EVMTokenAmount[] memory) {
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: token,
            amount: amount
        });
        return tokenAmounts;
    }

    /**
     * @notice Withdraw LINK tokens
     * @param amount Amount to withdraw
     */
    function withdrawLink(uint256 amount) external onlyOwner {
        if (amount == 0) revert NothingToWithdraw();
        if (!linkToken.transfer(msg.sender, amount)) revert FailedToWithdrawEth(msg.sender, address(linkToken), amount);
        emit LinkWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Withdraw ERC20 tokens
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function withdrawERC20(
        address token,
        uint256 amount
    ) external onlyOwner {
        if (amount == 0) revert NothingToWithdraw();
        IERC20(token).safeTransfer(msg.sender, amount);
        emit ERC20Withdrawn(token, msg.sender, amount);
    }
}