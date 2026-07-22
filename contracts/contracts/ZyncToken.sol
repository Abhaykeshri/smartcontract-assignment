// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title ZyncToken — ZYNC utility token for AureLexa (Zync)
/// @notice Public mint: send ETH at `mintPriceWei` per 1 full token (18 decimals).
///         Owner can treasury-mint, set price, and withdraw sale proceeds.
contract ZyncToken is ERC20, Ownable, ReentrancyGuard {
    using Math for uint256;

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18;

    /// Price in wei for 1e18 wei of tokens (one full ZYNC with 18 decimals).
    uint256 public mintPriceWei;

    error CapExceeded();
    error ZeroAmount();
    error ZeroMintPrice();

    event MintPriceUpdated(uint256 previousPrice, uint256 newPrice);
    event MintedTo(address indexed to, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);

    constructor(uint256 initialMintPriceWei) ERC20("Zync", "ZYNC") Ownable(msg.sender) {
        if (initialMintPriceWei == 0) revert ZeroMintPrice();
        mintPriceWei = initialMintPriceWei;
    }

    function setMintPrice(uint256 newPriceWei) external onlyOwner {
        if (newPriceWei == 0) revert ZeroMintPrice();
        uint256 previousPrice = mintPriceWei;
        mintPriceWei = newPriceWei;
        emit MintPriceUpdated(previousPrice, newPriceWei);
    }

    /// @notice Treasury / airdrops — does not require ETH; capped by MAX_SUPPLY.
    function mintTo(address to, uint256 amount) external onlyOwner {
        if (amount > MAX_SUPPLY - totalSupply()) revert CapExceeded();
        _mint(to, amount);
        emit MintedTo(to, amount);
    }

    /// @notice Buy ZYNC with native currency on the same chain.
    function mintWithEth() external payable nonReentrant {
        if (mintPriceWei == 0) revert ZeroMintPrice();
        if (msg.value == 0) revert ZeroAmount();

        uint256 tokenAmount = Math.mulDiv(msg.value, 10 ** 18, mintPriceWei);
        if (tokenAmount == 0) revert ZeroAmount();
        if (tokenAmount > MAX_SUPPLY - totalSupply()) revert CapExceeded();

        uint256 costWei = Math.mulDiv(tokenAmount, mintPriceWei, 10 ** 18);
        _mint(msg.sender, tokenAmount);

        uint256 refund = msg.value - costWei;
        if (refund > 0) {
            (bool ok, ) = payable(msg.sender).call{value: refund}("");
            require(ok, "refund failed");
        }
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 amount = address(this).balance;
        (bool ok, ) = payable(owner()).call{value: amount}("");
        require(ok, "withdraw failed");
        emit Withdrawn(owner(), amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit Burned(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) external {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
        emit Burned(account, amount);
    }

    receive() external payable {
        revert("use mintWithEth");
    }
}
