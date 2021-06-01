pragma solidity 0.7.6;

import "../_external/IERC20.sol";
import "../_external/IERC3156FlashBorrower.sol";
import "../_external/IERC3156FlashLender.sol";

// Copied from EIP-3156
contract FlashBorrowerNoRepay is IERC3156FlashBorrower {
    IERC3156FlashLender lender;

    constructor (
        IERC3156FlashLender lender_
    ) {
        lender = lender_;
    }

    /// @dev ERC-3156 Flash loan callback
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns(bytes32) {
        // Burn AMPLs so repay is not possible
        address someAddress = 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045;
        IERC20(token).transfer(someAddress, amount);
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }

    /// @dev Initiate a flash loan
    function flashBorrow(
        address token,
        uint256 amount
    ) public {
        bytes memory data = abi.encode(0);
        lender.flashLoan(this, token, amount, data);
    }
}
