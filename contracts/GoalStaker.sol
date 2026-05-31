// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title GoalStaker
 * @notice An onchain commitment device for personal & professional goals.
 *
 * Users (the "staker") lock ETH against a goal with a deadline and a
 * designated verifier. The verifier — a trusted third party (mentor,
 * colleague, accountability partner) — calls `verify` to release the stake
 * back to the staker on success, OR `markFailed` to forfeit the stake to
 * the configured forfeit address on failure.
 *
 * Why this needs a smart contract:
 *  - The whole point of a commitment device is that you CANNOT bail yourself
 *    out. A bank account or PayPal escrow can be reversed; a smart contract
 *    cannot. Self-binding is only credible when self-undoing is impossible.
 *  - The verifier role + timelock fallback are enforced by code, not policy.
 *
 * Design notes:
 *  - No owner, no upgrade path, no admin keys. Pure peer-to-peer commitment.
 *  - If the verifier disappears, after `gracePeriod` past the deadline the
 *    staker can self-resolve to the forfeit address (so funds never get
 *    permanently stuck).
 *  - Reentrancy-safe via checks-effects-interactions on all payouts.
 */
contract GoalStaker {
    enum Status { Active, Succeeded, Failed, Cancelled }

    struct Goal {
        address staker;
        address verifier;
        address forfeitTo;   // where stake goes on failure (often a charity)
        uint256 amount;      // stake in wei
        uint64  deadline;    // unix seconds
        uint64  createdAt;
        Status  status;
        string  description; // human-readable goal text
    }

    /// @dev Time after the deadline before the staker can self-resolve.
    uint256 public constant GRACE_PERIOD = 14 days;

    uint256 public nextGoalId;
    mapping(uint256 => Goal) public goals;
    mapping(address => uint256[]) private _goalsByStaker;

    // ---- Events ----
    event GoalCreated(
        uint256 indexed goalId,
        address indexed staker,
        address indexed verifier,
        address forfeitTo,
        uint256 amount,
        uint64 deadline,
        string description
    );
    event GoalVerified(uint256 indexed goalId, address indexed verifier);
    event GoalFailed(uint256 indexed goalId, address indexed verifier);
    event GoalCancelled(uint256 indexed goalId);
    event GoalResolvedAfterGrace(uint256 indexed goalId);

    // ---- Errors (cheaper than require strings) ----
    error InvalidStake();
    error InvalidDeadline();
    error InvalidVerifier();
    error InvalidForfeitAddress();
    error EmptyDescription();
    error NotStaker();
    error NotVerifier();
    error GoalNotActive();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error GraceNotElapsed();
    error TransferFailed();

    // ---- Core functions ----

    /// @notice Create a new goal, locking msg.value as the stake.
    function createGoal(
        address verifier,
        address forfeitTo,
        uint64 deadline,
        string calldata description
    ) external payable returns (uint256 goalId) {
        if (msg.value == 0) revert InvalidStake();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (verifier == address(0) || verifier == msg.sender) revert InvalidVerifier();
        if (forfeitTo == address(0) || forfeitTo == msg.sender) revert InvalidForfeitAddress();
        if (bytes(description).length == 0) revert EmptyDescription();

        goalId = nextGoalId++;
        goals[goalId] = Goal({
            staker:      msg.sender,
            verifier:    verifier,
            forfeitTo:   forfeitTo,
            amount:      msg.value,
            deadline:    deadline,
            createdAt:   uint64(block.timestamp),
            status:      Status.Active,
            description: description
        });
        _goalsByStaker[msg.sender].push(goalId);

        emit GoalCreated(goalId, msg.sender, verifier, forfeitTo, msg.value, deadline, description);
    }

    /// @notice Verifier confirms the goal was met. Stake returns to staker.
    function verify(uint256 goalId) external {
        Goal storage g = goals[goalId];
        if (g.status != Status.Active) revert GoalNotActive();
        if (msg.sender != g.verifier) revert NotVerifier();

        g.status = Status.Succeeded;
        emit GoalVerified(goalId, msg.sender);
        _payout(g.staker, g.amount);
    }

    /// @notice Verifier confirms the goal was NOT met. Stake goes to forfeitTo.
    /// @dev Verifier may call this any time before grace expires. Calling
    /// before the deadline implies the goal was abandoned early.
    function markFailed(uint256 goalId) external {
        Goal storage g = goals[goalId];
        if (g.status != Status.Active) revert GoalNotActive();
        if (msg.sender != g.verifier) revert NotVerifier();

        g.status = Status.Failed;
        emit GoalFailed(goalId, msg.sender);
        _payout(g.forfeitTo, g.amount);
    }

    /// @notice Staker can cancel ONLY before any time has passed and the
    ///         verifier has not yet acted. We allow a brief window (10 min)
    ///         in case of typos in goal creation.
    function cancelEarly(uint256 goalId) external {
        Goal storage g = goals[goalId];
        if (g.status != Status.Active) revert GoalNotActive();
        if (msg.sender != g.staker) revert NotStaker();
        if (block.timestamp > g.createdAt + 10 minutes) revert DeadlinePassed();

        g.status = Status.Cancelled;
        emit GoalCancelled(goalId);
        _payout(g.staker, g.amount);
    }

    /// @notice If the verifier never acted and the deadline + grace passed,
    ///         the staker can resolve the goal as failed (funds to forfeitTo).
    ///         This prevents permanent fund lockup if a verifier disappears.
    function resolveAfterGrace(uint256 goalId) external {
        Goal storage g = goals[goalId];
        if (g.status != Status.Active) revert GoalNotActive();
        if (block.timestamp <= uint256(g.deadline) + GRACE_PERIOD) revert GraceNotElapsed();
        // Anyone can call this — but funds always go to forfeitTo, never to caller.

        g.status = Status.Failed;
        emit GoalResolvedAfterGrace(goalId);
        _payout(g.forfeitTo, g.amount);
    }

    // ---- Views ----

    function getGoal(uint256 goalId) external view returns (Goal memory) {
        return goals[goalId];
    }

    function goalsOf(address user) external view returns (uint256[] memory) {
        return _goalsByStaker[user];
    }

    // ---- Internal ----

    function _payout(address to, uint256 amount) private {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
