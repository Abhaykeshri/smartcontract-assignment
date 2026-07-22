const { expect } = require("chai");
const hre = require("hardhat");

async function deployToken(price = hre.ethers.parseEther("1")) {
  const [owner, buyer, recipient, spender] = await hre.ethers.getSigners();
  const Token = await hre.ethers.getContractFactory("ZyncToken");
  const token = await Token.deploy(price);
  await token.waitForDeployment();

  return { token, owner, buyer, recipient, spender };
}

describe("ZyncToken", function () {
  it("mints ZYNC for ETH and refunds excess value", async function () {
    const { token, buyer } = await deployToken(3n);
    const price = 3n;
    const value = 10n;

    const tx = await token.connect(buyer).mintWithEth({ value });
    await tx.wait();

    expect(await token.balanceOf(buyer.address)).to.equal((value * hre.ethers.parseEther("1")) / price);
    expect(await hre.ethers.provider.getBalance(await token.getAddress())).to.equal(9n);
  });

  it("rejects zero mint prices", async function () {
    const { token } = await deployToken();

    await expect(token.setMintPrice(0)).to.be.revertedWithCustomError(token, "ZeroMintPrice");
  });

  it("emits observability events for price updates, treasury mints, and withdrawals", async function () {
    const { token, owner, recipient, buyer } = await deployToken();
    const previousPrice = hre.ethers.parseEther("1");
    const newPrice = hre.ethers.parseEther("2");
    const treasuryAmount = hre.ethers.parseEther("12");
    const saleValue = hre.ethers.parseEther("1");

    await expect(token.setMintPrice(newPrice))
      .to.emit(token, "MintPriceUpdated")
      .withArgs(previousPrice, newPrice);

    await expect(token.mintTo(recipient.address, treasuryAmount))
      .to.emit(token, "MintedTo")
      .withArgs(recipient.address, treasuryAmount);

    await (await token.connect(buyer).mintWithEth({ value: saleValue })).wait();

    await expect(token.withdraw())
      .to.emit(token, "Withdrawn")
      .withArgs(owner.address, saleValue);

    expect(await hre.ethers.provider.getBalance(await token.getAddress())).to.equal(0n);
  });

  it("burns tokens and allows burnFrom with allowance", async function () {
    const { token, owner, buyer, spender } = await deployToken();
    const amount = hre.ethers.parseEther("25");

    await token.mintTo(buyer.address, amount);

    await expect(token.connect(buyer).burn(hre.ethers.parseEther("5")))
      .to.emit(token, "Burned")
      .withArgs(buyer.address, hre.ethers.parseEther("5"));

    expect(await token.balanceOf(buyer.address)).to.equal(hre.ethers.parseEther("20"));

    await token.connect(buyer).approve(spender.address, hre.ethers.parseEther("7"));

    await expect(token.connect(spender).burnFrom(buyer.address, hre.ethers.parseEther("7")))
      .to.emit(token, "Burned")
      .withArgs(buyer.address, hre.ethers.parseEther("7"));

    expect(await token.balanceOf(buyer.address)).to.equal(hre.ethers.parseEther("13"));
  });

  it("reverts when burning more than the balance or without allowance", async function () {
    const { token, buyer, spender } = await deployToken();
    const amount = hre.ethers.parseEther("3");

    await token.mintTo(buyer.address, amount);

    await expect(token.connect(buyer).burn(hre.ethers.parseEther("4"))).to.be.revertedWithCustomError(
      token,
      "ERC20InsufficientBalance"
    );

    await expect(token.connect(spender).burnFrom(buyer.address, hre.ethers.parseEther("1"))).to.be.revertedWithCustomError(
      token,
      "ERC20InsufficientAllowance"
    );
  });

  it("allows reminting after burns without violating MAX_SUPPLY", async function () {
    const { token, owner } = await deployToken();
    const maxSupply = await token.MAX_SUPPLY();
    const oneToken = hre.ethers.parseEther("1");

    await token.mintTo(owner.address, maxSupply);
    await token.burn(oneToken);
    await expect(token.mintTo(owner.address, oneToken))
      .to.emit(token, "MintedTo")
      .withArgs(owner.address, oneToken);

    expect(await token.balanceOf(owner.address)).to.equal(maxSupply);
  });
});
