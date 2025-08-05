// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract SCF37ContributionTracker is AccessControl, Pausable {

    // Role identifier for admin functions
    bytes32 constant public ADMIN_ROLE = keccak256("ADMIN_ROLE");  

    /// @notice Types of actions recorded in the history
    enum ActionType { Contribute, Update }

    /// @notice Structure representing each history record
    struct HistoryEntry {
        uint256 amount;       // Amount of NFT SCF37    
        uint256 timestamp;    // Timestamp of the record
        bytes32 txhash;       // transaction hash
        ActionType action;    // Type of action
        string note;          // Note added by the admin
    }

    /// @notice Mapping that stores history for each user
    mapping(address => HistoryEntry[]) private userHistory;

    /// @notice Mapping that stores total NFT amount for each user
    mapping(address => uint256) private userTotal;

    /// @notice Total amount across the entire system
    uint256 private totalSystemAmount;

    /// Event emitted whenever a new history record is created or updated
    event RecordContribution(address indexed user, uint256 amount, uint256 timestamp, bytes32 txhash, ActionType action, string note);
    event UpdatedHistory(address indexed user, uint256 amount, uint256 timestamp, bytes32 txhash, ActionType action, string note);
    event UserTotalUpdated(address indexed user, uint256 oldTotal, uint256 newTotal, string note);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ============ RECORDING HISTORY ============

    /**
     * @notice Admin records a new contribute data
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

        // history record
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

    // ============ EDITING HISTORY ============

    /**
     * @notice Admin edits an existing history entry for a user
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

        // Adjust totals based on the difference
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

    // ============ UPDATING USER TOTAL ============

    /**
     * @notice Admin sets (overwrites) the total amount for a user
     * @param user Address of the user
     * @param newTotal New total amount to set
     * @param note Reason for manual update
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

    // ============ VIEW FUNCTIONS ============

    /// @notice Returns total amount by user
    function getTotalByUser(address user) external view returns (uint256) {
        return userTotal[user];
    }

    /// @notice Returns total amount across the entire system
    function getTotalSystem() external view returns (uint256) {
        return totalSystemAmount;
    }

    /// @notice Returns entire history records of a user
    function getHistoryByUser(address user) external view returns (HistoryEntry[] memory) {
        return userHistory[user];
    }

    /// @notice Returns a specific history record by index
    function getHistoryEntry(address user, uint256 index) external view returns (HistoryEntry memory) {
        require(index < userHistory[user].length, "Index out of range");
        return userHistory[user][index];
    }

    /// @notice Returns the total number of history records for a user
    function getHistoryCount(address user) external view returns (uint256) {
        return userHistory[user].length;
    }

    // ============ ADMIN CONTROLS ============

    /// @notice Pauses the contract in emergency situations
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpauses the contract
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
