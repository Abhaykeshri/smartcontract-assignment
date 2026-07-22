// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title ZyncVesting
/// @notice Admin-managed linear vesting for ZYNC token allocations.
contract ZyncVesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable zync;
    uint256 public nextScheduleId;
    uint256 public totalReserved;

    error InvalidToken();
    error InvalidAmount();
    error InvalidSchedule();
    error InsufficientFunding();
    error NothingToRelease();

    struct VestingSchedule {
        address beneficiary;
        uint256 amount;
        uint64 start;
        uint64 cliff;
        uint64 duration;
        uint256 released;
        bool exists;
    }

    mapping(uint256 => VestingSchedule) public schedules;
    mapping(address => uint256[]) private _beneficiarySchedules;

    event Funded(address indexed from, uint256 amount);
    event VestingScheduleCreated(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount,
        uint64 start,
        uint64 cliff,
        uint64 duration
    );
    event Released(address indexed beneficiary, uint256 amount);

    constructor(address token, uint256 initialFunding) Ownable(msg.sender) {
        if (token == address(0)) revert InvalidToken();

        zync = IERC20(token);

        if (initialFunding > 0) {
            zync.safeTransferFrom(msg.sender, address(this), initialFunding);
            emit Funded(msg.sender, initialFunding);
        }
    }

    function fund(uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidAmount();
        zync.safeTransferFrom(msg.sender, address(this), amount);
        emit Funded(msg.sender, amount);
    }

    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint64 start,
        uint64 cliff,
        uint64 duration
    ) external onlyOwner returns (uint256 scheduleId) {
        if (beneficiary == address(0)) revert InvalidSchedule();
        if (amount == 0) revert InvalidAmount();
        if (duration == 0 || cliff > duration) revert InvalidSchedule();

        scheduleId = nextScheduleId++;
        schedules[scheduleId] = VestingSchedule({
            beneficiary: beneficiary,
            amount: amount,
            start: start,
            cliff: cliff,
            duration: duration,
            released: 0,
            exists: true
        });
        _beneficiarySchedules[beneficiary].push(scheduleId);

        totalReserved += amount;
        if (zync.balanceOf(address(this)) < totalReserved) revert InsufficientFunding();

        emit VestingScheduleCreated(scheduleId, beneficiary, amount, start, cliff, duration);
    }

    function release() external nonReentrant {
        uint256[] storage scheduleIds = _beneficiarySchedules[msg.sender];
        uint256 totalReleasable;

        for (uint256 i = 0; i < scheduleIds.length; ++i) {
            VestingSchedule storage schedule = schedules[scheduleIds[i]];
            uint256 releasable = _releasable(schedule);
            if (releasable == 0) {
                continue;
            }

            schedule.released += releasable;
            totalReserved -= releasable;
            totalReleasable += releasable;
        }

        if (totalReleasable == 0) revert NothingToRelease();

        zync.safeTransfer(msg.sender, totalReleasable);
        emit Released(msg.sender, totalReleasable);
    }

    function beneficiaryScheduleIds(address beneficiary) external view returns (uint256[] memory) {
        return _beneficiarySchedules[beneficiary];
    }

    function releasableAmount(uint256 scheduleId) external view returns (uint256) {
        return _releasable(schedules[scheduleId]);
    }

    function vestedAmount(uint256 scheduleId) external view returns (uint256) {
        VestingSchedule storage schedule = schedules[scheduleId];
        return _vested(schedule);
    }

    function _releasable(VestingSchedule storage schedule) internal view returns (uint256) {
        if (!schedule.exists) return 0;
        uint256 vested = _vested(schedule);
        if (vested <= schedule.released) return 0;
        return vested - schedule.released;
    }

    function _vested(VestingSchedule storage schedule) internal view returns (uint256) {
        if (!schedule.exists) return 0;

        uint256 cliffTime = uint256(schedule.start) + uint256(schedule.cliff);
        uint256 endTime = uint256(schedule.start) + uint256(schedule.duration);
        uint256 currentTime = block.timestamp;

        if (currentTime < cliffTime) {
            return 0;
        }

        if (currentTime >= endTime) {
            return schedule.amount;
        }

        uint256 vestingWindow = uint256(schedule.duration) - uint256(schedule.cliff);
        if (vestingWindow == 0) {
            return schedule.amount;
        }

        uint256 elapsed = currentTime - cliffTime;
        return Math.mulDiv(schedule.amount, elapsed, vestingWindow);
    }
}
