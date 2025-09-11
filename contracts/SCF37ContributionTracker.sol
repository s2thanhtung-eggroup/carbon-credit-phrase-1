// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SCF37ContributionTracker
 * @dev This contract tracks contribution history and totals for users in the SCF37 system.
 *      It provides functionality to record, update, and query contribution data with
 *      role-based access control and pausability features.
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Full control including pausing/unpausing the contract.
 * - ADMIN_ROLE: Can record, update contributions and manage user totals.
 */
contract SCF37ContributionTracker is AccessControl, Pausable {

    // Role identifier for admin functions that can record and update contributions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");  
    // Types of actions recorded in the contribution history
    enum ActionType { 
        Contribute,  // Initial contribution record
        Update       // Updated/modified contribution record
    }

    // Structure representing each contribution history record
    struct HistoryEntry {
        uint256 amount;       // Amount of contribution (NFT SCF37)
        uint256 timestamp;    // Timestamp when the record was created/updated
        bytes32 txhash;       // Transaction hash associated with this record
        ActionType action;    // Type of action (Contribute or Update)
        string note;          // Optional note/comment added by admin
    }

    // Mapping that stores contribution history for each user address
    mapping(address => HistoryEntry[]) private userHistory;
    // Mapping that stores total contribution amount for each user
    mapping(address => uint256) private userTotal;
    // Total contribution amount across the entire system
    uint256 private totalSystemAmount;

    // ---------------------------------------------------------
    // Events
    // ---------------------------------------------------------

    // Emitted when a new contribution record is created
    event RecordContribution(address indexed user, uint256 amount, uint256 timestamp, bytes32 txhash, ActionType action, string note);
    
    // Emitted when an existing contribution record is updated
    event UpdatedHistory(address indexed user, uint256 amount, uint256 timestamp, bytes32 txhash, ActionType action, string note);
    
    // Emitted when a user's total contribution amount is manually updated
    event UserTotalUpdated(address indexed user, uint256 oldTotal, uint256 newTotal, string note);

    // ---------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------

    /**
     * @notice Deploys the SCF37ContributionTracker contract.
     * @dev Assigns DEFAULT_ADMIN_ROLE and ADMIN_ROLE to the deployer.
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ---------------------------------------------------------
    // Recording History
    // ---------------------------------------------------------

    /**
     * @notice Records a new contribution for a user.
     * @dev Can only be called by ADMIN_ROLE when contract is not paused.
     *      Validates user address and amount before recording.
     *      Updates both user total and system total.
     *      Emits {RecordContribution} event.
     * @param user Address of the user whose contribution is being recorded.
     * @param amount Amount of contribution to record.
     * @param timestamp Timestamp when the contribution occurred.
     * @param txhash Transaction hash associated with this contribution.
     * @param note Optional note/comment about this contribution.
     */
    function recordContribution(
        address user,
        uint256 amount,
        uint256 timestamp,
        bytes32 txhash,
        string calldata note
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be > 0");

        // Create new history record
        userHistory[user].push(
            HistoryEntry({
                amount: amount,
                timestamp: timestamp,
                txhash: txhash,
                action: ActionType.Contribute,
                note: note
            })
        );
        
        // Update total for the user and the system
        userTotal[user] += amount;
        totalSystemAmount += amount;

        emit RecordContribution(user, amount, timestamp, txhash, ActionType.Contribute, note);
    }

    // ---------------------------------------------------------
    // Editing History
    // ---------------------------------------------------------

    /**
     * @notice Updates an existing contribution history entry for a user.
     * @dev Can only be called by ADMIN_ROLE when contract is not paused.
     *      Validates user address and index before updating.
     *      Adjusts user total and system total based on amount difference.
     *      Updates timestamp to current block time.
     *      Emits {UpdatedHistory} event.
     * @param user Address of the user whose history is being updated.
     * @param index Index of the history entry to update.
     * @param newAmount New amount for the contribution record.
     * @param txhash New transaction hash for this record.
     * @param changeNote Whether to update the note field.
     * @param note New note/comment (only used if changeNote is true).
     */
    function updateHistory(
        address user,
        uint256 index,
        uint256 newAmount,
        bytes32 txhash,
        bool changeNote,
        string calldata note
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(user != address(0), "Invalid user address");
        require(index < userHistory[user].length, "Invalid index");

        HistoryEntry storage oldEntry = userHistory[user][index];
        uint256 oldAmount = oldEntry.amount;

        // Adjust totals based on the difference between old and new amounts
        if (newAmount > oldAmount) {
            uint256 diff = newAmount - oldAmount;
            userTotal[user] += diff;
            totalSystemAmount += diff;
        } else if (oldAmount > newAmount) {
            uint256 diff = oldAmount - newAmount;
            userTotal[user] -= diff;
            totalSystemAmount -= diff;
        }

        // Update the history entry
        oldEntry.amount = newAmount;
        oldEntry.action = ActionType.Update;
        oldEntry.txhash = txhash;
        oldEntry.timestamp = block.timestamp;
        if(changeNote) oldEntry.note = note;

        emit UpdatedHistory(user, newAmount, block.timestamp, txhash, ActionType.Update, note);
    }

    // ---------------------------------------------------------
    // Updating User Total
    // ---------------------------------------------------------

    /**
     * @notice Manually sets (overwrites) the total contribution amount for a user.
     * @dev Can only be called by ADMIN_ROLE when contract is not paused.
     *      Adjusts system total based on the difference between old and new user total.
     *      Emits {UserTotalUpdated} event.
     * @param user Address of the user whose total is being updated.
     * @param newTotal New total amount to set for the user.
     * @param note Reason for the manual update.
     */
    function setUserTotal(
        address user,
        uint256 newTotal,
        string calldata note
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(user != address(0), "Invalid user address");

        uint256 oldTotal = userTotal[user];

        // Adjust totalSystemAmount accordingly
        if (newTotal > oldTotal) totalSystemAmount += (newTotal - oldTotal);
        if (oldTotal > newTotal) totalSystemAmount -= (oldTotal - newTotal);

        // Set new total for the user
        userTotal[user] = newTotal;

        emit UserTotalUpdated(user, oldTotal, newTotal, note);
    }

    // ---------------------------------------------------------
    // View Functions
    // ---------------------------------------------------------

    /**
     * @notice Returns the total contribution amount for a specific user.
     * @param user Address of the user.
     * @return The total contribution amount for the user.
     */
    function getTotalByUser(address user) external view returns (uint256) {
        return userTotal[user];
    }

    /**
     * @notice Returns the total contribution amount across the entire system.
     * @return The total contribution amount across all users.
     */
    function getTotalSystem() external view returns (uint256) {
        return totalSystemAmount;
    }

    /**
     * @notice Returns the complete contribution history for a specific user.
     * @param user Address of the user.
     * @return Array of HistoryEntry structs representing the user's contribution history.
     */
    function getHistoryByUser(address user) external view returns (HistoryEntry[] memory) {
        return userHistory[user];
    }

    /**
     * @notice Returns a specific contribution history entry by index.
     * @param user Address of the user.
     * @param index Index of the history entry to retrieve.
     * @return The HistoryEntry struct at the specified index.
     */
    function getHistoryEntry(address user, uint256 index) external view returns (HistoryEntry memory) {
        require(index < userHistory[user].length, "Index out of range");
        return userHistory[user][index];
    }

    /**
     * @notice Returns the total number of contribution history records for a user.
     * @param user Address of the user.
     * @return The number of history entries for the user.
     */
    function getHistoryCount(address user) external view returns (uint256) {
        return userHistory[user].length;
    }

    // ---------------------------------------------------------
    // Admin Controls
    // ---------------------------------------------------------

    /**
     * @notice Pauses the contract, disabling all recording and updating functions.
     * @dev Can only be called by DEFAULT_ADMIN_ROLE.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses the contract, re-enabling all functions.
     * @dev Can only be called by DEFAULT_ADMIN_ROLE.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
