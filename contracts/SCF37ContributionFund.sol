// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IBEP20} from "./interfaces/IBEP20.sol";

/**
 * @title SCF37ContributionFund
 * @dev This contract manages contributions in USDT tokens, supports multiple treasury wallets,
 *      enforces contribution limits, role-based access control and pausability.
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Full control including managing admins and treasury wallets, and pausing/unpausing.
 * - ADMIN_ROLE: Limited control for updating contribution limits.
 */
contract SCF37ContributionFund is AccessControl, Pausable, ReentrancyGuard {
    
    // BEP20 token interface for USDT.
    IBEP20 public immutable usdt;
    // Role identifier for admins with restricted privileges.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE"); 
    
    // List of treasury wallet addresses where funds can be withdrawn in emergencies.
    address[] private treasuryWallets; 

    uint256 public minContributeAmount; // Minimum contribution amount (in USDT tokens) required per transaction.
    uint256 public maxContributeAmount; // Maximum contribution amount (in USDT tokens) allowed per transaction.

    uint256 private totalContributions; // Total amount of contributions accumulated in the contract.

    mapping(address => uint256) private userContributions; // Tracks the total contribution made by each user.
    mapping(address => bool) private isTreasuryWallet; // Tracks which addresses are valid treasury wallets.

    // ---------------------------------------------------------
    // Events
    // ---------------------------------------------------------

    // Emitted when a user contributes funds.
    event Contribute(address indexed user, uint256 amount, uint256 timestamp);

    // Emitted when the default admin role is transferred to another address.
    event DefaultAdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    // Emitted when a treasury wallet is removed.
    event TreasuryWalletRemoved(address indexed wallet);

    // Emitted when contribution limits are updated.
    event UpdateContributionLimit(uint256 minAmount, uint256 maxAmount);

    // Emitted when an emergency withdrawal is executed by an admin.
    event EmergencyWithdraw(address indexed admin, address indexed treasuryWallet, uint256 amount, uint256 timestamp);

    // ---------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------

    /**
     * @notice Deploys the ContributeFunds contract.
     * @dev Assigns DEFAULT_ADMIN_ROLE and ADMIN_ROLE to the deployer.
     * @param _treasuryWallets List of initial treasury wallet addresses.
     * @param _usdtAddress Address of the USDT token contract implementing IBEP20.
     */
    constructor(address[] memory _treasuryWallets, address _usdtAddress) {
        require(_treasuryWallets.length > 0, "Must provide at least one treasury wallet");
        uint256 len = _treasuryWallets.length;
        for (uint256 i = 0; i < len; i++) {
            require(_treasuryWallets[i] != address(0), "Invalid treasury wallet address");
            treasuryWallets.push(_treasuryWallets[i]);
            isTreasuryWallet[_treasuryWallets[i]] = true;
        }

        usdt = IBEP20(_usdtAddress);

        // Grant deployer both DEFAULT_ADMIN_ROLE and ADMIN_ROLE
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ---------------------------------------------------------
    // Public Contribution Functions
    // ---------------------------------------------------------

    /**
     * @notice Allows a user to contribute USDT to the contract.
     * @dev Validates min/max limits, user balance, and allowance before transfer.
     * Emits a {Contribute} event upon success.
     * @param amount Amount of USDT to contribute (in smallest token units).
     * @return Returns true if the contribution was successful.
     */
    function contribute(uint256 amount) public whenNotPaused nonReentrant returns (bool) {
        if (minContributeAmount > 0) require(amount >= minContributeAmount, "Contribution below minimum amount");
        if (maxContributeAmount > 0) require(amount <= maxContributeAmount, "Contribution above maximum amount");

        address user = msg.sender;
        require(usdt.balanceOf(user) >= amount, "Insufficient USDT balance");
        require(usdt.allowance(user, address(this)) >= amount, "Please approve USDT first");

        // Transfer USDT from contributor to contract
        require(usdt.transferFrom(user, address(this), amount), "USDT transfer failed");

        userContributions[user] += amount;
        totalContributions += amount;
        
        emit Contribute(user, amount, block.timestamp);
        return true;
    }

    /**
     * @notice Returns the total contributions made by a specific user.
     * @param user Address of the user.
     * @return The total contributed amount by the user.
     */
    function getUserContribution(address user) external view returns (uint256) {
        return userContributions[user];
    }

    // ---------------------------------------------------------
    // Role Management
    // ---------------------------------------------------------

    /**
     * @notice Transfers DEFAULT_ADMIN_ROLE to a new admin.
     * @dev Revokes the role from the current admin and grants it to the new address.
     * Emits a {DefaultAdminTransferred} event.
     * @param newAdmin Address to receive DEFAULT_ADMIN_ROLE.
     */
    function transferDefaultAdminRole(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAdmin != address(0), "New admin cannot be zero address");
        require(newAdmin != msg.sender, "Cannot transfer to self");
        
        address previousAdmin = msg.sender;
        
        _grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _revokeRole(DEFAULT_ADMIN_ROLE, previousAdmin);
        
        emit DefaultAdminTransferred(previousAdmin, newAdmin); 
    }

    // ---------------------------------------------------------
    // Treasury Wallet Management
    // ---------------------------------------------------------

    /**
     * @notice Removes a treasury wallet from the list.
     * @dev Can only be executed by DEFAULT_ADMIN_ROLE. Must always retain at least one treasury wallet.
     * Emits a {TreasuryWalletRemoved} event.
     * @param wallet Address of the treasury wallet to remove.
     */
    function removeTreasuryWallet(address wallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(isTreasuryWallet[wallet], "Not a treasury wallet");
        require(treasuryWallets.length > 1, "Must keep at least one treasury wallet");

        isTreasuryWallet[wallet] = false;
        uint256 len = treasuryWallets.length;
        for (uint256 i = 0; i < len; i++) {
            if (treasuryWallets[i] == wallet) {
                treasuryWallets[i] = treasuryWallets[len - 1];
                treasuryWallets.pop();
                break;
            }
        }

        emit TreasuryWalletRemoved(wallet);
    }

    // ---------------------------------------------------------
    // Admin Controls
    // ---------------------------------------------------------

    /**
     * @notice Updates the minimum and maximum contribution limits.
     * @dev Can only be called by ADMIN_ROLE. Emits {UpdateContributionLimit}.
     * @param minAmount Minimum contribution amount.
     * @param maxAmount Maximum contribution amount.
     */
    function updateContributionLimit(uint256 minAmount, uint256 maxAmount) external onlyRole(ADMIN_ROLE) {
        minContributeAmount = minAmount;
        maxContributeAmount = maxAmount;
        emit UpdateContributionLimit(minAmount, maxAmount);
    }

    // ---------------------------------------------------------
    // View Functions
    // ---------------------------------------------------------

    /**
     * @notice Returns the total contributions accumulated in the contract.
     * @return The total contributed amount.
     */
    function getTotalContributions() external view returns (uint256) {
        return totalContributions;
    }

    /**
     * @notice Returns the list of treasury wallets.
     * @dev Restricted to ADMIN_ROLE.
     * @return Array of treasury wallet addresses.
     */
    function getTreasuryWallets() external view onlyRole(ADMIN_ROLE) returns (address[] memory) {
        return treasuryWallets;
    }

    /**
     * @notice Returns the total count of treasury wallets.
     * @return Number of treasury wallets.
     */
    function getTreasuryWalletCount() external view returns (uint256) {
        return treasuryWallets.length;
    }

    /**
     * @notice Checks whether a given address is a valid treasury wallet.
     * @param wallet Address to check.
     * @return True if the address is a treasury wallet, false otherwise.
     */
    function isValidTreasuryWallet(address wallet) external view returns (bool) {
        return isTreasuryWallet[wallet];
    }

    // ---------------------------------------------------------
    // Emergency Functions
    // ---------------------------------------------------------

    /**
     * @notice Executes an emergency withdrawal of USDT to a treasury wallet.
     * @dev Can only be called by ADMIN_ROLE. Ensures sufficient balance and wallet validity.
     * Emits {EmergencyWithdraw}.
     * @param treasuryWallet Treasury wallet to receive the funds.
     * @param amount Amount of USDT to withdraw.
     */
    function emergencyWithdraw(address treasuryWallet, uint256 amount) external whenNotPaused onlyRole(ADMIN_ROLE) {
        require(isTreasuryWallet[treasuryWallet], "Not a treasury wallet");
        require(amount <= usdt.balanceOf(address(this)), "Insufficient balance");
        require(usdt.transfer(treasuryWallet, amount), "USDT transfer failed");
        
        emit EmergencyWithdraw(msg.sender, treasuryWallet, amount, block.timestamp);
    }

    // ---------------------------------------------------------
    // Pausable Controls
    // ---------------------------------------------------------

    /**
     * @notice Pauses the contract, disabling contributions and withdrawals.
     * @dev Can only be called by DEFAULT_ADMIN_ROLE.
     * @return True if the pause operation succeeds.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) returns (bool) {
        _pause();
        return true;
    }

    /**
     * @notice Unpauses the contract, re-enabling contributions and withdrawals.
     * @dev Can only be called by DEFAULT_ADMIN_ROLE.
     * @return True if the unpause operation succeeds.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) returns (bool) {
        _unpause();
        return true;
    }
}
